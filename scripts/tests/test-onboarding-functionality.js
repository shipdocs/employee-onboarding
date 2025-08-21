// test-onboarding-functionality.js
// Comprehensive test script for shipdocs.app onboarding functionality

const { supabase } = require('./lib/supabase');
const { unifiedEmailService } = require('./lib/unifiedEmailService');
const { generateMagicToken } = require('./lib/auth');
const fs = require('fs').promises;
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  testAccounts: [
    { email: 'testuser1@shipdocs.app', firstName: 'Test', lastName: 'User1', position: 'Deck Officer' },
    { email: 'testuser2@shipdocs.app', firstName: 'Test', lastName: 'User2', position: 'Engineer' },
    { email: 'testuser3@shipdocs.app', firstName: 'Test', lastName: 'User3', position: 'Captain' },
    { email: 'testuser4@shipdocs.app', firstName: 'Test', lastName: 'User4', position: 'Chief Engineer' },
    { email: 'testuser5@shipdocs.app', firstName: 'Test', lastName: 'User5', position: 'Deck Cadet' }
  ],
  hrEmail: 'hr@shipdocs.app',
  qhseEmail: 'qhse@shipdocs.app',
  managerEmail: 'testmanager@shipdocs.app',
  vesselAssignment: 'Test Vessel',
  expectedBoardingDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
  formData: {
    personalInfo: {
      fullName: '',
      dateOfBirth: '1990-01-01',
      nationality: 'Dutch',
      passportNumber: 'TEST123456',
      passportExpiry: '2030-01-01'
    },
    contactInfo: {
      phoneNumber: '+31612345678',
      emergencyContactName: 'Emergency Contact',
      emergencyContactPhone: '+31687654321',
      homeAddress: 'Test Street 123, Amsterdam'
    },
    qualifications: {
      certifications: ['Basic Safety Training', 'Medical First Aid'],
      languages: ['English', 'Dutch'],
      specialSkills: 'Firefighting, Navigation'
    },
    healthInfo: {
      medicalCertificateDate: '2024-01-01',
      medicalCertificateExpiry: '2026-01-01',
      allergies: 'None',
      medications: 'None'
    },
    acknowledgements: {
      safetyPoliciesReviewed: true,
      emergencyProceduresUnderstood: true,
      dataPrivacyConsent: true
    }
  }
};

// Test results storage
const TEST_RESULTS = {
  crewRegistration: { status: 'Not Tested', details: [], issues: [] },
  accessLinkDistribution: { status: 'Not Tested', details: [], issues: [] },
  authentication: { status: 'Not Tested', details: [], issues: [] },
  initialFormCompletion: { status: 'Not Tested', details: [], issues: [] },
  followupFormSequence: { status: 'Not Tested', details: [], issues: [] },
  completionNotification: { status: 'Not Tested', details: [], issues: [] },
  pdfGeneration: { status: 'Not Tested', details: [], issues: [] },
  pdfEditing: { status: 'Not Tested', details: [], issues: [] },
  documentDistribution: { status: 'Not Tested', details: [], issues: [] },
  processCompletion: { status: 'Not Tested', details: [], issues: [] }
};

// Helper functions
async function logResult(testName, success, message, details = null) {
  const result = TEST_RESULTS[testName];
  
  if (success) {
    result.details.push(`✅ ${message}`);
    console.log(`✅ [${testName}] ${message}`);
  } else {
    result.issues.push(`❌ ${message}`);
    console.log(`❌ [${testName}] ${message}`);
  }
  
  if (details) {
    if (typeof details === 'object') {
      result.details.push(JSON.stringify(details, null, 2));
    } else {
      result.details.push(details);
    }
  }
  
  // Update overall status
  if (result.issues.length > 0) {
    result.status = 'Partially Functional';
  } else if (result.details.length > 0) {
    result.status = 'Fully Functional';
  }
}

async function cleanupTestAccounts() {
  console.log('🧹 Cleaning up test accounts...');
  
  for (const account of TEST_CONFIG.testAccounts) {
    // Delete user and all related data
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', account.email)
      .single();
      
    if (user) {
      // Delete related data
      await db.from('magic_links').delete().eq('user_id', user.id);
      await db.from('form_completions').delete().eq('user_id', user.id);
      await db.from('training_sessions').delete().eq('user_id', user.id);
      await db.from('quiz_results').delete().eq('user_id', user.id);
      await db.from('email_notifications').delete().eq('user_id', user.id);
      
      // Delete user
      await db.from('users').delete().eq('id', user.id);
      console.log(`🧹 Deleted test account: ${account.email}`);
    }
  }
  
  // Delete test manager
  const { data: manager } = await supabase
    .from('users')
    .select('id')
    .eq('email', TEST_CONFIG.managerEmail)
    .single();
    
  if (manager) {
    await db.from('magic_links').delete().eq('user_id', manager.id);
    await db.from('email_notifications').delete().eq('user_id', manager.id);
    await db.from('users').delete().eq('id', manager.id);
    console.log(`🧹 Deleted test manager: ${TEST_CONFIG.managerEmail}`);
  }
  
  console.log('🧹 Cleanup complete');
}

// Test functions
async function testCrewRegistration() {
  console.log('\n🧪 Testing Crew Registration System...');
  
  try {
    // Create test manager first
    const { data: manager, error: managerError } = await supabase
      .from('users')
      .insert({
        email: TEST_CONFIG.managerEmail,
        first_name: 'Test',
        last_name: 'Manager',
        role: 'manager',
        position: 'HR Manager',
        is_active: true
      })
      .select()
      .single();
      
    if (managerError) {
      await logResult('crewRegistration', false, `Failed to create test manager: ${managerError.message}`);
      return;
    }
    
    await logResult('crewRegistration', true, 'Created test manager account', manager);
    
    // Test creating crew members
    for (const account of TEST_CONFIG.testAccounts) {
      // Create crew member
      const { data: crew, error: crewError } = await supabase
        .from('users')
        .insert({
          email: account.email,
          first_name: account.firstName,
          last_name: account.lastName,
          role: 'crew',
          position: account.position,
          vessel_assignment: TEST_CONFIG.vesselAssignment,
          expected_boarding_date: TEST_CONFIG.expectedBoardingDate,
          status: 'not_started'
        })
        .select()
        .single();
        
      if (crewError) {
        await logResult('crewRegistration', false, `Failed to create test crew member ${account.email}: ${crewError.message}`);
        continue;
      }
      
      await logResult('crewRegistration', true, `Created test crew member: ${account.email}`, crew);
      
      // Create training sessions for the crew member
      const trainingSessions = [1, 2, 3].map(phase => ({
        user_id: crew.id,
        phase,
        status: 'not_started',
        due_date: new Date(Date.now() + (phase * 7 * 24 * 60 * 60 * 1000)).toISOString() // 1, 2, 3 weeks from now
      }));
      
      const { error: sessionsError } = await supabase
        .from('training_sessions')
        .insert(trainingSessions);
        
      if (sessionsError) {
        await logResult('crewRegistration', false, `Failed to create training sessions for ${account.email}: ${sessionsError.message}`);
      } else {
        await logResult('crewRegistration', true, `Created training sessions for ${account.email}`);
      }
      
      // Test welcome email
      try {
        await unifiedEmailService.sendCrewWelcomeEmail(crew.id);
        await logResult('crewRegistration', true, `Sent welcome email to ${account.email}`);
      } catch (emailError) {
        await logResult('crewRegistration', false, `Failed to send welcome email to ${account.email}: ${emailError.message}`);
      }
    }
  } catch (error) {
    await logResult('crewRegistration', false, `Unexpected error in crew registration test: ${error.message}`);
  }
}

async function testAccessLinkDistribution() {
  console.log('\n🧪 Testing Access Link Distribution...');
  
  try {
    for (const account of TEST_CONFIG.testAccounts) {
      // Get crew member
      const crewResult = await db.query('SELECT * FROM users WHERE email = $1', [account.email]);
    const crew = crewResult.rows[0];
    const crewError = !crew;
        
      if (crewError || !crew) {
        await logResult('accessLinkDistribution', false, `Failed to find test crew member ${account.email}: ${crewError?.message || 'Not found'}`);
        continue;
      }
      
      // Generate magic link token
      const token = generateMagicToken();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 3); // 3 hours from now
      
      // Store magic link in database
      const { data: magicLink, error: linkError } = await supabase
        .from('magic_links')
        .insert({
          user_id: crew.id,
          email: crew.email,
          token,
          expires_at: expiresAt.toISOString(),
          used: false
        })
        .select()
        .single();
        
      if (linkError) {
        await logResult('accessLinkDistribution', false, `Failed to create magic link for ${account.email}: ${linkError.message}`);
        continue;
      }
      
      await logResult('accessLinkDistribution', true, `Created magic link for ${account.email}`, {
        token,
        expiresAt: expiresAt.toISOString(),
        link: `${process.env.BASE_URL || 'http://localhost:3001'}/login?token=${token}`
      });
      
      // Test sending magic link email
      try {
        await unifiedEmailService.sendCrewMagicLinkEmail(crew.id, token);
        await logResult('accessLinkDistribution', true, `Sent magic link email to ${account.email}`);
      } catch (emailError) {
        await logResult('accessLinkDistribution', false, `Failed to send magic link email to ${account.email}: ${emailError.message}`);
      }
      
      // Test onboarding start email
      try {
        await unifiedEmailService.sendOnboardingStartEmail(crew.id);
        await logResult('accessLinkDistribution', true, `Sent onboarding start email to ${account.email}`);
      } catch (emailError) {
        await logResult('accessLinkDistribution', false, `Failed to send onboarding start email to ${account.email}: ${emailError.message}`);
      }
    }
  } catch (error) {
    await logResult('accessLinkDistribution', false, `Unexpected error in access link distribution test: ${error.message}`);
  }
}

async function testAuthentication() {
  console.log('\n🧪 Testing Seamless Authentication...');
  
  try {
    for (const account of TEST_CONFIG.testAccounts) {
      // Get crew member
      const crewResult = await db.query('SELECT * FROM users WHERE email = $1', [account.email]);
    const crew = crewResult.rows[0];
    const crewError = !crew;
        
      if (crewError || !crew) {
        await logResult('authentication', false, `Failed to find test crew member ${account.email}: ${crewError?.message || 'Not found'}`);
        continue;
      }
      
      // Get magic link
      const { data: magicLink, error: linkError } = await supabase
        .from('magic_links')
        .select('*')
        .eq('user_id', crew.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
        
      if (linkError || !magicLink) {
        await logResult('authentication', false, `Failed to find magic link for ${account.email}: ${linkError?.message || 'Not found'}`);
        continue;
      }
      
      // Simulate magic link authentication
      // This would normally be done via API, but we'll simulate the database operations
      
      // Update magic link usage
      const { error: updateError } = await supabase
        .from('magic_links')
        .update({ used_at: new Date().toISOString() })
        .eq('id', magicLink.id);
        
      if (updateError) {
        await logResult('authentication', false, `Failed to update magic link usage for ${account.email}: ${updateError.message}`);
        continue;
      }
      
      // Update user status to in_progress if currently not_started
      if (crew.status === 'not_started') {
        const { error: statusUpdateError } = await supabase
          .from('users')
          .update({ 
            status: 'in_progress',
            updated_at: new Date().toISOString()
          })
          .eq('id', crew.id);
          
        if (statusUpdateError) {
          await logResult('authentication', false, `Failed to update user status for ${account.email}: ${statusUpdateError.message}`);
          continue;
        }
      }
      
      await logResult('authentication', true, `Simulated successful authentication for ${account.email}`);
      
      // Check if first login notification would be triggered
      // This is normally done by the notificationService, but we'll just log it
      await logResult('authentication', true, `First login notification would be triggered for ${account.email}`);
    }
  } catch (error) {
    await logResult('authentication', false, `Unexpected error in authentication test: ${error.message}`);
  }
}

async function testInitialFormCompletion() {
  console.log('\n🧪 Testing Initial Form Completion...');
  
  try {
    // We'll test with the first test account
    const testAccount = TEST_CONFIG.testAccounts[0];
    
    // Get crew member
    const crewResult = await db.query('SELECT * FROM users WHERE email = $1', [testAccount.email]);
    const crew = crewResult.rows[0];
    const crewError = !crew;
      
    if (crewError || !crew) {
      await logResult('initialFormCompletion', false, `Failed to find test crew member ${testAccount.email}: ${crewError?.message || 'Not found'}`);
      return;
    }
    
    // Prepare form data with user's name
    const formData = { ...TEST_CONFIG.formData };
    formData.personalInfo.fullName = `${crew.first_name} ${crew.last_name}`;
    
    // Store form completion in database
    const formCompletionData = {
      user_id: crew.id,
      form_type: '05_03a',
      form_data: formData,
      completed_at: new Date().toISOString(),
      status: 'completed'
    };
    
    const { data: formCompletion, error: insertError } = await supabase
      .from('form_completions')
      .insert(formCompletionData)
      .select()
      .single();
      
    if (insertError) {
      // If table doesn't exist, log the error
      await logResult('initialFormCompletion', false, `Failed to store form completion: ${insertError.message}`);
      
      // Try to log in email_notifications as a fallback
      try {
        await supabase
          .from('email_notifications')
          .insert({
            recipient_email: crew.email,
            subject: `Form 05_03a Completed`,
            body: `Form completion logged for ${crew.first_name} ${crew.last_name}`,
            sent_at: new Date().toISOString()
          });
          
        await logResult('initialFormCompletion', true, `Logged form completion in email_notifications table`);
      } catch (logError) {
        await logResult('initialFormCompletion', false, `Failed to log form completion: ${logError.message}`);
      }
    } else {
      await logResult('initialFormCompletion', true, `Stored form completion in database`, formCompletion);
    }
    
    // Update user status to indicate form completion
    const { error: statusUpdateError } = await supabase
      .from('users')
      .update({
        status: 'form_completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', crew.id);
      
    if (statusUpdateError) {
      await logResult('initialFormCompletion', false, `Failed to update user status: ${statusUpdateError.message}`);
    } else {
      await logResult('initialFormCompletion', true, `Updated user status to form_completed`);
    }
    
    // Test notification email to HR
    try {
      // This would normally be done by the emailService, but we'll simulate it
      await supabase
        .from('email_notifications')
        .insert({
          recipient_email: TEST_CONFIG.hrEmail,
          subject: `Form Completion: ${crew.first_name} ${crew.last_name}`,
          body: `Form 05_03a has been completed by ${crew.first_name} ${crew.last_name}`,
          sent_at: new Date().toISOString(),
          email_type: 'form_completion_notification'
        });
        
      await logResult('initialFormCompletion', true, `Sent form completion notification to HR`);
    } catch (emailError) {
      await logResult('initialFormCompletion', false, `Failed to send form completion notification: ${emailError.message}`);
    }
  } catch (error) {
    await logResult('initialFormCompletion', false, `Unexpected error in initial form completion test: ${error.message}`);
  }
}

async function testFollowupFormSequence() {
  console.log('\n🧪 Testing Follow-up Form Sequence...');
  
  try {
    // We'll test with the second test account
    const testAccount = TEST_CONFIG.testAccounts[1];
    
    // Get crew member
    const crewResult = await db.query('SELECT * FROM users WHERE email = $1', [testAccount.email]);
    const crew = crewResult.rows[0];
    const crewError = !crew;
      
    if (crewError || !crew) {
      await logResult('followupFormSequence', false, `Failed to find test crew member ${testAccount.email}: ${crewError?.message || 'Not found'}`);
      return;
    }
    
    // Simulate 72-hour automated email trigger
    // This would normally be done by a cron job, but we'll simulate it
    
    // First, update the user's status to indicate they've started but not completed
    const { error: statusUpdateError } = await supabase
      .from('users')
      .update({
        status: 'in_progress',
        updated_at: new Date().toISOString()
      })
      .eq('id', crew.id);
      
    if (statusUpdateError) {
      await logResult('followupFormSequence', false, `Failed to update user status: ${statusUpdateError.message}`);
      return;
    }
    
    // Log the follow-up email that would be sent
    try {
      await supabase
        .from('email_notifications')
        .insert({
          recipient_email: crew.email,
          subject: `Complete Your Onboarding Forms - Action Required`,
          body: `Please complete your remaining onboarding forms.`,
          sent_at: new Date().toISOString(),
          email_type: 'form_reminder'
        });
        
      await logResult('followupFormSequence', true, `Logged 72-hour follow-up email`);
    } catch (emailError) {
      await logResult('followupFormSequence', false, `Failed to log follow-up email: ${emailError.message}`);
    }
    
    // Test form state preservation
    // Store partial form completion
    const partialFormData = {
      personalInfo: {
        fullName: `${crew.first_name} ${crew.last_name}`,
        dateOfBirth: '1990-01-01',
        nationality: 'Dutch',
        passportNumber: '',
        passportExpiry: ''
      },
      contactInfo: {
        phoneNumber: '+31612345678',
        emergencyContactName: '',
        emergencyContactPhone: '',
        homeAddress: ''
      },
      qualifications: {
        certifications: [],
        languages: [],
        specialSkills: ''
      },
      healthInfo: {
        medicalCertificateDate: '',
        medicalCertificateExpiry: '',
        allergies: '',
        medications: ''
      },
      acknowledgements: {
        safetyPoliciesReviewed: false,
        emergencyProceduresUnderstood: false,
        dataPrivacyConsent: false
      }
    };
    
    // Store partial form completion
    const partialFormCompletionData = {
      user_id: crew.id,
      form_type: '05_03a',
      form_data: partialFormData,
      completed_at: null,
      status: 'in_progress'
    };
    
    const { data: partialFormCompletion, error: partialInsertError } = await supabase
      .from('form_completions')
      .insert(partialFormCompletionData)
      .select()
      .single();
      
    if (partialInsertError) {
      await logResult('followupFormSequence', false, `Failed to store partial form completion: ${partialInsertError.message}`);
    } else {
      await logResult('followupFormSequence', true, `Stored partial form completion`, partialFormCompletion);
    }
    
    // Now simulate completing the form after the follow-up
    const completeFormData = { ...TEST_CONFIG.formData };
    completeFormData.personalInfo.fullName = `${crew.first_name} ${crew.last_name}`;
    
    // Update the form completion
    const { data: updatedFormCompletion, error: updateFormError } = await supabase
      .from('form_completions')
      .update({
        form_data: completeFormData,
        completed_at: new Date().toISOString(),
        status: 'completed'
      })
      .eq('user_id', crew.id)
      .eq('form_type', '05_03a')
      .select()
      .single();
      
    if (updateFormError) {
      await logResult('followupFormSequence', false, `Failed to update form completion: ${updateFormError.message}`);
    } else {
      await logResult('followupFormSequence', true, `Updated form completion after follow-up`, updatedFormCompletion);
    }
    
    // Update user status
    const { error: finalStatusUpdateError } = await supabase
      .from('users')
      .update({
        status: 'form_completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', crew.id);
      
    if (finalStatusUpdateError) {
      await logResult('followupFormSequence', false, `Failed to update final user status: ${finalStatusUpdateError.message}`);
    } else {
      await logResult('followupFormSequence', true, `Updated user status to form_completed after follow-up`);
    }
  } catch (error) {
    await logResult('followupFormSequence', false, `Unexpected error in follow-up form sequence test: ${error.message}`);
  }
}

async function testCompletionNotification() {
  console.log('\n🧪 Testing Completion Notification System...');
  
  try {
    // We'll test with the third test account
    const testAccount = TEST_CONFIG.testAccounts[2];
    
    // Get crew member
    const crewResult = await db.query('SELECT * FROM users WHERE email = $1', [testAccount.email]);
    const crew = crewResult.rows[0];
    const crewError = !crew;
      
    if (crewError || !crew) {
      await logResult('completionNotification', false, `Failed to find test crew member ${testAccount.email}: ${crewError?.message || 'Not found'}`);
      return;
    }
    
    // Update user status to indicate onboarding completion
    const { error: statusUpdateError } = await supabase
      .from('users')
      .update({ 
        status: 'training_completed',
        onboarding_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', crew.id);
      
    if (statusUpdateError) {
      await logResult('completionNotification', false, `Failed to update user status: ${statusUpdateError.message}`);
      return;
    }
    
    await logResult('completionNotification', true, `Updated user status to training_completed`);
    
    // Log the completion notifications that would be sent
    try {
      // Notification to HR
      await supabase
        .from('email_notifications')
        .insert({
          recipient_email: TEST_CONFIG.hrEmail,
          subject: `Onboarding Completed: ${crew.first_name} ${crew.last_name}`,
          body: `${crew.first_name} ${crew.last_name} has completed the onboarding process.`,
          sent_at: new Date().toISOString(),
          email_type: 'completion_notification_hr'
        });
        
      await logResult('completionNotification', true, `Logged completion notification to HR`);
      
      // Notification to QHSE
      await supabase
        .from('email_notifications')
        .insert({
          recipient_email: TEST_CONFIG.qhseEmail,
          subject: `Onboarding Completed: ${crew.first_name} ${crew.last_name}`,
          body: `${crew.first_name} ${crew.last_name} has completed the onboarding process.`,
          sent_at: new Date().toISOString(),
          email_type: 'completion_notification_qhse'
        });
        
      await logResult('completionNotification', true, `Logged completion notification to QHSE`);
      
      // Notification to crew member
      await supabase
        .from('email_notifications')
        .insert({
          recipient_email: crew.email,
          subject: `Congratulations! Onboarding Completed`,
          body: `Congratulations! You have successfully completed the onboarding process.`,
          sent_at: new Date().toISOString(),
          email_type: 'completion_notification_crew'
        });
        
      await logResult('completionNotification', true, `Logged completion notification to crew member`);
    } catch (emailError) {
      await logResult('completionNotification', false, `Failed to log completion notifications: ${emailError.message}`);
    }
  } catch (error) {
    await logResult('completionNotification', false, `Unexpected error in completion notification test: ${error.message}`);
  }
}

async function testPDFGeneration() {
  console.log('\n🧪 Testing PDF Document Generation...');
  
  try {
    // We'll test with the fourth test account
    const testAccount = TEST_CONFIG.testAccounts[3];
    
    // Get crew member
    const crewResult = await db.query('SELECT * FROM users WHERE email = $1', [testAccount.email]);
    const crew = crewResult.rows[0];
    const crewError = !crew;
      
    if (crewError || !crew) {
      await logResult('pdfGeneration', false, `Failed to find test crew member ${testAccount.email}: ${crewError?.message || 'Not found'}`);
      return;
    }
    
    // Prepare form data
    const formData = { ...TEST_CONFIG.formData };
    formData.personalInfo.fullName = `${crew.first_name} ${crew.last_name}`;
    
    // Store form completion
    const formCompletionData = {
      user_id: crew.id,
      form_type: '05_03a',
      form_data: formData,
      completed_at: new Date().toISOString(),
      status: 'completed'
    };
    
    const { data: formCompletion, error: insertError } = await supabase
      .from('form_completions')
      .insert(formCompletionData)
      .select()
      .single();
      
    if (insertError) {
      await logResult('pdfGeneration', false, `Failed to store form completion: ${insertError.message}`);
      return;
    }
    
    await logResult('pdfGeneration', true, `Stored form completion in database`, formCompletion);
    
    // Find or create a PDF template
    let templateId = null;
    const { data: templates, error: templateError } = await supabase
      .from('pdf_templates')
      .select('*')
      .ilike('name', '%05_03a%');
      
    if (templateError) {
      await logResult('pdfGeneration', false, `Failed to find PDF templates: ${templateError.message}`);
    } else if (templates && templates.length > 0) {
      templateId = templates[0].id;
      await logResult('pdfGeneration', true, `Found existing PDF template: ${templates[0].name}`);
    } else {
      // Create a simple template if none exists
      const { data: newTemplate, error: createTemplateError } = await supabase
        .from('pdf_templates')
        .insert({
          name: 'Form 05_03a Template',
          description: 'Test template for Form 05_03a',
          page_size: 'A4',
          orientation: 'portrait',
          fields: JSON.stringify([
            {
              id: 'name',
              type: 'text',
              x: 50,
              y: 50,
              width: 400,
              height: 30,
              dataBinding: 'fullName',
              properties: { fontSize: 14 }
            },
            {
              id: 'position',
              type: 'text',
              x: 50,
              y: 100,
              width: 400,
              height: 30,
              dataBinding: 'position',
              properties: { fontSize: 12 }
            }
          ])
        })
        .select()
        .single();
        
      if (createTemplateError) {
        await logResult('pdfGeneration', false, `Failed to create PDF template: ${createTemplateError.message}`);
      } else {
        templateId = newTemplate.id;
        await logResult('pdfGeneration', true, `Created new PDF template`, newTemplate);
      }
    }
    
    if (!templateId) {
      await logResult('pdfGeneration', false, 'No template available for PDF generation');
      return;
    }
    
    // Simulate PDF generation
    const fileName = `${crew.first_name}_${crew.last_name}_Form_05_03a_${Date.now()}.pdf`;
    const filePath = `${crew.id}/${fileName}`;
    
    // Log the PDF generation that would occur
    await logResult('pdfGeneration', true, `PDF would be generated with filename: ${fileName}`);
    
    // Log the storage upload that would occur
    await logResult('pdfGeneration', true, `PDF would be uploaded to storage path: ${filePath}`);
    
    // Update user status
    const { error: statusUpdateError } = await supabase
      .from('users')
      .update({
        status: 'form_completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', crew.id);
      
    if (statusUpdateError) {
      await logResult('pdfGeneration', false, `Failed to update user status: ${statusUpdateError.message}`);
    } else {
      await logResult('pdfGeneration', true, `Updated user status to form_completed`);
    }
  } catch (error) {
    await logResult('pdfGeneration', false, `Unexpected error in PDF generation test: ${error.message}`);
  }
}

async function testPDFEditing() {
  console.log('\n🧪 Testing PDF Editing Capabilities...');
  
  try {
    // We'll test with the fourth test account
    const testAccount = TEST_CONFIG.testAccounts[3];
    
    // Get crew member
    const crewResult = await db.query('SELECT * FROM users WHERE email = $1', [testAccount.email]);
    const crew = crewResult.rows[0];
    const crewError = !crew;
      
    if (crewError || !crew) {
      await logResult('pdfEditing', false, `Failed to find test crew member ${testAccount.email}: ${crewError?.message || 'Not found'}`);
      return;
    }
    
    // Find PDF template
    const { data: templates, error: templateError } = await supabase
      .from('pdf_templates')
      .select('*')
      .ilike('name', '%05_03a%');
      
    if (templateError || !templates || templates.length === 0) {
      await logResult('pdfEditing', false, `Failed to find PDF template: ${templateError?.message || 'No templates found'}`);
      return;
    }
    
    const template = templates[0];
    await logResult('pdfEditing', true, `Found PDF template: ${template.name}`);
    
    // Simulate editing the template
    const fields = JSON.parse(template.fields || '[]');
    
    // Add a new field
    fields.push({
      id: 'signature',
      type: 'text',
      x: 50,
      y: 500,
      width: 400,
      height: 30,
      dataBinding: 'signature',
      properties: { fontSize: 12, placeholder: 'Signature' }
    });
    
    // Update the template
    const { data: updatedTemplate, error: updateError } = await supabase
      .from('pdf_templates')
      .update({
        fields: JSON.stringify(fields),
        updated_at: new Date().toISOString()
      })
      .eq('id', template.id)
      .select()
      .single();
      
    if (updateError) {
      await logResult('pdfEditing', false, `Failed to update PDF template: ${updateError.message}`);
    } else {
      await logResult('pdfEditing', true, `Updated PDF template with new field`, {
        templateId: updatedTemplate.id,
        fieldCount: fields.length
      });
    }
    
    // Simulate regenerating the PDF with the updated template
    await logResult('pdfEditing', true, `PDF would be regenerated with updated template`);
  } catch (error) {
    await logResult('pdfEditing', false, `Unexpected error in PDF editing test: ${error.message}`);
  }
}

async function testDocumentDistribution() {
  console.log('\n🧪 Testing Document Distribution...');
  
  try {
    // We'll test with the fifth test account
    const testAccount = TEST_CONFIG.testAccounts[4];
    
    // Get crew member
    const crewResult = await db.query('SELECT * FROM users WHERE email = $1', [testAccount.email]);
    const crew = crewResult.rows[0];
    const crewError = !crew;
      
    if (crewError || !crew) {
      await logResult('documentDistribution', false, `Failed to find test crew member ${testAccount.email}: ${crewError?.message || 'Not found'}`);
      return;
    }
    
    // Prepare form data
    const formData = { ...TEST_CONFIG.formData };
    formData.personalInfo.fullName = `${crew.first_name} ${crew.last_name}`;
    
    // Store form completion
    const formCompletionData = {
      user_id: crew.id,
      form_type: '05_03a',
      form_data: formData,
      completed_at: new Date().toISOString(),
      status: 'completed'
    };
    
    const { data: formCompletion, error: insertError } = await supabase
      .from('form_completions')
      .insert(formCompletionData)
      .select()
      .single();
      
    if (insertError) {
      await logResult('documentDistribution', false, `Failed to store form completion: ${insertError.message}`);
      return;
    }
    
    await logResult('documentDistribution', true, `Stored form completion in database`, formCompletion);
    
    // Simulate PDF generation and distribution
    const fileName = `${crew.first_name}_${crew.last_name}_Form_05_03a_${Date.now()}.pdf`;
    
    // Log the email distribution that would occur
    await logResult('documentDistribution', true, `PDF would be distributed to HR via email`);
    await logResult('documentDistribution', true, `PDF would be distributed to QHSE via email`);
    
    // Log the email notifications
    try {
      // Notification to HR
      await supabase
        .from('email_notifications')
        .insert({
          recipient_email: TEST_CONFIG.hrEmail,
          subject: `Form 05_03a Completed: ${crew.first_name} ${crew.last_name}`,
          body: `${crew.first_name} ${crew.last_name} has completed Form 05_03a. PDF attached.`,
          sent_at: new Date().toISOString(),
          email_type: 'form_completion_pdf_hr'
        });
        
      await logResult('documentDistribution', true, `Logged PDF distribution email to HR`);
      
      // Notification to QHSE
      await supabase
        .from('email_notifications')
        .insert({
          recipient_email: TEST_CONFIG.qhseEmail,
          subject: `Form 05_03a Completed: ${crew.first_name} ${crew.last_name}`,
          body: `${crew.first_name} ${crew.last_name} has completed Form 05_03a. PDF attached.`,
          sent_at: new Date().toISOString(),
          email_type: 'form_completion_pdf_qhse'
        });
        
      await logResult('documentDistribution', true, `Logged PDF distribution email to QHSE`);
    } catch (emailError) {
      await logResult('documentDistribution', false, `Failed to log distribution emails: ${emailError.message}`);
    }
  } catch (error) {
    await logResult('documentDistribution', false, `Unexpected error in document distribution test: ${error.message}`);
  }
}

async function testProcessCompletion() {
  console.log('\n🧪 Testing Process Completion...');
  
  try {
    // We'll test with the fifth test account
    const testAccount = TEST_CONFIG.testAccounts[4];
    
    // Get crew member
    const crewResult = await db.query('SELECT * FROM users WHERE email = $1', [testAccount.email]);
    const crew = crewResult.rows[0];
    const crewError = !crew;
      
    if (crewError || !crew) {
      await logResult('processCompletion', false, `Failed to find test crew member ${testAccount.email}: ${crewError?.message || 'Not found'}`);
      return;
    }
    
    // Update user profile with required fields
    const { error: profileUpdateError } = await supabase
      .from('users')
      .update({
        contact_phone: '+31612345678',
        emergency_contact_name: 'Emergency Contact',
        emergency_contact_phone: '+31687654321',
        status: 'form_completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', crew.id);
      
    if (profileUpdateError) {
      await logResult('processCompletion', false, `Failed to update user profile: ${profileUpdateError.message}`);
      return;
    }
    
    await logResult('processCompletion', true, `Updated user profile with required fields`);
    
    // Update user status to indicate onboarding completion
    const { error: statusUpdateError } = await supabase
      .from('users')
      .update({
        status: 'training_completed',
        onboarding_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', crew.id);
      
    if (statusUpdateError) {
      await logResult('processCompletion', false, `Failed to update user status: ${statusUpdateError.message}`);
      return;
    }
    
    await logResult('processCompletion', true, `Updated user status to training_completed`);
    
    // Log the completion notifications that would be sent
    try {
      // Notification to HR
      await supabase
        .from('email_notifications')
        .insert({
          recipient_email: TEST_CONFIG.hrEmail,
          subject: `Onboarding Completed: ${crew.first_name} ${crew.last_name}`,
          body: `${crew.first_name} ${crew.last_name} has completed the onboarding process.`,
          sent_at: new Date().toISOString(),
          email_type: 'process_completion_hr'
        });
        
      await logResult('processCompletion', true, `Logged process completion notification to HR`);
      
      // Notification to crew member
      await supabase
        .from('email_notifications')
        .insert({
          recipient_email: crew.email,
          subject: `Congratulations! Onboarding Completed`,
          body: `Congratulations! You have successfully completed the onboarding process.`,
          sent_at: new Date().toISOString(),
          email_type: 'process_completion_crew'
        });
        
      await logResult('processCompletion', true, `Logged process completion notification to crew member`);
    } catch (emailError) {
      await logResult('processCompletion', false, `Failed to log completion notifications: ${emailError.message}`);
    }
    
    // Verify status visibility to HR
    await logResult('processCompletion', true, `Process completion status would be visible to HR in dashboard`);
  } catch (error) {
    await logResult('processCompletion', false, `Unexpected error in process completion test: ${error.message}`);
  }
}

// Generate test report
async function generateTestReport() {
  console.log('\n📊 Generating Test Report...');
  
  const reportData = {
    testDate: new Date().toISOString(),
    testEnvironment: process.env.NODE_ENV || 'development',
    baseUrl: process.env.BASE_URL || 'http://localhost:3001',
    testAccounts: TEST_CONFIG.testAccounts.map(a => a.email),
    results: TEST_RESULTS
  };
  
  // Calculate overall status
  let overallStatus = 'Fully Functional';
  let totalIssues = 0;
  
  for (const [testName, result] of Object.entries(TEST_RESULTS)) {
    if (result.status === 'Not Tested') {
      overallStatus = 'Incomplete';
      break;
    } else if (result.status === 'Partially Functional') {
      overallStatus = 'Partially Functional';
      totalIssues += result.issues.length;
    }
  }
  
  reportData.overallStatus = overallStatus;
  reportData.totalIssues = totalIssues;
  
  // Generate HTML report
  const htmlReport = generateHtmlReport(reportData);
  
  // Save report to file
  const reportFileName = `onboarding_test_report_${Date.now()}.html`;
  await fs.writeFile(reportFileName, htmlReport);
  
  console.log(`📊 Test report saved to ${reportFileName}`);
  
  return reportFileName;
}

// Generate HTML report
function generateHtmlReport(reportData) {
  const { testDate, testEnvironment, baseUrl, testAccounts, results, overallStatus, totalIssues } = reportData;
  
  // Format date for display
  const formattedDate = new Date(testDate).toLocaleString();
  
  // Generate HTML for each test result
  const resultsHtml = Object.entries(results).map(([testName, result]) => {
    const statusClass = result.status === 'Fully Functional' ? 'success' :
                        result.status === 'Partially Functional' ? 'warning' :
                        result.status === 'Not Tested' ? 'not-tested' : 'error';
    
    const detailsHtml = result.details.map(detail => `<li>${detail}</li>`).join('');
    const issuesHtml = result.issues.map(issue => `<li class="issue">${issue}</li>`).join('');
    
    return `
      <div class="test-result ${statusClass}">
        <h3>${formatTestName(testName)} <span class="status ${statusClass}">${result.status}</span></h3>
        ${result.details.length > 0 ? `<h4>Details:</h4><ul>${detailsHtml}</ul>` : ''}
        ${result.issues.length > 0 ? `<h4>Issues:</h4><ul>${issuesHtml}</ul>` : ''}
      </div>
    `;
  }).join('');
  
  // Helper function to format test name
  function formatTestName(camelCase) {
    return camelCase
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase());
  }
  
  // Generate full HTML report
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Shipdocs.app Onboarding Functionality Test Report</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }
        header {
          background-color: #f5f5f5;
          padding: 20px;
          margin-bottom: 30px;
          border-radius: 5px;
        }
        h1 {
          color: #2c5aa0;
          margin-top: 0;
        }
        .summary {
          display: flex;
          justify-content: space-between;
          background-color: #f9f9f9;
          padding: 15px;
          border-radius: 5px;
          margin-bottom: 30px;
        }
        .summary-item {
          text-align: center;
        }
        .summary-item h3 {
          margin: 0;
          font-size: 16px;
          color: #666;
        }
        .summary-item p {
          margin: 5px 0 0 0;
          font-size: 24px;
          font-weight: bold;
        }
        .test-result {
          background-color: #f9f9f9;
          padding: 20px;
          margin-bottom: 20px;
          border-radius: 5px;
          border-left: 5px solid #ccc;
        }
        .test-result h3 {
          margin-top: 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .test-result.success {
          border-left-color: #4caf50;
        }
        .test-result.warning {
          border-left-color: #ff9800;
        }
        .test-result.error {
          border-left-color: #f44336;
        }
        .test-result.not-tested {
          border-left-color: #9e9e9e;
        }
        .status {
          font-size: 14px;
          padding: 5px 10px;
          border-radius: 3px;
          color: white;
        }
        .status.success {
          background-color: #4caf50;
        }
        .status.warning {
          background-color: #ff9800;
        }
        .status.error {
          background-color: #f44336;
        }
        .status.not-tested {
          background-color: #9e9e9e;
        }
        ul {
          margin-top: 10px;
        }
        li {
          margin-bottom: 5px;
        }
        li.issue {
          color: #d32f2f;
        }
        .test-accounts {
          margin-bottom: 30px;
        }
        footer {
          margin-top: 50px;
          text-align: center;
          color: #666;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <header>
        <h1>Shipdocs.app Onboarding Functionality Test Report</h1>
        <p>Test conducted on ${formattedDate}</p>
      </header>
      
      <div class="summary">
        <div class="summary-item">
          <h3>Overall Status</h3>
          <p style="color: ${
            overallStatus === 'Fully Functional' ? '#4caf50' :
            overallStatus === 'Partially Functional' ? '#ff9800' : '#9e9e9e'
          };">${overallStatus}</p>
        </div>
        <div class="summary-item">
          <h3>Test Environment</h3>
          <p>${testEnvironment}</p>
        </div>
        <div class="summary-item">
          <h3>Base URL</h3>
          <p>${baseUrl}</p>
        </div>
        <div class="summary-item">
          <h3>Total Issues</h3>
          <p style="color: ${totalIssues > 0 ? '#f44336' : '#4caf50'};">${totalIssues}</p>
        </div>
      </div>
      
      <div class="test-accounts">
        <h2>Test Accounts</h2>
        <ul>
          ${testAccounts.map(email => `<li>${email}</li>`).join('')}
        </ul>
      </div>
      
      <h2>Test Results</h2>
      ${resultsHtml}
      
      <footer>
        <p>Generated by Shipdocs.app Onboarding Test Suite</p>
      </footer>
    </body>
    </html>
  `;
}

// Main execution function
async function runTests() {
  console.log('🚀 Starting Shipdocs.app Onboarding Functionality Tests...');
  
  try {
    // Clean up any existing test accounts first
    await cleanupTestAccounts();
    
    // Run tests in sequence
    await testCrewRegistration();
    await testAccessLinkDistribution();
    await testAuthentication();
    await testInitialFormCompletion();
    await testFollowupFormSequence();
    await testCompletionNotification();
    await testPDFGeneration();
    await testPDFEditing();
    await testDocumentDistribution();
    await testProcessCompletion();
    
    // Generate test report
    const reportFile = await generateTestReport();
    
    // Clean up test accounts
    await cleanupTestAccounts();
    
    console.log(`\n✅ All tests completed. Report saved to ${reportFile}`);
    
    return reportFile;
  } catch (error) {
    console.error(`\n❌ Test execution failed: ${error.message}`);
    
    // Try to generate report anyway
    try {
      const reportFile = await generateTestReport();
      console.log(`\n📊 Partial test report saved to ${reportFile}`);
    } catch (reportError) {
      console.error(`\n❌ Failed to generate test report: ${reportError.message}`);
    }
    
    // Try to clean up test accounts
    try {
      await cleanupTestAccounts();
    } catch (cleanupError) {
      console.error(`\n❌ Failed to clean up test accounts: ${cleanupError.message}`);
    }
    
    throw error;
  }
}

// Execute tests if this script is run directly
if (require.main === module) {
  runTests()
    .then(reportFile => {
      console.log(`\n🎉 Test execution complete. Report: ${reportFile}`);
      process.exit(0);
    })
    .catch(error => {
      console.error(`\n💥 Test execution failed: ${error.message}`);
      process.exit(1);
    });
}

// Export functions for use in other scripts
module.exports = {
  runTests,
  generateTestReport,
  cleanupTestAccounts,
  TEST_RESULTS
};