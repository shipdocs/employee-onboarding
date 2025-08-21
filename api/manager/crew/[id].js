// Vercel API Route: /api/manager/crew/[id].js - Get/update specific crew member
const db = require('../../../lib/database-direct');
const { requireManager } = require('../../../lib/auth');
const { adminRateLimit } = require('../../../lib/rateLimit');
async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Crew member ID is required' });
  }

  if (req.method === 'GET') {
    return await getCrewMember(req, res, id);
  } else if (req.method === 'PUT') {
    return await updateCrewMember(req, res, id);
  } else if (req.method === 'DELETE') {
    return await deleteCrewMember(req, res, id);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

// Get specific crew member with detailed progress
async function getCrewMember(req, res, userId) {
  try {
    const managerId = req.user.userId;

    // Check if this manager has access to this crew member
    const { data: assignment, error: assignmentError } = await supabase
      .from('crew_assignments')
      .select('id')
      .eq('manager_id', managerId)
      .eq('crew_member_id', userId)
      .eq('is_active', true)
      .single();

    if (assignmentError || !assignment) {
      return res.status(403).json({ error: 'You do not have access to this crew member' });
    }

    // Get crew member details
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .eq('role', 'crew')
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'Crew member not found' });
    }

    // Get training sessions with items
    const { data: sessions, error: sessionsError } = await supabase
      .from('training_sessions')
      .select(`
        *,
        training_items (*)
      `)
      .eq('user_id', userId)
      .order('phase');

    // Get quiz results
    const { data: quizResults, error: quizError } = await supabase
      .from('quiz_results')
      .select('*')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false });

    // Get certificates
    const { data: certificates, error: certError } = await supabase
      .from('certificates')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (sessionsError || quizError || certError) {
      // console.error('Error fetching user data:', sessionsError || quizError || certError);
      return res.status(500).json({ error: 'Failed to fetch user details' });
    }

    // Calculate detailed progress
    const progress = sessions.map(session => {
      const completedItems = session.training_items.filter(item => item.completed).length;
      const totalItems = session.training_items.length;
      const quizResult = quizResults.find(q => q.phase === session.phase);

      return {
        phase: session.phase,
        status: session.status,
        startedAt: session.started_at,
        completedAt: session.completed_at,
        dueDate: session.due_date,
        items: session.training_items.map(item => ({
          id: item.id,
          itemNumber: item.item_number,
          title: item.title,
          description: item.description,
          completed: item.completed,
          completedAt: item.completed_at,
          instructorInitials: item.instructor_initials,
          comments: item.comments,
          proofPhotoPath: item.proof_photo_path
        })),
        completedItems,
        totalItems,
        completionPercentage: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0,
        quiz: quizResult ? {
          id: quizResult.id,
          score: quizResult.score,
          totalQuestions: quizResult.total_questions,
          percentage: quizResult.percentage,
          passed: quizResult.passed,
          reviewStatus: quizResult.review_status,
          completedAt: quizResult.completed_at,
          reviewedAt: quizResult.reviewed_at,
          reviewComments: quizResult.review_comments
        } : null
      };
    });

    // Calculate overall summary
    const summary = {
      totalPhases: sessions.length,
      completedPhases: sessions.filter(s => s.status === 'completed').length,
      overallProgress: sessions.length > 0 ?
        Math.round((sessions.filter(s => s.status === 'completed').length / sessions.length) * 100) : 0,
      quizzesTaken: quizResults.length,
      quizzesPassed: quizResults.filter(q => q.passed).length,
      pendingReviews: quizResults.filter(q => q.review_status === 'pending_review').length,
      certificatesIssued: certificates.length
    };

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        position: user.position,
        vesselAssignment: user.vessel_assignment,
        expectedBoardingDate: user.expected_boarding_date,
        contactPhone: user.contact_phone,
        emergencyContactName: user.emergency_contact_name,
        emergencyContactPhone: user.emergency_contact_phone,
        preferredLanguage: user.preferred_language,
        status: user.status,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      },
      progress,
      summary,
      quizHistory: quizResults,
      certificates
    });

  } catch (_error) {
    // console.error('Error in getCrewMember:', _error);
    res.status(500).json({ error: 'Failed to fetch crew member details' });
  }
}

// Update crew member
async function updateCrewMember(req, res, userId) {
  try {
    const managerId = req.user.userId;

    // Check if this manager has access to this crew member
    const { data: assignment, error: assignmentError } = await supabase
      .from('crew_assignments')
      .select('id')
      .eq('manager_id', managerId)
      .eq('crew_member_id', userId)
      .eq('is_active', true)
      .single();

    if (assignmentError || !assignment) {
      return res.status(403).json({ error: 'You do not have access to this crew member' });
    }

    const {
      firstName,
      lastName,
      position,
      vesselAssignment,
      expectedBoardingDate,
      contactPhone,
      emergencyContactName,
      emergencyContactPhone,
      preferredLanguage,
      status
    } = req.body;

    const updateData = {};
    if (firstName !== undefined) updateData.first_name = firstName;
    if (lastName !== undefined) updateData.last_name = lastName;
    if (position !== undefined) updateData.position = position;
    if (vesselAssignment !== undefined) updateData.vessel_assignment = vesselAssignment;
    if (expectedBoardingDate !== undefined) updateData.expected_boarding_date = expectedBoardingDate;
    if (contactPhone !== undefined) updateData.contact_phone = contactPhone;
    if (emergencyContactName !== undefined) updateData.emergency_contact_name = emergencyContactName;
    if (emergencyContactPhone !== undefined) updateData.emergency_contact_phone = emergencyContactPhone;
    if (preferredLanguage !== undefined) updateData.preferred_language = preferredLanguage;
    if (status !== undefined) updateData.status = status;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateData.updated_at = new Date().toISOString();

    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .eq('role', 'crew')
      .select()
      .single();

    if (updateError) {
      // console.error('Error updating crew member:', updateError);
      return res.status(500).json({ error: 'Failed to update crew member' });
    }

    if (!updatedUser) {
      return res.status(404).json({ error: 'Crew member not found' });
    }

    // Log the update
    await supabase
      .from('audit_log')
      .insert({
        user_id: managerId,
        action: 'update_crew_member',
        resource_type: 'user',
        resource_id: userId,
        details: {
          updated_fields: Object.keys(updateData),
          crew_email: updatedUser.email,
          crew_name: `${updatedUser.first_name} ${updatedUser.last_name}`
        }
      });

    res.json({
      message: 'Crew member updated successfully',
      user: updatedUser
    });

  } catch (_error) {
    // console.error('Error in updateCrewMember:', _error);
    res.status(500).json({ error: 'Failed to update crew member' });
  }
}

// Delete crew member
async function deleteCrewMember(req, res, userId) {
  try {
    const managerId = req.user.userId;
    const { forceDelete } = req.query;

    // Check if this manager has access to this crew member
    const { data: assignment, error: assignmentError } = await supabase
      .from('crew_assignments')
      .select('id')
      .eq('manager_id', managerId)
      .eq('crew_member_id', userId)
      .eq('is_active', true)
      .single();

    if (assignmentError || !assignment) {
      return res.status(403).json({ error: 'You do not have access to this crew member' });
    }

    // First check if the crew member exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .eq('role', 'crew')
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'Crew member not found' });
    }

    // Check if crew member has training data
    const { data: trainingData, error: checkError } = await supabase
      .from('training_sessions')
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    const hasTrainingData = trainingData && trainingData.length > 0;

    // If crew member has training data and forceDelete is not set, return confirmation request
    if (hasTrainingData && forceDelete !== 'true') {
      return res.status(409).json({
        error: 'Crew member has training data',
        message: 'This crew member has training records. Deleting them will permanently remove all their training data, quiz results, and certificates.',
        requiresConfirmation: true,
        crewMember: {
          name: `${user.first_name} ${user.last_name}`,
          email: user.email,
          position: user.position
        }
      });
    }

    // If forceDelete is true or no training data, proceed with cascade deletion
    if (forceDelete === 'true' || !hasTrainingData) {
      // Delete in correct order to avoid foreign key constraints

      // 1. Delete quiz randomization sessions
      await supabase
        .from('quiz_randomization_sessions')
        .delete()
        .eq('user_id', userId);

      // 2. Delete quiz results
      await supabase
        .from('quiz_results')
        .delete()
        .eq('user_id', userId);

      // 3. Delete training items
      const { data: sessions } = await supabase
        .from('training_sessions')
        .select('id')
        .eq('user_id', userId);

      if (sessions && sessions.length > 0) {
        const sessionIds = sessions.map(s => s.id);
        await supabase
          .from('training_items')
          .delete()
          .in('session_id', sessionIds);
      }

      // 4. Delete training sessions
      await supabase
        .from('training_sessions')
        .delete()
        .eq('user_id', userId);

      // 5. Delete certificates
      await supabase
        .from('certificates')
        .delete()
        .eq('user_id', userId);

      // 6. Delete email notifications
      await supabase
        .from('email_notifications')
        .delete()
        .eq('user_id', userId);

      // 7. Delete magic links
      await supabase
        .from('magic_links')
        .delete()
        .eq('email', user.email);

      // 8. Finally delete the user
      const { data: deletedUser, error: deleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', userId)
        .eq('role', 'crew')
        .select()
        .single();

      if (deleteError) {
        // console.error('Error deleting crew member:', deleteError);
        return res.status(500).json({
          error: 'Failed to delete crew member',
          details: deleteError.message
        });
      }

      res.json({
        message: 'Crew member and all related data deleted successfully',
        deletedUser: {
          id: deletedUser.id,
          name: `${deletedUser.first_name} ${deletedUser.last_name}`,
          email: deletedUser.email
        }
      });
    }

  } catch (_error) {
    // console.error('Error in deleteCrewMember:', _error);
    res.status(500).json({
      error: 'Failed to delete crew member',
      details: _error.message
    });
  }
}

module.exports = adminRateLimit(requireManager(handler));
