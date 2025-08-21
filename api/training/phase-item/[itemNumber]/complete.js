// Vercel API Route: /api/training/phase/[phase]/item/[itemNumber]/complete.js - Mark training item as complete
const { supabase } = require('../../../../../../lib/supabase');
const { requireCrew } = require('../../../../../../lib/auth');
const { unifiedEmailService } = require('../../../../../../lib/unifiedEmailService');
const { trainingRateLimit } = require('../../../../../../lib/rateLimit');

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {

    const { phase, itemNumber } = req.query;
    const { instructorInitials, comments } = req.body || {}; // Handle undefined req.body
    const userId = req.user.userId;

    if (!phase || !itemNumber) {
      return res.status(400).json({ error: 'Phase and item number are required' });
    }

    // Parse phase as integer but keep original string format for itemNumber
    const phaseNum = parseInt(phase);
    // Store both formats of item number for flexibility in database queries
    const itemNumInt = parseInt(itemNumber);
    const itemNumStr = itemNumber.toString(); // Preserve original format with potential leading zeros

    if (!phaseNum || phaseNum < 1 || phaseNum > 3) {
      return res.status(400).json({
        error: 'Invalid phase number',
        details: 'Phase number must be between 1 and 3',
        received: phase
      });
    }

    if (isNaN(itemNumInt) || itemNumInt < 1) {
      return res.status(400).json({
        error: 'Invalid item number',
        details: 'Item number must be a positive number',
        received: itemNumber
      });
    }

    // Get training session for this phase

    const { data: session, error: sessionError } = await supabase
      .from('training_sessions')
      .select('id, status')
      .eq('user_id', userId)
      .eq('phase', phaseNum)
      .single();

    if (sessionError || !session) {
      // console.error('DEBUG: Training session not found:', sessionError);
      return res.status(404).json({ error: 'Training session not found' });
    }

    // Auto-start the session if it's not started yet
    if (session.status === 'not_started') {

      // Check if previous phases are completed (for phases 2 and 3)
      if (phaseNum > 1) {
        const { data: previousSessions, error: prevError } = await supabase
          .from('training_sessions')
          .select('phase, status')
          .eq('user_id', userId)
          .lt('phase', phaseNum);

        if (prevError) {
          // console.error('Error checking previous phases:', prevError);
          return res.status(500).json({ error: 'Failed to verify prerequisites' });
        }

        const incompletePrevious = previousSessions.filter(s => s.status !== 'completed');
        if (incompletePrevious.length > 0) {
          return res.status(400).json({
            error: 'Previous phases must be completed first',
            incompletePhases: incompletePrevious.map(s => s.phase),
            currentStatus: session.status
          });
        }
      }

      // Update session status to in_progress
      const { data: updatedSession, error: updateError } = await supabase
        .from('training_sessions')
        .update({
          status: 'in_progress',
          started_at: new Date().toISOString()
        })
        .eq('id', session.id)
        .select()
        .single();

      if (updateError) {
        // console.error('Error auto-starting session:', updateError);
        return res.status(500).json({ error: 'Failed to start training session' });
      }

      // Update local session object
      session.status = updatedSession.status;
      session.started_at = updatedSession.started_at;

      // Create training items if they don't exist
      const existingItemsResult = await db.query('SELECT id FROM training_items WHERE session_id = $1', [session.id]);
    const existingItems = existingItemsResult.rows;
    const itemsError = false;

      if (itemsError) {
        // console.error('Error checking training items:', itemsError);
        return res.status(500).json({ error: 'Failed to check training items' });
      }

      if (existingItems.length === 0) {

        const trainingItems = await getTrainingItemsForPhase(phaseNum);
        const itemsToInsert = trainingItems.map((item, index) => ({
          session_id: session.id,
          item_number: item.number || (index + 1).toString().padStart(2, '0'), // Format as "01", "02", etc.
          title: item.title,
          description: item.description,
          completed: false
        }));

        const { error: insertError } = await supabase
          .from('training_items')
          .insert(itemsToInsert);

        if (insertError) {
          // console.error('Error creating training items:', insertError);
          return res.status(500).json({ error: 'Failed to create training items' });
        }

      }
    } else if (session.status !== 'in_progress') {
      return res.status(400).json({
        error: 'Training session must be in progress to complete items',
        currentStatus: session.status
      });
    }

    // Get the specific training item

    // Try multiple query strategies to find the item regardless of how it's stored

    let item = null;
    let itemError = null;

    // Strategy 1: Try with the original string format first (preserves leading zeros)

    const { data: itemByString, error: itemByStringError } = await supabase
      .from('training_items')
      .select('*')
      .eq('session_id', session.id)
      .eq('item_number', itemNumStr)
      .single();

    if (itemByString) {

      item = itemByString;
    } else {
      // Strategy 2: Try with the parsed integer value

      const { data: itemByInt, error: itemByIntError } = await supabase
        .from('training_items')
        .select('*')
        .eq('session_id', session.id)
        .eq('item_number', itemNumInt)
        .single();

      if (itemByInt) {

        item = itemByInt;
      } else {
        // Strategy 3: Try with a more flexible query approach using .or

        const { data: items, error: itemsError } = await supabase
          .from('training_items')
          .select('*')
          .eq('session_id', session.id)
          .or(`item_number.eq.${itemNumInt},item_number.eq.${itemNumStr}`);

        if (items && items.length > 0) {

          item = items[0];
        } else {

          itemError = itemsError || itemByIntError || itemByStringError;
        }
      }
    }

    if (itemError || !item) {
      // console.error('DEBUG: Training item not found:', itemError);
      return res.status(404).json({ error: 'Training item not found' });
    }

    if (item.completed) {
      return res.status(400).json({
        error: 'Training item already completed',
        completedAt: item.completed_at
      });
    }

    // Use a database transaction to ensure data consistency

    // First, update the training item
    const updateData = {
      completed: true,
      completed_at: new Date().toISOString(),
      instructor_initials: instructorInitials || null,
      comments: comments || null
    };

    const { data: updatedItem, error: updateError } = await supabase
      .from('training_items')
      .update(updateData)
      .eq('id', item.id)
      .select()
      .single();

    if (updateError) {
      // console.error('Error updating training item:', updateError);
      return res.status(500).json({ error: 'Failed to complete training item' });
    }

    // Check if all items in this phase are now completed (using completed_at for consistency)

    const allItemsResult = await db.query('SELECT id, completed_at FROM training_items WHERE session_id = $1', [session.id]);
    const allItems = allItemsResult.rows;
    const allItemsError = false;

    if (allItemsError) {
      // console.error('Error checking all items:', allItemsError);
      return res.status(500).json({ error: 'Failed to check completion status' });
    }

    const totalItems = allItems.length;
    const completedItems = allItems.filter(i => i.completed_at !== null).length;
    const allCompleted = completedItems === totalItems;

    // If all items completed, update session status atomically
    if (allCompleted && session.status !== 'completed') {

      const { data: updatedSession, error: sessionUpdateError } = await supabase
        .from('training_sessions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', session.id)
        .eq('status', 'in_progress') // Only update if still in progress to prevent race conditions
        .select()
        .single();

      if (sessionUpdateError) {
        // console.error('Error updating session status:', sessionUpdateError);
        // Don't fail the request, but log the error
      } else if (updatedSession) {

      } else {

      }

      // Send phase completion notification using unified service
      try {

        await unifiedEmailService.sendPhaseCompletionEmail(userId, phaseNum);

      } catch (emailError) {
        // console.error('📧 [ERROR] Failed to send phase completion email:', emailError);

        // Log email failure to database for monitoring
        try {
          await supabase
            .from('system_logs')
            .insert({
              log_type: 'email_failure',
              details: {
                userId,
                phase: phaseNum,
                error: emailError.message
              },
              created_at: new Date().toISOString()
            });
        } catch (logError) {
          // console.error('Failed to log email error:', logError);
        }
      }

      // Note: We continue processing regardless of email success/failure

    }

    res.json({
      message: 'Training item completed successfully',
      item: {
        id: updatedItem.id,
        itemNumber: updatedItem.item_number,
        title: updatedItem.title,
        completed: updatedItem.completed,
        completedAt: updatedItem.completed_at,
        instructorInitials: updatedItem.instructor_initials,
        comments: updatedItem.comments
      },
      progress: {
        completedItems,
        totalItems,
        progressPercentage: Math.round((completedItems / totalItems) * 100),
        allCompleted
      },
      phaseCompleted: allCompleted
    });

  } catch (_error) {
    // console.error('Error completing training item:', _error);
    // Error details:
    //   error: _error.message,
    //   userId,
    //   phase,
    //   itemNumber
    // });
    // Log the error to the database for monitoring
    try {
      await supabase
        .from('system_logs')
        .insert({
          log_type: 'api_error',
          endpoint: '/api/training/phase/[phase]/item/[itemNumber]/complete',
          details: {
            phase: req.query.phase,
            itemNumber: req.query.itemNumber,
            userId: req.user?.userId,
            error: _error.message,
            stack: error.stack
          },
          created_at: new Date().toISOString()
        });
    } catch (logError) {
      // console.error('Failed to log error to database:', logError);
    }

    // Return a more specific error response based on the error type
    if (error.name === 'PostgrestError') {
      // Database-related errors
      return res.status(500).json({
        error: 'Database operation failed',
        details: _error.message,
        code: error.code || 'DB_ERROR'
      });
    } else if (error.name === 'FetchError' || _error.message.includes('fetch')) {
      // Network or API call errors
      return res.status(500).json({
        error: 'External service communication failed',
        details: 'Failed to communicate with required service',
        code: 'SERVICE_ERROR'
      });
    } else {
      // Generic error fallback
      return res.status(500).json({
        error: 'Failed to complete training item',
        details: _error.message,
        code: 'INTERNAL_ERROR'
      });
    }
  }
}

// Helper function to get training items for a phase
async function getTrainingItemsForPhase(phase) {
  try {
    // Try to get training items from database first
    const { data: phaseData, error } = await supabase
      .from('training_phases')
      .select('items')
      .eq('phase_number', phase)
      .eq('status', 'published')
      .single();

    if (phaseData && phaseData.items && phaseData.items.length > 0) {
      return phaseData.items;
    }
  } catch (_error) {
    // console.error('Error fetching training items from database:', _error);
  }

  // Fallback to static data if database doesn't have the phase
  const trainingItems = {
    1: [
      {
        title: 'Safety Equipment Familiarization',
        description: 'Locate and identify all safety equipment on board including life jackets, fire extinguishers, and emergency exits.'
      },
      {
        title: 'Emergency Procedures Review',
        description: 'Study emergency procedures manual and understand evacuation routes and assembly points.'
      },
      {
        title: 'Personal Protective Equipment (PPE)',
        description: 'Learn proper use and maintenance of personal protective equipment required for maritime operations.'
      },
      {
        title: 'Fire Safety Training',
        description: 'Complete fire safety training including fire prevention, detection, and suppression systems.'
      },
      {
        title: 'Man Overboard Procedures',
        description: 'Learn and practice man overboard emergency response procedures and recovery techniques.'
      }
    ],
    2: [
      {
        title: 'Vessel Systems Overview',
        description: 'Understand main vessel systems including propulsion, electrical, and hydraulic systems.'
      },
      {
        title: 'Cargo Handling Procedures',
        description: 'Learn safe cargo loading, securing, and unloading procedures specific to vessel type.'
      },
      {
        title: 'Navigation Equipment',
        description: 'Familiarize with navigation equipment including GPS, radar, and communication systems.'
      },
      {
        title: 'Deck Operations',
        description: 'Practice deck operations including mooring, anchoring, and line handling procedures.'
      },
      {
        title: 'Maintenance Procedures',
        description: 'Learn routine maintenance procedures and equipment inspection protocols.'
      },
      {
        title: 'Weather Assessment',
        description: 'Understand weather patterns, forecasting, and impact on vessel operations.'
      }
    ],
    3: [
      {
        title: 'Advanced Navigation',
        description: 'Master advanced navigation techniques and electronic chart systems.'
      },
      {
        title: 'Emergency Response Leadership',
        description: 'Develop leadership skills for emergency response and crew coordination.'
      },
      {
        title: 'Specialized Equipment Operation',
        description: 'Learn operation of specialized equipment specific to vessel type and cargo.'
      },
      {
        title: 'Regulatory Compliance',
        description: 'Understand maritime regulations, documentation, and compliance requirements.'
      },
      {
        title: 'Communication Protocols',
        description: 'Master internal and external communication protocols and procedures.'
      },
      {
        title: 'Final Competency Assessment',
        description: 'Complete comprehensive assessment of all training objectives and competencies.'
      }
    ]
  };

  return trainingItems[phase] || [];
}

module.exports = trainingRateLimit(requireCrew(handler));
