// API endpoint to migrate workflows to training content integration
const { requireAdmin } = require('../../lib/auth');
const { apiRateLimit } = require('../../lib/rateLimit');

// Import migration functions
let migrationModule;
try {
  migrationModule = require('../../scripts/migrate-workflow-to-training-integration');
} catch (error) {
  console.error('Migration script not found:', error.message);
}

if (!migrationModule) {
  module.exports = apiRateLimit((req, res) => {
    return res.status(500).json({ error: 'Migration functionality not available' });
  });
  return;
}

const { runMigration, analyzeCurrentState, MIGRATION_CONFIG } = migrationModule;

async function handler(req, res) {
  try {
    const user = req.user;

    if (req.method === 'GET') {
      // Return current state analysis
      const analysis = await analyzeCurrentState();
      
      return res.status(200).json({
        success: true,
        analysis,
        migration_available: true,
        description: 'Workflow to Training Content Integration Analysis'
      });
    }

    if (req.method === 'POST') {
      const { 
        dryRun = false, 
        verbose = false,
        force = false,
        skipValidation = false
      } = req.body;

      // Update migration configuration
      MIGRATION_CONFIG.dryRun = dryRun;
      MIGRATION_CONFIG.verbose = verbose;
      MIGRATION_CONFIG.force = force;
      MIGRATION_CONFIG.skipValidation = skipValidation;

      try {
        await runMigration();

        // Get final state
        const finalAnalysis = await analyzeCurrentState();
        
        return res.status(200).json({
          success: true,
          message: 'Workflow to training integration migration completed successfully',
          analysis: finalAnalysis,
          configuration: MIGRATION_CONFIG,
          triggeredBy: user.email,
          completedAt: new Date().toISOString()
        });
        
      } catch (migrationError) {
        console.error('❌ [MIGRATION] Migration failed:', migrationError.message);
        
        return res.status(500).json({
          success: false,
          error: 'Migration failed',
          details: migrationError.message,
          configuration: MIGRATION_CONFIG,
          triggeredBy: user.email,
          failedAt: new Date().toISOString()
        });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('❌ [API] Migration endpoint error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}

module.exports = apiRateLimit(requireAdmin(handler));