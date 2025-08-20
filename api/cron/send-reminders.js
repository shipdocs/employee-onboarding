// Vercel Cron Job: /api/cron/send-reminders.js - Send training progress reminders
const { supabase } = require('../../lib/supabase');
const { generateMagicToken } = require('../../lib/auth');
const { unifiedEmailService } = require('../../lib/unifiedEmailService');
module.exports = async function handler(req, res) {;
  const configManager = require('../../lib/security/SecureConfigManager');

  // Verify this is a cron request
  const cronSecret = configManager.getString('CRON_SECRET');
  if (!cronSecret || req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Performance monitoring
    const startTime = Date.now();

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const threeDaysFromNow = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
    const sevenDaysFromNow = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
    const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];

    let remindersSent = 0;
    let errors = 0;

    // 1. Find overdue training sessions

    const { data: overdueSessions, error: overdueError } = await supabase
      .from('training_sessions')
      .select(`
        *,
        users!inner (
          id,
          email,
          first_name,
          last_name,
          preferred_language
        )
      `)
      .neq('status', 'completed')
      .lt('due_date', today)
      .in('users.status', ['in_progress', 'forms_completed', 'training_completed']);

    if (overdueError) {
      // console.error('Error fetching overdue sessions:', overdueError);
    } else {

      for (const session of overdueSessions) {
        try {
          await unifiedEmailService.sendProgressReminder(
            session.users,
            session.phase,
            session.due_date,
            'overdue'
          );
          remindersSent++;

        } catch (_error) {
          errors++;
          // console.error(`❌ Error sending overdue reminder to ${session.users.email}:`, _error.message);
        }
      }
    }

    // 2. Find training sessions due soon (3 days)

    const { data: dueSoonSessions, error: dueSoonError } = await supabase
      .from('training_sessions')
      .select(`
        *,
        users!inner (
          id,
          email,
          first_name,
          last_name,
          preferred_language
        )
      `)
      .neq('status', 'completed')
      .gte('due_date', today)
      .lte('due_date', threeDaysFromNow)
      .in('users.status', ['in_progress', 'forms_completed', 'training_completed']);

    if (dueSoonError) {
      // console.error('Error fetching due soon sessions:', dueSoonError);
    } else {

      // Optimize: Get all user IDs that need checking
      const userIds = dueSoonSessions.map(s => s.user_id);

      // Single query to check all recent reminders
      const { data: recentReminders } = await supabase
        .from('email_notifications')
        .select('user_id')
        .in('user_id', userIds)
        .eq('email_type', 'progress_reminder')
        .gte('created_at', today);

      // Create a Set for O(1) lookup
      const recentReminderUserIds = new Set(recentReminders?.map(r => r.user_id) || []);

      // Filter sessions that need reminders
      const sessionsNeedingReminders = dueSoonSessions.filter(
        session => !recentReminderUserIds.has(session.user_id)
      );

      // Send reminders for filtered sessions
      for (const session of sessionsNeedingReminders) {
        try {
          await unifiedEmailService.sendProgressReminder(
            session.users,
            session.phase,
            session.due_date,
            'due_soon'
          );
          remindersSent++;

        } catch (_error) {
          errors++;
          // console.error(`❌ Error sending due soon reminder to ${session.users.email}:`, _error.message);
        }
      }
    }

    // 3. Find inactive users (no activity in 7 days)

    const { data: inactiveUsers, error: inactiveError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        first_name,
        last_name,
        preferred_language,
        last_login_at
      `)
      .eq('role', 'crew')
      .in('status', ['in_progress', 'forms_completed', 'training_completed'])
      .or(`last_login_at.is.null,last_login_at.lt.${sevenDaysAgo}`);

    if (inactiveError) {
      // console.error('Error fetching inactive users:', inactiveError);
    } else {

      // Optimize: Get all user IDs that need checking
      const inactiveUserIds = inactiveUsers.map(u => u.id);

      // Single query to check all recent inactive reminders
      const { data: recentInactiveReminders } = await supabase
        .from('email_notifications')
        .select('user_id')
        .in('user_id', inactiveUserIds)
        .eq('email_type', 'progress_reminder')
        .gte('created_at', sevenDaysAgo);

      // Create a Set for O(1) lookup
      const recentInactiveReminderUserIds = new Set(recentInactiveReminders?.map(r => r.user_id) || []);

      // Filter users that need reminders
      const usersNeedingInactiveReminders = inactiveUsers.filter(
        user => !recentInactiveReminderUserIds.has(user.id)
      );

      // Send reminders for filtered users
      for (const user of usersNeedingInactiveReminders) {
        try {
          await unifiedEmailService.sendProgressReminder(
            user,
            null, // no specific phase for inactive users
            null, // no due date for inactive users
            'inactive'
          );
          remindersSent++;

        } catch (_error) {
          errors++;
          // console.error(`❌ Error sending inactive reminder to ${user.email}:`, _error.message);
        }
      }
    }

    // 4. Check for users who need form completion reminders (72 hours after registration)
    const threeDaysAgo = new Date(now.getTime() - (3 * 24 * 60 * 60 * 1000)).toISOString();

    const { data: usersNeedingFormReminder, error: formReminderError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, preferred_language, created_at, status')
      .eq('role', 'crew')
      .in('status', ['not_started', 'in_progress']) // Users who haven't completed forms yet
      .lte('created_at', threeDaysAgo); // Registered 72+ hours ago

    if (formReminderError) {
      // console.error('Error fetching users needing form reminders:', formReminderError);
    } else {

      // Filter users who haven't completed forms
      const usersNeedingFormReminders = usersNeedingFormReminder.filter(user =>
        user.status !== 'forms_completed' &&
        user.status !== 'training_completed' &&
        user.status !== 'fully_completed'
      );

      // Optimize: Get all user IDs that need checking
      const formReminderUserIds = usersNeedingFormReminders.map(u => u.id);

      // Single query to check all recent form reminders
      const { data: recentFormReminders } = await supabase
        .from('email_notifications')
        .select('user_id')
        .in('user_id', formReminderUserIds)
        .eq('email_type', 'form_reminder')
        .gte('created_at', today);

      // Create a Set for O(1) lookup
      const recentFormReminderUserIds = new Set(recentFormReminders?.map(r => r.user_id) || []);

      // Filter users that need reminders
      const finalUsersNeedingFormReminders = usersNeedingFormReminders.filter(
        user => !recentFormReminderUserIds.has(user.id)
      );

      // Send reminders for filtered users
      for (const user of finalUsersNeedingFormReminders) {
        try {
          await unifiedEmailService.sendFormReminder(user);
          remindersSent++;

        } catch (_error) {
          errors++;
          // console.error(`❌ Error sending form reminder to ${user.email}:`, _error.message);
        }
      }
    }

    // 5. Weekly reminder for upcoming deadlines (7 days)
    if (now.getDay() === 1) { // Monday
      const { data: upcomingSessions, error: upcomingError } = await supabase
        .from('training_sessions')
        .select(`
          *,
          users!inner (
            id,
            email,
            first_name,
            last_name,
            preferred_language
          )
        `)
        .neq('status', 'completed')
        .gte('due_date', threeDaysFromNow)
        .lte('due_date', sevenDaysFromNow)
        .in('users.status', ['in_progress', 'forms_completed', 'training_completed']);

      if (upcomingError) {
        // console.error('Error fetching upcoming sessions:', upcomingError);
      } else {

        for (const session of upcomingSessions) {
          try {
            await unifiedEmailService.sendProgressReminder(
              session.users,
              session.phase,
              session.due_date,
              'upcoming'
            );
            remindersSent++;

          } catch (_error) {
            errors++;
            // console.error(`❌ Error sending weekly reminder to ${session.users.email}:`, _error.message);
          }
        }
      }
    }

    // 6. Check for crew members who need Safety Management PDF (flexible date range)

    // Primary target: 5 days before boarding
    const fiveDaysFromNow = new Date(now.getTime() + (5 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];

    // Fallback range: 1-7 days before boarding (for crew added late)
    const oneDayFromNow = new Date(now.getTime() + (1 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
    const sevenDaysFromNowSafety = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];

    const { data: crewNeedingSafetyPDF, error: safetyPDFError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, expected_boarding_date, vessel_assignment')
      .eq('role', 'crew')
      .in('status', ['not_started', 'in_progress', 'forms_completed', 'training_completed'])
      .gte('expected_boarding_date', oneDayFromNow)
      .lte('expected_boarding_date', sevenDaysFromNowSafety);

    if (safetyPDFError) {
      // console.error('Error fetching crew needing Safety PDF:', safetyPDFError);
    } else {

      // Optimize: Get all crew IDs that need checking
      const safetyPDFCrewIds = crewNeedingSafetyPDF.map(c => c.id);

      // Single query to check all existing safety emails
      const { data: existingSafetyEmails } = await supabase
        .from('email_notifications')
        .select('user_id')
        .in('user_id', safetyPDFCrewIds)
        .eq('email_type', 'safety_management_pdf');

      // Create a Set for O(1) lookup
      const existingSafetyEmailUserIds = new Set(existingSafetyEmails?.map(r => r.user_id) || []);

      // Filter crew that need safety PDFs
      const crewNeedingSafetyPDFFiltered = crewNeedingSafetyPDF.filter(
        crew => !existingSafetyEmailUserIds.has(crew.id)
      );

      // Send safety PDFs for filtered crew
      for (const crew of crewNeedingSafetyPDFFiltered) {
        const boardingDate = new Date(crew.expected_boarding_date);
        const daysUntilBoarding = Math.ceil((boardingDate - now) / (24 * 60 * 60 * 1000));

        try {
          await unifiedEmailService.sendWelcomeEmail(crew);
          remindersSent++;

          // Add delay to avoid rate limiting
          if (crewNeedingSafetyPDFFiltered.indexOf(crew) < crewNeedingSafetyPDFFiltered.length - 1) {

            await new Promise(resolve => setTimeout(resolve, 10000));
          }
        } catch (_error) {
          errors++;
          // console.error('❌ Error sending Safety PDF to ' + crew.email + ':', _error.message);
        }
      }
    }

    // 7. Check for crew members starting onboarding (flexible boarding date)

    // Include crew boarding today or in the past (up to 3 days ago for late processing)
    const threeDaysAgoBoarding = new Date(now.getTime() - (3 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];

    const { data: crewBoardingToday, error: boardingTodayError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, expected_boarding_date, vessel_assignment')
      .eq('role', 'crew')
      .in('status', ['not_started', 'in_progress', 'forms_completed', 'training_completed'])
      .gte('expected_boarding_date', threeDaysAgoBoarding)
      .lte('expected_boarding_date', today);

    if (boardingTodayError) {
      // console.error('Error fetching crew boarding today:', boardingTodayError);
    } else {

      // Optimize: Get all crew IDs that need checking
      const onboardingCrewIds = crewBoardingToday.map(c => c.id);

      // Single query to check all existing onboarding emails
      const { data: existingOnboardingEmails } = await supabase
        .from('email_notifications')
        .select('user_id')
        .in('user_id', onboardingCrewIds)
        .eq('email_type', 'onboarding_start');

      // Create a Set for O(1) lookup
      const existingOnboardingEmailUserIds = new Set(existingOnboardingEmails?.map(r => r.user_id) || []);

      // Filter crew that need onboarding start emails
      const crewBoardingTodayFiltered = crewBoardingToday.filter(
        crew => !existingOnboardingEmailUserIds.has(crew.id)
      );

      // Send onboarding start emails for filtered crew
      for (const crew of crewBoardingTodayFiltered) {
        const boardingDate = new Date(crew.expected_boarding_date);
        const daysSinceBoardingDate = Math.ceil((now - boardingDate) / (24 * 60 * 60 * 1000));

        try {
          // Generate magic token for onboarding start
          const token = generateMagicToken(crew.email);
          await unifiedEmailService.sendMagicLink(crew, token);
          remindersSent++;
          const boardingStatus = daysSinceBoardingDate === 0 ? 'boarding today' :
                               daysSinceBoardingDate > 0 ? 'boarded ' + daysSinceBoardingDate + ' days ago' :
                               'boarding in ' + Math.abs(daysSinceBoardingDate) + ' days';

          // Add delay to avoid rate limiting
          if (crewBoardingTodayFiltered.indexOf(crew) < crewBoardingTodayFiltered.length - 1) {

            await new Promise(resolve => setTimeout(resolve, 10000));
          }
        } catch (_error) {
          errors++;
          // console.error('❌ Error sending onboarding start email to ' + crew.email + ':', _error.message);
        }
      }
    }

    // Performance monitoring
    const executionTime = Date.now() - startTime;
    console.log(`Cron job completed in ${executionTime}ms (${Math.round(executionTime/1000)}s)`);

    // Log slow executions
    if (executionTime > 60000) { // More than 1 minute
      console.warn(`Slow cron job execution: took ${Math.round(executionTime/1000)}s`);
    }

    res.json({
      success: true,
      remindersSent,
      errors,
      executionTimeMs: executionTime,
      timestamp: now.toISOString()
    });

  } catch (_error) {
    // console.error('❌ Cron job failed:', _error);
    res.status(500).json({
      success: false,
      error: _error.message,
      timestamp: new Date().toISOString()
    });
  }
};

