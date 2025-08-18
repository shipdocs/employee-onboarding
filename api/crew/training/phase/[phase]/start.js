// Vercel API Route: /api/crew/training/phase/[phase]/start.js - Start a training phase
const { supabase } = require('../../../../../lib/supabase');
const { requireCrew } = require('../../../../../lib/auth');
const { trainingRateLimit } = require('../../../../../lib/rateLimit');
async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { phase } = req.query;
    const userId = req.user.userId;

    if (!phase) {
      return res.status(400).json({ error: 'Phase is required' });
    }

    const phaseNum = parseInt(phase);
    if (!phaseNum || phaseNum < 1 || phaseNum > 3) {
      return res.status(400).json({ error: 'Invalid phase number' });
    }

    // Get training session for this phase
    const { data: session, error: sessionError } = await supabase
      .from('training_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('phase', phaseNum)
      .single();

    if (sessionError) {
      // console.error('Error fetching training session:', sessionError);
      return res.status(500).json({ error: 'Failed to fetch training session' });
    }

    if (!session) {
      return res.status(404).json({ error: 'Training session not found' });
    }

    // Check if session can be started
    if (session.status === 'completed') {
      return res.status(400).json({
        error: 'Training phase already completed',
        session: {
          id: session.id,
          phase: session.phase,
          status: session.status,
          completedAt: session.completed_at
        }
      });
    }

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
          incompletePhases: incompletePrevious.map(s => s.phase)
        });
      }
    }

    // Update session status to in_progress if not already started
    let updatedSession = session;
    if (session.status === 'not_started') {
      const { data: updated, error: updateError } = await supabase
        .from('training_sessions')
        .update({
          status: 'in_progress',
          started_at: new Date().toISOString()
        })
        .eq('id', session.id)
        .select()
        .single();

      if (updateError) {
        // console.error('Error updating session status:', updateError);
        return res.status(500).json({ error: 'Failed to start training session' });
      }

      updatedSession = updated;
    }

    // Create training items if they don't exist
    const { data: existingItems, error: itemsError } = await supabase
      .from('training_items')
      .select('id')
      .eq('session_id', session.id);

    if (itemsError) {
      // console.error('Error checking training items:', itemsError);
      return res.status(500).json({ error: 'Failed to check training items' });
    }

    if (existingItems.length === 0) {
      const trainingItems = await getTrainingItemsForPhase(phaseNum);
      const itemsToInsert = trainingItems.map((item, index) => ({
        session_id: session.id,
        item_number: item.number || (index + 1).toString().padStart(2, '0'),
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

    // Send phase start notification email
    try {
      const emailResponse = await fetch(`${process.env.BASE_URL || 'http://localhost:3001'}/api/email/send-phase-start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.authorization
        },
        body: JSON.stringify({
          userId: userId,
          phase: phaseNum
        })
      });

      if (!emailResponse.ok) {
        // console.error('Error sending phase start email');
      }
    } catch (emailError) {
      // console.error('Error calling email service:', emailError);
    }

    res.json({
      message: `Phase ${phaseNum} training started successfully`,
      session: {
        id: updatedSession.id,
        phase: updatedSession.phase,
        status: updatedSession.status,
        startedAt: updatedSession.started_at,
        dueDate: updatedSession.due_date
      },
      phaseInfo: getPhaseInfo(phaseNum)
    });

  } catch (_error) {
    // console.error('Error starting training phase:', _error);
    res.status(500).json({ error: 'Failed to start training phase' });
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

// Helper function to get phase information
function getPhaseInfo(phase) {
  const phaseData = {
    1: {
      title: 'Phase 1: Basic Safety Training',
      description: 'Essential safety procedures and emergency protocols',
      duration: '24 hours'
    },
    2: {
      title: 'Phase 2: Operational Training',
      description: 'Vessel operations and cargo handling procedures',
      duration: '72 hours'
    },
    3: {
      title: 'Phase 3: Advanced Training',
      description: 'Advanced procedures and specialized operations',
      duration: '1 week'
    }
  };

  return phaseData[phase] || null;
}

module.exports = trainingRateLimit(requireCrew(handler));
