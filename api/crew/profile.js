// Vercel API Route: /api/crew/profile.js
const { supabase } = require('../../lib/supabase');
const { requireAuth } = require('../../lib/auth');
const unifiedEmailService = require('../../lib/unifiedEmailService');
const { createAPIHandler, createError, createValidationError, createDatabaseError, createNotFoundError } = require('../../lib/apiHandler');
const { validators, sanitizers, validateObject, checkBodySize } = require('../../lib/validation');
const { trainingRateLimit } = require('../../lib/rateLimit');

async function handler(req, res) {
  if (req.method === 'GET') {
    return await getProfile(req, res);
  } else if (req.method === 'PUT') {
    return await updateProfile(req, res);
  } else {
    throw createError('VALIDATION_INVALID_METHOD', `Method ${req.method} not allowed`);
  }
}

async function getProfile(req, res) {
  const userId = req.user.userId;

    // Get user profile
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError) {
      throw createDatabaseError('Failed to fetch user profile', { originalError: userError.message });
    }

    if (!user) {
      throw createNotFoundError('User');
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

    if (sessionsError) {
      throw createDatabaseError('Failed to fetch training data', { originalError: sessionsError.message });
    }

    // Get quiz results
    const { data: quizResults, error: quizError } = await supabase
      .from('quiz_results')
      .select('*')
      .eq('user_id', userId)
      .order('phase');

    if (quizError) {
      throw createDatabaseError('Failed to fetch quiz data', { originalError: quizError.message });
    }

    // Calculate progress
    const progress = sessions.map(session => {
      const completedItems = session.training_items.filter(item => item.completed_at !== null).length;
      const totalItems = session.training_items.length;
      const quizResult = quizResults.find(q => q.phase === session.phase);

      return {
        phase: session.phase,
        status: session.status,
        completedItems,
        totalItems,
        completionPercentage: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0,
        startedAt: session.started_at,
        completedAt: session.completed_at,
        dueDate: session.due_date,
        quizPassed: quizResult ? quizResult.passed : false,
        quizScore: quizResult ? `${quizResult.score}/${quizResult.total_questions}` : null
      };
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        position: user.position,
        vesselAssignment: user.vessel_assignment,
        expectedBoardingDate: user.expected_boarding_date,
        contactPhone: user.contact_phone,
        emergencyContactName: user.emergency_contact_name,
        emergencyContactPhone: user.emergency_contact_phone,
        preferredLanguage: user.preferred_language,
        status: user.status,
        createdAt: user.created_at
      },
      progress,
      summary: {
        totalPhases: sessions.length,
        completedPhases: sessions.filter(s => s.status === 'completed').length,
        overallProgress: sessions.length > 0 ?
          Math.round((sessions.filter(s => s.status === 'completed').length / sessions.length) * 100) : 0,
        quizzesPassed: quizResults.filter(q => q.passed).length,
        totalQuizzes: quizResults.length
      }
    });
}

async function updateProfile(req, res) {
  const userId = req.user.userId;

    // Validate request body
    const validationSchema = {
      firstName: {
        required: false,
        type: 'string',
        options: {
          minLength: 1,
          maxLength: 100,
          pattern: /^[a-zA-Z\s\-']+$/,
          patternError: 'First name can only contain letters, spaces, hyphens and apostrophes'
        }
      },
      lastName: {
        required: false,
        type: 'string',
        options: {
          minLength: 1,
          maxLength: 100,
          pattern: /^[a-zA-Z\s\-']+$/,
          patternError: 'Last name can only contain letters, spaces, hyphens and apostrophes'
        }
      },
      contactPhone: {
        required: false,
        type: 'phoneNumber',
        options: {}
      },
      emergencyContactName: {
        required: false,
        type: 'string',
        options: {
          minLength: 1,
          maxLength: 200
        }
      },
      emergencyContactPhone: {
        required: false,
        type: 'phoneNumber',
        options: {}
      },
      preferredLanguage: {
        required: false,
        type: 'enum',
        options: {
          allowedValues: ['en', 'nl']
        }
      }
    };

    const validationErrors = validateObject(req.body, validationSchema);
    if (validationErrors.length > 0) {
      throw createValidationError('Validation failed', { errors: validationErrors });
    }

    const {
      firstName,
      lastName,
      contactPhone,
      emergencyContactName,
      emergencyContactPhone,
      preferredLanguage
    } = req.body;

    // Build update data object with sanitized values
    const updateData = {};
    if (firstName !== undefined) updateData.first_name = sanitizers.text(firstName, { maxLength: 100 });
    if (lastName !== undefined) updateData.last_name = sanitizers.text(lastName, { maxLength: 100 });
    if (contactPhone !== undefined) updateData.contact_phone = contactPhone; // Already validated
    if (emergencyContactName !== undefined) updateData.emergency_contact_name = sanitizers.text(emergencyContactName, { maxLength: 200 });
    if (emergencyContactPhone !== undefined) updateData.emergency_contact_phone = emergencyContactPhone; // Already validated
    if (preferredLanguage !== undefined) updateData.preferred_language = preferredLanguage; // Already validated as enum

    if (Object.keys(updateData).length === 0) {
      throw createValidationError('No fields to update');
    }

    updateData.updated_at = new Date().toISOString();

    // Get current user data for comparison and email
    const { data: currentUser, error: currentUserError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .eq('role', 'crew')
      .single();

    if (currentUserError) {
      throw createDatabaseError('Failed to fetch current user', { originalError: currentUserError.message });
    }

    if (!currentUser) {
      throw createNotFoundError('User');
    }

    // Update the user profile
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .eq('role', 'crew')
      .select()
      .single();

    if (updateError) {
      throw createDatabaseError('Failed to update profile', { originalError: updateError.message });
    }

    if (!updatedUser) {
      throw createNotFoundError('User');
    }

    // Send HR notification about profile update
    try {

      const hrEmail = process.env.HR_EMAIL || 'hr@shipdocs.app';
      const isNL = updatedUser.preferred_language === 'nl';

      const subject = isNL ?
        `📝 Profiel Update - ${updatedUser.first_name} ${updatedUser.last_name}` :
        `📝 Profile Update - ${updatedUser.first_name} ${updatedUser.last_name}`;

      // Determine what fields were updated
      const updatedFields = [];
      if (firstName !== undefined && firstName !== currentUser.first_name) updatedFields.push(isNL ? 'Voornaam' : 'First Name');
      if (lastName !== undefined && lastName !== currentUser.last_name) updatedFields.push(isNL ? 'Achternaam' : 'Last Name');
      if (contactPhone !== undefined && contactPhone !== currentUser.contact_phone) updatedFields.push(isNL ? 'Telefoon' : 'Phone');
      if (emergencyContactName !== undefined && emergencyContactName !== currentUser.emergency_contact_name) updatedFields.push(isNL ? 'Noodcontact Naam' : 'Emergency Contact Name');
      if (emergencyContactPhone !== undefined && emergencyContactPhone !== currentUser.emergency_contact_phone) updatedFields.push(isNL ? 'Noodcontact Telefoon' : 'Emergency Contact Phone');
      if (preferredLanguage !== undefined && preferredLanguage !== currentUser.preferred_language) updatedFields.push(isNL ? 'Taal' : 'Language');

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Inter', system-ui, sans-serif; line-height: 1.6; color: #132545; background-color: #f8fafc; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 10px 15px -3px rgba(19, 37, 69, 0.1); }
            .header { background: linear-gradient(135deg, #132545 0%, #006A82 100%); color: white; padding: 30px 20px; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
            .content { padding: 30px 20px; }
            .footer { background-color: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
            .info-box { background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0ea5e9; }
            .update-list { background-color: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; margin: 20px 0; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📝 ${isNL ? 'Profiel Update' : 'Profile Update'}</h1>
            </div>
            <div class="content">
              <h2 style="color: #132545; margin-top: 0;">${isNL ? 'Bemanningslid heeft profiel bijgewerkt' : 'Crew Member Updated Profile'}</h2>

              <div class="info-box">
                <strong>${isNL ? 'Bemanningslid:' : 'Crew Member:'}</strong> ${updatedUser.first_name} ${updatedUser.last_name}<br>
                <strong>${isNL ? 'E-mail:' : 'Email:'}</strong> ${updatedUser.email}<br>
                <strong>${isNL ? 'Positie:' : 'Position:'}</strong> ${updatedUser.position || 'N/A'}<br>
                <strong>${isNL ? 'Bijgewerkt op:' : 'Updated on:'}</strong> ${new Date().toLocaleString(isNL ? 'nl-NL' : 'en-US')}
              </div>

              ${updatedFields.length > 0 ? `
              <div class="update-list">
                <strong>${isNL ? 'Bijgewerkte velden:' : 'Updated fields:'}</strong>
                <ul>
                  ${updatedFields.map(field => `<li>${field}</li>`).join('')}
                </ul>
              </div>
              ` : ''}

              <p>${isNL ?
                'Het bemanningslid heeft zijn/haar profiel bijgewerkt. Controleer de wijzigingen en neem indien nodig contact op.' :
                'The crew member has updated their profile. Please review the changes and contact them if necessary.'
              }</p>

              <p style="margin-bottom: 0;">${isNL ? 'Met vriendelijke groet,' : 'Best regards,'}</p>
              <p style="margin-top: 5px;"><strong style="color: #006A82;">Maritime Onboarding Services</strong></p>
            </div>
            <div class="footer">
              <p>${isNL ?
                'Deze e-mail is verzonden vanuit het Maritime Onboarding Services Onboarding Systeem' :
                'This email was sent from the Maritime Onboarding Services Onboarding System'
              }</p>
              <p style="margin: 5px 0;">© 2024 Maritime Onboarding Services. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      await unifiedEmailService.sendEmailWithAttachments({
        recipientEmail: hrEmail,
        recipientName: 'HR Department',
        subject: subject,
        htmlContent: htmlContent,
        attachments: [],
        logType: 'profile_update_hr',
        userId: userId
      });

    } catch (emailError) {
      // console.error('📧 [ERROR] Failed to send HR notification:', emailError);
      // Don't fail the profile update if email fails
    }

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.first_name,
        lastName: updatedUser.last_name,
        contactPhone: updatedUser.contact_phone,
        emergencyContactName: updatedUser.emergency_contact_name,
        emergencyContactPhone: updatedUser.emergency_contact_phone,
        preferredLanguage: updatedUser.preferred_language,
        updatedAt: updatedUser.updated_at
      },
      hrNotified: true
    });
}

// Create the standardized handler with error handling
const apiHandler = createAPIHandler(handler, {
  allowedMethods: ['GET', 'PUT']
});

// Export with authentication
module.exports = trainingRateLimit(requireAuth(apiHandler));
