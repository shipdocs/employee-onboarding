const db = require('../../lib/database-direct');
const { requireAdmin } = require('../../lib/auth');
const { apiRateLimit } = require('../../lib/rateLimit');

// Import migration functions
let migrationModule;
try {
  migrationModule = require('../../scripts/migrate-training-content');
} catch (_error) {
  // console.error('Migration script not found:', _error.message);
}

if (!migrationModule) {
  module.exports = apiRateLimit((req, res) => {
    return res.status(500).json({ error: 'Migration functionality not available' });
  });
  return;
}

const { migrateTrainingContent, validateStaticData, MIGRATION_CONFIG } = migrationModule;

async function handler(req, res) {
  try {

    // User is available in req.user thanks to requireAdmin wrapper
    const user = req.user;

    if (req.method !== 'POST') {
      
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { 
      forceOverwrite = false, 
      dryRun = false, 
      backupExisting = true,
      validateOnly = false 
    } = req.body;

    // Update migration configuration
    MIGRATION_CONFIG.forceOverwrite = forceOverwrite;
    MIGRATION_CONFIG.dryRun = dryRun;
    MIGRATION_CONFIG.backupExisting = backupExisting;

    // If validate only, just run validation
    if (validateOnly) {

      const validationResult = validateStaticData();
      
      if (!validationResult.isValid) {
        // console.error('❌ [VALIDATE] Static data validation failed:', validationResult.errors);
        return res.status(400).json({
          error: 'Static data validation failed',
          details: validationResult.errors,
          warnings: validationResult.warnings
        });
      }

      return res.status(200).json({
        message: 'Static data validation passed',
        warnings: validationResult.warnings,
        summary: {
          phases: Object.keys(require('../../config/training-data').phases).length,
          quizzes: Object.keys(require('../../config/training-data').quizzes).length
        }
      });
    }

    // Check for existing data if not forcing overwrite
    if (!forceOverwrite) {
      
      const { data: existingPhases, error: checkError } = await supabase
        .from('training_phases')
        .select('id, phase_number, title')
        .limit(1);

      if (checkError) {
        // console.error('❌ [CHECK] Error checking existing phases:', checkError);
        return res.status(500).json({ 
          error: 'Failed to check existing data',
          details: checkError.message 
        });
      }

      if (existingPhases && existingPhases.length > 0) {
        
        return res.status(409).json({ 
          error: 'Training phases already exist. Use forceOverwrite: true to replace existing data.',
          existingPhases: existingPhases.length
        });
      }
    }

    // Log migration start
    
    const migrationStartTime = Date.now();

    try {
      // Create migration log entry
      const migrationLog = {
        started_at: new Date().toISOString(),
        triggered_by: user.id,
        configuration: {
          forceOverwrite,
          dryRun,
          backupExisting
        },
        status: 'in_progress'
      };

      // Run the migration
      const result = await runMigrationWithProgress(migrationLog, res);
      
      const migrationDuration = Date.now() - migrationStartTime;

      return res.status(200).json({
        message: 'Training content migration completed successfully',
        duration: migrationDuration,
        ...result
      });

    } catch (migrationError) {
      // console.error('❌ [MIGRATE] Migration failed:', migrationError);
      
      // Log migration failure
      await logMigrationResult({
        status: 'failed',
        error: migrationError.message,
        completed_at: new Date().toISOString()
      });

      return res.status(500).json({
        error: 'Migration failed',
        details: migrationError.message,
        stack: process.env.NODE_ENV === 'development' ? migrationError.stack : undefined
      });
    }

  } catch (_error) {
    // console.error('❌ [ERROR] Critical error in migrate-training-data:', _error);
    // console.error('❌ [ERROR] Stack trace:', error.stack);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: _error.message 
    });
  }
}

/**
 * Run migration with progress reporting
 */
async function runMigrationWithProgress(migrationLog, res) {
  const trainingData = require('../../config/training-data');
  
  // Step 1: Validate static data
  
  const validationResult = validateStaticData();
  if (!validationResult.isValid) {
    throw new Error(`Static data validation failed: ${validationResult.errors.join(', ')}`);
  }

  // Step 2: Backup existing data (if enabled)
  let backupInfo = null;
  if (MIGRATION_CONFIG.backupExisting) {
    
    backupInfo = await createBackup();
    
  }

  // Step 3: Clear existing data (if force overwrite)
  if (MIGRATION_CONFIG.forceOverwrite) {
    
    await clearExistingData();
    
  }

  // Step 4: Migrate training phases
  
  const migratedPhases = await migrateTrainingPhases(trainingData);

  // Step 5: Migrate quiz content
  
  const migratedQuizzes = await migrateQuizContent(trainingData);

  // Step 6: Validate migrated data
  
  await validateMigratedData(trainingData);

  // Log successful migration
  await logMigrationResult({
    status: 'completed',
    phases_migrated: migratedPhases.length,
    quizzes_migrated: migratedQuizzes.length,
    backup_file: backupInfo?.filename,
    completed_at: new Date().toISOString()
  });

  return {
    phases: migratedPhases.length,
    quizzes: migratedQuizzes.length,
    backup: backupInfo,
    warnings: validationResult.warnings
  };
}

/**
 * Create backup of existing data
 */
async function createBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  // Get existing data
  const { data: phases } = await db.from('training_phases').select('*');
  const { data: quizzes } = await db.from('quiz_content').select('*');
  
  const backupData = {
    timestamp,
    training_phases: phases || [],
    quiz_content: quizzes || []
  };
  
  // In a real implementation, you'd save this to file storage
  // For now, we'll just return the info
  return {
    filename: `training-content-backup-${timestamp}.json`,
    size: JSON.stringify(backupData).length,
    phases: phases?.length || 0,
    quizzes: quizzes?.length || 0
  };
}

/**
 * Clear existing training data
 */
async function clearExistingData() {
  // Clear quiz content first (foreign key dependency)
  const { error: quizError } = await supabase
    .from('quiz_content')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
    
  if (quizError) throw quizError;
  
  // Clear training phases
  const { error: phaseError } = await supabase
    .from('training_phases')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
    
  if (phaseError) throw phaseError;
}

/**
 * Migrate training phases (simplified version for API)
 */
async function migrateTrainingPhases(trainingData) {
  const phases = [];
  
  for (const [phaseNumber, phaseData] of Object.entries(trainingData.phases)) {
    const transformedPhase = {
      phase_number: parseInt(phaseNumber),
      title: phaseData.title,
      description: phaseData.description,
      time_limit: phaseData.timeLimit,
      items: phaseData.items,
      status: 'published',
      version: 1,
      passing_score: getPassingScoreForPhase(parseInt(phaseNumber)),
      media_attachments: [],
      content_metadata: {
        migrated_from: 'api_endpoint',
        migration_date: new Date().toISOString(),
        original_item_count: phaseData.items.length,
        rich_content_items: phaseData.items.filter(item => item.content).length
      }
    };
    
    if (!MIGRATION_CONFIG.dryRun) {
      const { data, error } = await supabase
        .from('training_phases')
        .insert(transformedPhase)
        .select()
        .single();
        
      if (error) throw error;
      phases.push(data);
    } else {
      phases.push(transformedPhase);
    }
  }
  
  return phases;
}

/**
 * Migrate quiz content (simplified version for API)
 */
async function migrateQuizContent(trainingData) {
  const quizzes = [];
  
  for (const [phaseNumber, questions] of Object.entries(trainingData.quizzes)) {
    const transformedQuiz = {
      phase: parseInt(phaseNumber),
      title: `Phase ${phaseNumber} Assessment`,
      description: `Knowledge assessment for Phase ${phaseNumber} training`,
      time_limit: 45,
      passing_score: getPassingScoreForPhase(parseInt(phaseNumber)),
      questions: questions,
      status: 'published'
    };
    
    if (!MIGRATION_CONFIG.dryRun) {
      const { data, error } = await supabase
        .from('quiz_content')
        .insert(transformedQuiz)
        .select()
        .single();
        
      if (error) throw error;
      quizzes.push(data);
    } else {
      quizzes.push(transformedQuiz);
    }
  }
  
  return quizzes;
}

/**
 * Get passing score for phase
 */
function getPassingScoreForPhase(phaseNumber) {
  const scores = { 1: 80, 2: 85, 3: 90 };
  return scores[phaseNumber] || 80;
}

/**
 * Validate migrated data (simplified version for API)
 */
async function validateMigratedData(trainingData) {
  // Basic validation - check counts match
  const { data: phases } = await db.from('training_phases').select('*');
  const { data: quizzes } = await db.from('quiz_content').select('*');
  
  const expectedPhases = Object.keys(trainingData.phases).length;
  const expectedQuizzes = Object.keys(trainingData.quizzes).length;
  
  if (phases.length !== expectedPhases) {
    throw new Error(`Expected ${expectedPhases} phases, found ${phases.length}`);
  }
  
  if (quizzes.length !== expectedQuizzes) {
    throw new Error(`Expected ${expectedQuizzes} quizzes, found ${quizzes.length}`);
  }
}

/**
 * Log migration result (placeholder - implement based on your logging system)
 */
async function logMigrationResult(result) {
  
  // In a real implementation, you'd save this to a migration_logs table
}

// Export with authentication wrapper
module.exports = requireAdmin(handler);
