// Vercel API Route: /api/crew/process/complete.js - Complete onboarding process
const db = require('../../../lib/database');
const { requireAuth } = require('../../../lib/auth');
const unifiedEmailService = require('../../../lib/unifiedEmailService');
const { trainingRateLimit } = require('../../../lib/rateLimit');
async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userId = req.user.userId;

    // Get user details
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .eq('role', 'crew')
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user has already completed the onboarding process
    if (user.status === 'onboarding_complete') {
      return res.json({
        success: true,
        message: 'Onboarding process already completed',
        alreadyComplete: true,
        completedAt: user.updated_at
      });
    }

    // Verify that all required steps are completed
    const completionChecks = {
      profileUpdated: false,
      formCompleted: false,
      allRequirementsMet: false
    };

    // Check 1: Profile has been updated (basic info filled)
    if (user.contact_phone && user.emergency_contact_name && user.emergency_contact_phone) {
      completionChecks.profileUpdated = true;

    } else {

    }

    // Check 2: Form 05_03a has been completed (status indicates form completion)
    if (user.status === 'form_completed') {
      completionChecks.formCompleted = true;

    } else {

    }

    // Check 3: All requirements met
    completionChecks.allRequirementsMet = completionChecks.profileUpdated && completionChecks.formCompleted;

    if (!completionChecks.allRequirementsMet) {
      return res.status(400).json({
        error: 'Onboarding requirements not yet completed',
        requirements: completionChecks,
        message: 'Please complete all required steps before closing the onboarding process'
      });
    }

    // All requirements met - proceed with process closure

    // Update user status to indicate onboarding completion
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        status: 'training_completed',
        onboarding_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      // console.error('Error updating user status:', updateError);
      return res.status(500).json({ error: 'Failed to update user status' });
    }

    // Log the process completion
    try {
      await supabase
        .from('email_notifications')
        .insert({
          recipient_email: user.email,
          subject: 'Onboarding Process Completed',
          body: `Onboarding process completed for ${user.first_name} ${user.last_name}`,
          sent_at: new Date().toISOString(),
          email_type: 'process_completion'
        });
    } catch (logError) {
      // console.error('Error logging process completion:', logError);
      // Don't fail the request for logging errors
    }

    // Send process completion notifications
    try {

      await unifiedEmailService.sendProcessCompletionEmail(userId);

      res.json({
        success: true,
        message: 'Onboarding process completed successfully',
        processCompletion: {
          userId: userId,
          completedAt: updatedUser.onboarding_completed_at,
          status: updatedUser.status,
          requirements: completionChecks
        },
        notificationsSent: true,
        nextSteps: [
          'You will receive a completion certificate via email',
          'HR and QHSE have been notified of your completion',
          'You may now proceed with vessel assignment'
        ]
      });

    } catch (emailError) {
      // console.error('📧 [ERROR] Failed to send process completion notifications:', emailError);

      // Process completion succeeded, but notifications failed
      res.json({
        success: true,
        message: 'Onboarding process completed, but notification sending failed',
        processCompletion: {
          userId: userId,
          completedAt: updatedUser.onboarding_completed_at,
          status: updatedUser.status,
          requirements: completionChecks
        },
        notificationsSent: false,
        emailError: emailError.message
      });
    }

  } catch (error) {
    // console.error('🏁 [ERROR] Process completion failed:', error);
    res.status(500).json({
      error: 'Failed to complete onboarding process',
      details: error.message
    });
  }
}

module.exports = trainingRateLimit(requireAuth(handler));
