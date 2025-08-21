// Vercel API Route: /api/manager/quiz-reviews/[id]/approve.js - Approve/reject quiz results
const { supabase } = require('../../../../lib/database-supabase-compat');
const { requireManager } = require('../../../../lib/auth');
async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    const { action, comments } = req.body; // action: 'approve' or 'reject'

    if (!id) {
      return res.status(400).json({ error: 'Quiz result ID is required' });
    }

    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Action must be either "approve" or "reject"' });
    }

    const managerId = req.user.userId;

    // Get the quiz result
    const { data: quizResult, error: quizError } = await supabase
      .from('quiz_results')
      .select(`
        *,
        users!inner (
          id,
          email,
          first_name,
          last_name,
          position,
          vessel_assignment
        )
      `)
      .eq('id', id)
      .single();

    if (quizError || !quizResult) {
      return res.status(404).json({ error: 'Quiz result not found' });
    }

    if (quizResult.review_status !== 'pending_review') {
      return res.status(400).json({
        error: 'Quiz has already been reviewed',
        currentStatus: quizResult.review_status
      });
    }

    // Update quiz result with review decision
    const reviewStatus = action === 'approve' ? 'approved' : 'rejected';
    const { data: updatedQuiz, error: updateError } = await supabase
      .from('quiz_results')
      .update({
        review_status: reviewStatus,
        reviewed_by: managerId,
        reviewed_at: new Date().toISOString(),
        review_notes: comments || null
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      // console.error('Error updating quiz result:', updateError);
      return res.status(500).json({ error: 'Failed to update quiz result' });
    }

    // If approved and quiz was passed, update training session status
    if (action === 'approve' && quizResult.passed) {
      const { error: sessionError } = await supabase
        .from('training_sessions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('user_id', quizResult.user_id)
        .eq('phase', quizResult.phase);

      if (sessionError) {
        // console.error('Error updating training session:', sessionError);
        // Don't fail the request, but log the error
      }

      // Check if this was the final phase and all phases are now completed
      const allSessionsResult = await db.query('SELECT phase, status FROM training_sessions WHERE user_id = $1', [quizResult.user_id]);
    const allSessions = allSessionsResult.rows;
    const allSessionsError = false;

      if (!allSessionsError && allSessions) {
        const completedPhases = allSessions.filter(s => s.status === 'completed').length;
        const totalPhases = allSessions.length;

        // If all phases completed, trigger completion workflow
        if (completedPhases === totalPhases && totalPhases === 3) {
          try {
            // Generate completion certificate
            const certResponse = await fetch(`${process.env.BASE_URL || 'http://localhost:3001'}/api/pdf/generate-certificate`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${generateServiceToken(quizResult.user_id)}`
              }
            });

            if (!certResponse.ok) {
              // console.error('Error generating completion certificate');
            }
          } catch (certError) {
            // console.error('Error calling certificate generation:', certError);
          }

          // Send completion notification email
          try {
            const emailResponse = await fetch(`${process.env.BASE_URL || 'http://localhost:3001'}/api/email/send-completion`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': req.headers.authorization
              },
              body: JSON.stringify({
                userId: quizResult.user_id
              })
            });

            if (!emailResponse.ok) {
              // console.error('Error sending completion email');
            }
          } catch (emailError) {
            // console.error('Error calling email service:', emailError);
          }
        }
      }
    }

    // If rejected, send notification email to crew member
    if (action === 'reject') {
      try {
        const emailResponse = await fetch(`${process.env.BASE_URL || 'http://localhost:3001'}/api/email/send-quiz-rejection`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': req.headers.authorization
          },
          body: JSON.stringify({
            userId: quizResult.user_id,
            phase: quizResult.phase,
            comments: comments
          })
        });

        if (!emailResponse.ok) {
          // console.error('Error sending rejection email');
        }
      } catch (emailError) {
        // console.error('Error calling email service:', emailError);
      }
    }

    // Log the review action
    await supabase
      .from('email_notifications')
      .insert({
        user_id: quizResult.user_id,
        email_type: action === 'approve' ? 'quiz_approved' : 'quiz_rejected',
        subject: `Phase ${quizResult.phase} Quiz ${action === 'approve' ? 'Approved' : 'Rejected'}`,
        status: 'sent'
      });

    res.json({
      message: `Quiz ${action}d successfully`,
      quizResult: {
        id: updatedQuiz.id,
        phase: updatedQuiz.phase,
        reviewStatus: updatedQuiz.review_status,
        reviewedAt: updatedQuiz.reviewed_at,
        reviewComments: updatedQuiz.review_notes
      },
      user: {
        id: quizResult.users.id,
        email: quizResult.users.email,
        firstName: quizResult.users.first_name,
        lastName: quizResult.users.last_name
      }
    });

  } catch (_error) {
    // console.error('Error in quiz review approval:', _error);
    res.status(500).json({ error: 'Failed to process quiz review' });
  }
}

// Helper function to generate service token for internal API calls
function generateServiceToken(userId) {
  // This is a simplified version - in production you'd want proper service-to-service auth
  const jwt = require('jsonwebtoken');
const { adminRateLimit } = require('../../../../lib/rateLimit');
  return jwt.sign(
    { userId, role: 'service' },
    process.env.JWT_SECRET,
    { expiresIn: '5m' }
  );
}

module.exports = adminRateLimit(requireManager(handler));
