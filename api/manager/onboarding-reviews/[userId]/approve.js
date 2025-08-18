// Vercel API Route: /api/manager/onboarding-reviews/[userId]/approve.js - Final onboarding approval
const { supabase } = require('../../../../lib/supabase');
const { requireManager } = require('../../../../lib/auth');
async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.query;
    const { comments } = req.body || {};

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const managerId = req.user.userId;

    // Get user details
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .eq('role', 'crew')
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'Crew member not found' });
    }

    // Verify user has completed all phases and quizzes
    const { data: sessions, error: sessionsError } = await supabase
      .from('training_sessions')
      .select('phase, status')
      .eq('user_id', userId);

    const { data: quizResults, error: quizError } = await supabase
      .from('quiz_results')
      .select('phase, passed, review_status')
      .eq('user_id', userId);

    if (sessionsError || quizError) {
      // console.error('Error fetching user progress:', sessionsError || quizError);
      return res.status(500).json({ error: 'Failed to verify user progress' });
    }

    // Check completion requirements
    const totalPhases = 3;
    const completedPhases = sessions.filter(s => s.status === 'completed').length;
    const approvedQuizzes = quizResults.filter(q => q.passed && q.review_status === 'approved').length;

    if (completedPhases !== totalPhases) {
      return res.status(400).json({
        error: 'User has not completed all training phases',
        status: {
          totalPhases,
          completedPhases,
          missingPhases: sessions.filter(s => s.status !== 'completed').map(s => s.phase)
        }
      });
    }

    if (approvedQuizzes !== totalPhases) {
      return res.status(400).json({
        error: 'User has not passed and had approved all phase quizzes',
        status: {
          totalQuizzes: totalPhases,
          approvedQuizzes,
          pendingQuizzes: quizResults.filter(q => !q.passed || q.review_status !== 'approved').map(q => ({
            phase: q.phase,
            passed: q.passed,
            reviewStatus: q.review_status
          }))
        }
      });
    }

    // Check if user is already completed
    if (user.status === 'fully_completed') {
      return res.status(400).json({
        error: 'User onboarding has already been approved',
        completedAt: user.updated_at
      });
    }

    // Update user status to fully_completed
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        status: 'fully_completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      // console.error('Error updating user status:', updateError);
      return res.status(500).json({ error: 'Failed to approve onboarding' });
    }

    // Generate final completion certificate if not already generated
    const { data: existingCert, error: certCheckError } = await supabase
      .from('certificates')
      .select('id')
      .eq('user_id', userId)
      .eq('certificate_type', 'Maritime Onboarding Training')
      .single();

    if (!existingCert && !certCheckError) {
      try {
        const certResponse = await fetch(`${process.env.BASE_URL || 'http://localhost:3001'}/api/pdf/generate-certificate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${generateServiceToken(userId)}`
          }
        });

        if (!certResponse.ok) {
          // console.error('Error generating final certificate');
        }
      } catch (certError) {
        // console.error('Error calling certificate generation:', certError);
      }
    }

    // Send final completion email to crew member and HR
    try {
      const emailResponse = await fetch(`${process.env.BASE_URL || 'http://localhost:3001'}/api/email/send-final-completion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.authorization
        },
        body: JSON.stringify({
          userId: userId,
          managerComments: comments
        })
      });

      if (!emailResponse.ok) {
        // console.error('Error sending final completion email');
      }
    } catch (emailError) {
      // console.error('Error calling email service:', emailError);
    }

    // Log the approval
    await supabase
      .from('email_notifications')
      .insert({
        user_id: userId,
        email_type: 'onboarding_approved',
        subject: 'Onboarding Training Completed - Final Approval',
        status: 'sent'
      });

    // Get updated user progress for response
    const { data: finalSessions, error: finalSessionsError } = await supabase
      .from('training_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('phase');

    const { data: finalQuizzes, error: finalQuizzesError } = await supabase
      .from('quiz_results')
      .select('*')
      .eq('user_id', userId)
      .order('phase');

    const { data: certificates, error: certificatesError } = await supabase
      .from('certificates')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    res.json({
      message: 'Onboarding approved successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.first_name,
        lastName: updatedUser.last_name,
        status: updatedUser.status,
        completedAt: updatedUser.updated_at
      },
      summary: {
        totalPhases: finalSessions?.length || 0,
        completedPhases: finalSessions?.filter(s => s.status === 'completed').length || 0,
        approvedQuizzes: finalQuizzes?.filter(q => q.review_status === 'approved').length || 0,
        certificatesIssued: certificates?.length || 0
      },
      managerComments: comments,
      approvedBy: managerId,
      approvedAt: new Date().toISOString()
    });

  } catch (_error) {
    // console.error('Error in onboarding approval:', _error);
    res.status(500).json({ error: 'Failed to approve onboarding' });
  }
}

// Helper function to generate service token for internal API calls
function generateServiceToken(userId) {
  const jwt = require('jsonwebtoken');
const { adminRateLimit } = require('../../../../lib/rateLimit');
  return jwt.sign(
    { userId, role: 'service' },
    process.env.JWT_SECRET,
    { expiresIn: '5m' }
  );
}

module.exports = adminRateLimit(requireManager(handler));
