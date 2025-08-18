// Test translation loading for flows namespace
const i18n = require('./client/src/i18n.js').default;

async function testFlowsTranslations() {
  console.log('🌍 Testing Flows Translations');
  console.log('=' .repeat(40));

  // Wait for i18n to initialize
  await new Promise(resolve => {
    if (i18n.isInitialized) {
      resolve();
    } else {
      i18n.on('initialized', resolve);
    }
  });

  console.log('Current language:', i18n.language);
  console.log('Available namespaces:', i18n.options.ns);
  
  // Test key translations
  const testKeys = [
    'title',
    'description',
    'create_new',
    'edit_workflow',
    'wizard.title',
    'wizard.step1',
    'onboarding',
    'training'
  ];

  console.log('\nTesting English translations:');
  i18n.changeLanguage('en');
  
  for (const key of testKeys) {
    const translation = i18n.t(key, { ns: 'flows' });
    const isTranslated = translation !== key;
    console.log(`${isTranslated ? '✅' : '❌'} flows:${key} -> "${translation}"`);
  }

  console.log('\nTesting Dutch translations:');
  i18n.changeLanguage('nl');
  
  for (const key of testKeys) {
    const translation = i18n.t(key, { ns: 'flows' });
    const isTranslated = translation !== key;
    console.log(`${isTranslated ? '✅' : '❌'} flows:${key} -> "${translation}"`);
  }

  console.log('\n' + '=' .repeat(40));
  console.log('Translation test completed!');
}

if (require.main === module) {
  testFlowsTranslations().catch(console.error);
}

module.exports = { testFlowsTranslations };