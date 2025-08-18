// Vercel API Route: /api/manager/crew/index.js - Manager crew management
const { supabase } = require('../../../lib/supabase');
const { requireManager, generateMagicToken } = require('../../../lib/auth');
const bcrypt = require('bcrypt');
const { unifiedEmailService } = require('../../../lib/unifiedEmailService');
const { createAPIHandler, createError, createValidationError, createDatabaseError } = require('../../../lib/apiHandler');
const { validators, sanitizers, validateObject } = require('../../../lib/validation');
const { withBodySizeLimit } = require('../../../lib/middleware/bodySizeLimit');

async function handler(req, res) {
  if (req.method === 'GET') {
    return await getCrewMembers(req, res);
  } else if (req.method === 'POST') {
    return await createCrewMember(req, res);
  } else {
    throw createError('VALIDATION_INVALID_METHOD', `Method ${req.method} not allowed`);
  }
}

// Get crew members assigned to this manager
async function getCrewMembers(req, res) {
  const managerId = req.user.userId;

  // Performance monitoring
  const startTime = Date.now();

  // Use the optimized RPC function with caching
  const { withCache } = require('../../../lib/queryCache');

  const crewData = await withCache(
    async () => {
      const { data, error } = await supabase
        .rpc('get_manager_crew_with_progress', {
          manager_id: managerId
        });

      if (error) throw error;
      return data;
    },
    `manager_crew_${managerId}`,
    180 // 3 minute cache
  );

  // Transform the RPC result to match the expected frontend format
  const enhancedCrewMembers = crewData?.map(crew => {
    // Parse the JSON data from the RPC function
    const trainingSessions = crew.training_sessions || [];
    const quizResults = crew.quiz_results || [];

    // Get latest activity
    const latestTraining = trainingSessions.length > 0
      ? trainingSessions.sort((a, b) => new Date(b.started_at || b.completed_at) - new Date(a.started_at || a.completed_at))[0]
      : null;

    const latestQuiz = quizResults.length > 0
      ? quizResults.sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))[0]
      : null;

    return {
      id: crew.user_id,
      email: crew.email,
      first_name: crew.first_name,
      last_name: crew.last_name,
      position: crew.user_position,
      vessel_assignment: crew.vessel_assignment,
      status: crew.status,
      preferred_language: crew.preferred_language,
      created_at: crew.created_at,
      updated_at: crew.updated_at,
      assignment_info: crew.assignment_info,
      progress: crew.progress_percentage,
      totalPhases: crew.total_phases,
      completedPhases: crew.completed_phases,
      trainingSessions: trainingSessions,
      quizResults: quizResults,
      latestActivity: latestTraining || latestQuiz ? {
        type: latestTraining && (!latestQuiz || new Date(latestTraining.started_at || latestTraining.completed_at) > new Date(latestQuiz.completed_at))
          ? 'training' : 'quiz',
        phase: latestTraining && (!latestQuiz || new Date(latestTraining.started_at || latestTraining.completed_at) > new Date(latestQuiz.completed_at))
          ? latestTraining.phase : latestQuiz.phase,
        date: latestTraining && (!latestQuiz || new Date(latestTraining.started_at || latestTraining.completed_at) > new Date(latestQuiz.completed_at))
          ? latestTraining.completed_at || latestTraining.started_at : latestQuiz.completed_at
      } : null
    };
  }) || [];

  // Performance monitoring
  const queryTime = Date.now() - startTime;
  console.log(`Manager crew query took ${queryTime}ms`);

  // Log slow queries
  if (queryTime > 100) {
    console.warn(`Slow query detected: ${req.url} took ${queryTime}ms`);
  }

  res.json({
    success: true,
    data: enhancedCrewMembers
  });
}

// Create new crew member
async function createCrewMember(req, res) {
  const managerId = req.user.userId;

    // Validate request body
    const validationSchema = {
      email: {
        required: true,
        type: 'email',
        options: {}
      },
      firstName: {
        required: true,
        type: 'string',
        options: {
          minLength: 1,
          maxLength: 100,
          pattern: /^[a-zA-Z\s\-']+$/,
          patternError: 'First name can only contain letters, spaces, hyphens and apostrophes'
        }
      },
      lastName: {
        required: true,
        type: 'string',
        options: {
          minLength: 1,
          maxLength: 100,
          pattern: /^[a-zA-Z\s\-']+$/,
          patternError: 'Last name can only contain letters, spaces, hyphens and apostrophes'
        }
      },
      position: {
        required: false,
        type: 'string',
        options: {
          minLength: 1,
          maxLength: 100
        }
      },
      vesselAssignment: {
        required: false,
        type: 'string',
        options: {
          minLength: 1,
          maxLength: 200
        }
      },
      preferredLanguage: {
        required: false,
        type: 'enum',
        options: {
          allowedValues: ['en', 'nl']
        }
      },
      sendWelcomeEmail: {
        required: false,
        type: 'boolean'
      }
    };

    const validationErrors = validateObject(req.body, validationSchema);
    if (validationErrors.length > 0) {
      throw createValidationError('Validation failed', { errors: validationErrors });
    }

    const {
      email,
      firstName,
      lastName,
      position,
      vesselAssignment,
      preferredLanguage = 'en',
      sendWelcomeEmail = true
    } = req.body;

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existingUser) {
      throw createError('VALIDATION_DUPLICATE_ENTRY', 'User with this email already exists', { email });
    }

    // Generate magic token for initial login
    const magicToken = generateMagicToken();
    const tokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create crew member with sanitized values
    const { data: newCrew, error: createError } = await supabase
      .from('users')
      .insert({
        email: email, // Already validated and normalized
        first_name: sanitizers.text(firstName, { maxLength: 100 }),
        last_name: sanitizers.text(lastName, { maxLength: 100 }),
        role: 'crew',
        position: position ? sanitizers.text(position, { maxLength: 100 }) : null,
        vessel_assignment: vesselAssignment ? sanitizers.text(vesselAssignment, { maxLength: 200 }) : null,
        preferred_language: preferredLanguage,
        status: 'registered',
        is_active: true,
        magic_token: magicToken,
        magic_token_expires: tokenExpiry.toISOString()
      })
      .select()
      .single();

    if (createError) {
      throw createDatabaseError('Failed to create crew member', { originalError: createError.message });
    }

    // Create crew-manager assignment
    const { error: assignmentError } = await supabase
      .from('crew_assignments')
      .insert({
        manager_id: managerId,
        crew_member_id: newCrew.id,
        assigned_by: managerId,
        assignment_reason: 'Created by manager',
        vessel_assignment: vesselAssignment || null,
        is_active: true
      });

    if (assignmentError) {
      console.error('Error creating crew assignment:', assignmentError);
      // Don't fail the request, but log for monitoring
    }

    // Invalidate cache for this manager
    const { invalidatePatterns } = require('../../../lib/queryCache');
const { adminRateLimit } = require('../../../lib/rateLimit');
    invalidatePatterns.manager(managerId);

    // Create training sessions for all phases
    const trainingSessions = [];
    for (let phase = 1; phase <= 3; phase++) {
      trainingSessions.push({
        user_id: newCrew.id,
        phase: phase,
        status: 'not_started',
        due_date: new Date(Date.now() + (phase * 7 * 24 * 60 * 60 * 1000)).toISOString() // phase * 7 days from now
      });
    }

    const { error: sessionError } = await supabase
      .from('training_sessions')
      .insert(trainingSessions);

    if (sessionError) {
      // console.error('Error creating training sessions:', sessionError);
      // Don't fail the request, but log for monitoring
    }

    // Send welcome email if requested
    if (sendWelcomeEmail) {
      try {
        await unifiedEmailService.sendCrewWelcomeEmail(newCrew.id, magicToken);
      } catch (emailError) {
        // console.error('Error sending welcome email:', emailError);
        // Don't fail the request for email errors
      }
    }

    // Log the creation
    await supabase
      .from('audit_log')
      .insert({
        user_id: managerId,
        action: 'create_crew_member',
        resource_type: 'user',
        resource_id: newCrew.id,
        details: {
          crew_email: newCrew.email,
          crew_name: `${newCrew.first_name} ${newCrew.last_name}`,
          position: newCrew.position,
          vessel_assignment: newCrew.vessel_assignment
        }
      });

    res.status(201).json({
      id: newCrew.id,
      email: newCrew.email,
      firstName: newCrew.first_name,
      lastName: newCrew.last_name,
      position: newCrew.position,
      vesselAssignment: newCrew.vessel_assignment,
      status: newCrew.status,
      preferredLanguage: newCrew.preferred_language,
      createdAt: newCrew.created_at
    });
}

// Create the standardized handler with error handling
const apiHandler = createAPIHandler(handler, {
  allowedMethods: ['GET', 'POST']
});

// Export with manager authentication and body size limit
module.exports = adminRateLimit(requireManager(withBodySizeLimit(apiHandler, 'api')));
