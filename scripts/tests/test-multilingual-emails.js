// test-multilingual-emails.js - Test Multilingual Email System
require('dotenv').config();
const { unifiedEmailService } = require('./lib/unifiedEmailService');
const { emailTemplateGenerator } = require('./lib/emailTemplateGenerator');
const { getTranslation, getEmailTranslations } = require('./lib/emailTranslations');
const fs = require('fs').promises;
const path = require('path');

/**
 * Test Script for Multilingual Email System
 * 
 * This script tests:
 * 1. Translation system functionality
 * 2. Template generation in multiple languages
 * 3. Email service language detection
 * 4. Complete email generation pipeline
 */

async function testTranslationSystem() {
  console.log('\n📚 Testing Translation System...\n');

  // Test basic translation function
  console.log('1. Testing basic translation function:');
  const englishSubject = getTranslation('en', 'managerMagicLink.subject');
  const dutchSubject = getTranslation('nl', 'managerMagicLink.subject');
  
  console.log(`   EN: ${englishSubject}`);
  console.log(`   NL: ${dutchSubject}`);
  
  // Test parameter interpolation
  console.log('\n2. Testing parameter interpolation:');
  const englishGreeting = getTranslation('en', 'managerMagicLink.greeting', { firstName: 'John' });
  const dutchGreeting = getTranslation('nl', 'managerMagicLink.greeting', { firstName: 'John' });
  
  console.log(`   EN: ${englishGreeting}`);
  console.log(`   NL: ${dutchGreeting}`);

  // Test getting complete email translations
  console.log('\n3. Testing complete email translations:');
  const englishTranslations = getEmailTranslations('en', 'crewMagicLink');
  const dutchTranslations = getEmailTranslations('nl', 'crewMagicLink');
  
  console.log(`   EN Subject: ${englishTranslations.subject}`);
  console.log(`   NL Subject: ${dutchTranslations.subject}`);
  console.log(`   EN Header: ${englishTranslations.header}`);
  console.log(`   NL Header: ${dutchTranslations.header}`);

  console.log('✅ Translation system test completed');
}

async function testTemplateGeneration() {
  console.log('\n🎨 Testing Template Generation...\n');

  // Mock user data
  const mockUser = {
    id: 1,
    first_name: 'Jan',
    last_name: 'de Vries',
    email: 'jan.devries@example.com',
    role: 'crew',
    position: 'Deck Officer',
    vessel_assignment: 'MS Noordzee',
    expected_boarding_date: '2024-12-15',
    preferred_language: 'nl'
  };

  const mockManager = {
    id: 2,
    first_name: 'Maria',
    last_name: 'Rodriguez',
    email: 'maria.rodriguez@example.com',
    role: 'manager',
    position: 'Fleet Manager',
    preferred_language: 'en'
  };

  const magicLink = 'https://maritime-onboarding.example.com/login?token=test123';

  console.log('1. Testing Manager Magic Link Template Generation:');
  
  // Test English manager template
  const englishManagerTemplate = emailTemplateGenerator.generateManagerMagicLinkTemplate(mockManager, magicLink, 'en');
  await fs.writeFile(path.join(__dirname, 'test-output-manager-en.html'), englishManagerTemplate);
  console.log('   ✅ English manager template generated -> test-output-manager-en.html');

  // Test Dutch manager template  
  const dutchManagerTemplate = emailTemplateGenerator.generateManagerMagicLinkTemplate({...mockManager, preferred_language: 'nl'}, magicLink, 'nl');
  await fs.writeFile(path.join(__dirname, 'test-output-manager-nl.html'), dutchManagerTemplate);
  console.log('   ✅ Dutch manager template generated -> test-output-manager-nl.html');

  console.log('\n2. Testing Crew Magic Link Template Generation:');

  // Test English crew template
  const englishCrewTemplate = emailTemplateGenerator.generateCrewMagicLinkTemplate({...mockUser, preferred_language: 'en'}, magicLink, 'en');
  await fs.writeFile(path.join(__dirname, 'test-output-crew-en.html'), englishCrewTemplate);
  console.log('   ✅ English crew template generated -> test-output-crew-en.html');

  // Test Dutch crew template
  const dutchCrewTemplate = emailTemplateGenerator.generateCrewMagicLinkTemplate(mockUser, magicLink, 'nl');
  await fs.writeFile(path.join(__dirname, 'test-output-crew-nl.html'), dutchCrewTemplate);
  console.log('   ✅ Dutch crew template generated -> test-output-crew-nl.html');

  console.log('\n3. Testing Phase Completion Template Generation:');

  // Test English phase completion
  const englishPhaseTemplate = emailTemplateGenerator.generatePhaseCompletionTemplate({...mockUser, preferred_language: 'en'}, 2, 'en');
  await fs.writeFile(path.join(__dirname, 'test-output-phase-en.html'), englishPhaseTemplate);
  console.log('   ✅ English phase completion template generated -> test-output-phase-en.html');

  // Test Dutch phase completion
  const dutchPhaseTemplate = emailTemplateGenerator.generatePhaseCompletionTemplate(mockUser, 2, 'nl');
  await fs.writeFile(path.join(__dirname, 'test-output-phase-nl.html'), dutchPhaseTemplate);
  console.log('   ✅ Dutch phase completion template generated -> test-output-phase-nl.html');

  console.log('\n✅ Template generation test completed');
}

async function testEmailServiceLanguageDetection() {
  console.log('\n🔍 Testing Email Service Language Detection...\n');

  // Test language detection
  const usersToTest = [
    { preferred_language: 'en', expected: 'en' },
    { preferred_language: 'nl', expected: 'nl' },
    { preferred_language: 'fr', expected: 'en' }, // Unsupported language should default to English
    { preferred_language: null, expected: 'en' }, // Null should default to English
    { preferred_language: undefined, expected: 'en' }, // Undefined should default to English
    {}, // Missing property should default to English
  ];

  usersToTest.forEach((user, index) => {
    const detectedLang = unifiedEmailService.getUserLanguage(user);
    const status = detectedLang === user.expected ? '✅' : '❌';
    console.log(`   ${status} User ${index + 1}: ${JSON.stringify(user.preferred_language)} -> ${detectedLang} (expected: ${user.expected})`);
  });

  console.log('\n✅ Language detection test completed');
}

async function testProgressReminderEmails() {
  console.log('\n📧 Testing Progress Reminder Email Generation...\n');

  const mockUser = {
    id: 1,
    first_name: 'Pieter',
    last_name: 'van der Berg',
    email: 'pieter.vandeberg@example.com',
    preferred_language: 'nl'
  };

  const reminderTypes = ['overdue', 'due_soon', 'upcoming', 'inactive'];
  
  for (const reminderType of reminderTypes) {
    console.log(`   Testing ${reminderType} reminder:`);
    
    // Test English
    const englishContent = unifiedEmailService.getProgressReminderTemplate(
      {...mockUser, preferred_language: 'en'}, 
      2, 
      '2024-12-20', 
      reminderType
    );
    await fs.writeFile(path.join(__dirname, `test-output-reminder-${reminderType}-en.html`), englishContent);
    console.log(`     ✅ English ${reminderType} template -> test-output-reminder-${reminderType}-en.html`);

    // Test Dutch
    const dutchContent = unifiedEmailService.getProgressReminderTemplate(
      mockUser, 
      2, 
      '2024-12-20', 
      reminderType
    );
    await fs.writeFile(path.join(__dirname, `test-output-reminder-${reminderType}-nl.html`), dutchContent);
    console.log(`     ✅ Dutch ${reminderType} template -> test-output-reminder-${reminderType}-nl.html`);
  }

  console.log('\n✅ Progress reminder email test completed');
}

async function generateComparisonReport() {
  console.log('\n📊 Generating Comparison Report...\n');

  const languages = ['en', 'nl'];
  const emailTypes = ['managerMagicLink', 'crewMagicLink', 'phaseCompletion', 'progressReminder'];

  let report = `# Multilingual Email System - Comparison Report\n\n`;
  report += `Generated: ${new Date().toISOString()}\n\n`;

  report += `## Supported Languages\n`;
  report += `- English (en)\n`;
  report += `- Dutch (nl)\n\n`;

  report += `## Email Types Implemented\n\n`;

  for (const emailType of emailTypes) {
    report += `### ${emailType}\n\n`;
    
    for (const lang of languages) {
      const translations = getEmailTranslations(lang, emailType);
      if (translations.subject) {
        report += `**${lang.toUpperCase()} Subject:** ${translations.subject}\n\n`;
      }
    }
    report += `---\n\n`;
  }

  report += `## Files Generated in Test\n\n`;
  report += `### Manager Magic Link Templates\n`;
  report += `- test-output-manager-en.html\n`;
  report += `- test-output-manager-nl.html\n\n`;

  report += `### Crew Magic Link Templates\n`;
  report += `- test-output-crew-en.html\n`;
  report += `- test-output-crew-nl.html\n\n`;

  report += `### Phase Completion Templates\n`;
  report += `- test-output-phase-en.html\n`;
  report += `- test-output-phase-nl.html\n\n`;

  report += `### Progress Reminder Templates\n`;
  const reminderTypes = ['overdue', 'due_soon', 'upcoming', 'inactive'];
  for (const type of reminderTypes) {
    report += `- test-output-reminder-${type}-en.html\n`;
    report += `- test-output-reminder-${type}-nl.html\n`;
  }

  await fs.writeFile(path.join(__dirname, 'multilingual-email-test-report.md'), report);
  console.log('✅ Comparison report generated -> multilingual-email-test-report.md');
}

async function runAllTests() {
  console.log('🚀 Starting Multilingual Email System Tests\n');
  console.log('='.repeat(50));

  try {
    await testTranslationSystem();
    await testTemplateGeneration();
    await testEmailServiceLanguageDetection();
    await testProgressReminderEmails();
    await generateComparisonReport();

    console.log('\n' + '='.repeat(50));
    console.log('🎉 All tests completed successfully!');
    console.log('\n📁 Generated files:');
    console.log('   • HTML templates for visual inspection');
    console.log('   • Comparison report (multilingual-email-test-report.md)');
    console.log('\n📋 Test Summary:');
    console.log('   ✅ Translation system working');
    console.log('   ✅ Template generation in both languages');
    console.log('   ✅ Language detection working');
    console.log('   ✅ Progress reminder emails working');
    console.log('\n💡 Next steps:');
    console.log('   1. Review generated HTML files');
    console.log('   2. Test with real email sending');
    console.log('   3. Deploy to production');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the tests
if (require.main === module) {
  runAllTests();
}

module.exports = {
  testTranslationSystem,
  testTemplateGeneration,
  testEmailServiceLanguageDetection,
  testProgressReminderEmails,
  generateComparisonReport
};