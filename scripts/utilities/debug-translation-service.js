#!/usr/bin/env node

/**
 * Debug Translation Service
 * Test script to check translation provider availability and API key loading
 */

const { createRequire } = require('module');
const require = createRequire(import.meta.url);

// Use dynamic import for ES modules
async function loadModules() {
  const { default: AITranslationService } = await import('../../lib/aiTranslationService.js');
  const { supabase } = await import('../../lib/supabase.js');
  return { AITranslationService, supabase };
}

console.log('🔍 Debugging Translation Service Issues\n');

async function debugTranslationService() {
  try {
    // Load ES modules
    const { AITranslationService, supabase } = await loadModules();
    
    console.log('1. Checking database connection...');
    const { data: testData, error: testError } = await supabase
      .from('system_settings')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.error('❌ Database connection failed:', testError);
      return;
    }
    console.log('✅ Database connection successful\n');

    console.log('2. Loading translation settings from database...');
    const settingsDataResult = await db.query('SELECT * FROM system_settings WHERE category = $1', ['translation']);
    const settingsData = settingsDataResult.rows;
    const settingsError = false;

    if (settingsError) {
      console.error('❌ Failed to load translation settings:', settingsError);
      return;
    }

    console.log('📊 Raw translation settings from database:');
    settingsData.forEach(setting => {
      console.log(`   ${setting.key}: ${setting.value ? '***[SET]***' : '[NOT SET]'} (type: ${setting.type})`);
    });

    // Convert to nested object structure like the API does
    const settings = { translation: {} };
    settingsData.forEach(setting => {
      settings.translation[setting.key] = {
        value: setting.value,
        type: setting.type
      };
    });

    console.log('\n3. Initializing AI Translation Service...');
    const translationService = new AITranslationService();

    console.log('4. Checking initial provider availability (before settings update)...');
    for (const [name, provider] of Object.entries(translationService.providers)) {
      const available = await provider.isAvailable();
      console.log(`   ${name}: ${available ? '✅ available' : '❌ unavailable'} (API Key: ${provider.apiKey ? '***[SET]***' : '[NOT SET]'})`);
    }

    console.log('\n5. Updating providers with database settings...');
    translationService.updateFromSettings(settings);

    console.log('6. Checking provider availability after settings update...');
    for (const [name, provider] of Object.entries(translationService.providers)) {
      const available = await provider.isAvailable();
      console.log(`   ${name}: ${available ? '✅ available' : '❌ unavailable'} (API Key: ${provider.apiKey ? '***[SET]***' : '[NOT SET]'})`);
    }

    console.log('\n7. Testing if maritime_terminology table exists...');
    try {
      const { data: terminologyData, error: terminologyError } = await supabase
        .from('maritime_terminology')
        .select('count')
        .limit(1);
      
      if (terminologyError) {
        console.error('❌ maritime_terminology table error:', terminologyError.message);
        console.log('💡 This table might not exist in the database');
      } else {
        console.log('✅ maritime_terminology table exists and is accessible');
      }
    } catch (error) {
      console.error('❌ Error checking maritime_terminology table:', error.message);
    }

    console.log('\n8. Running translation service initialization...');
    await translationService.initialize();

    console.log('\n9. Final provider status check...');
    for (const [name, provider] of Object.entries(translationService.providers)) {
      const available = await provider.isAvailable();
      console.log(`   ${name}: ${available ? '✅ available' : '❌ unavailable'}`);
    }

    console.log('\n10. Testing getting an available provider...');
    try {
      const availableProvider = await translationService.getAvailableProvider();
      console.log(`✅ Available provider found: ${availableProvider.name}`);
    } catch (error) {
      console.error('❌ No available providers:', error.message);
    }

    console.log('\n11. Testing a simple translation...');
    try {
      const result = await translationService.translateText('Hello', 'en', 'nl');
      console.log('✅ Translation successful:', result);
    } catch (error) {
      console.error('❌ Translation failed:', error.message);
    }

  } catch (error) {
    console.error('❌ Debug script failed:', error);
  }
}

// Run the debug script
debugTranslationService().then(() => {
  console.log('\n🏁 Debug script completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});