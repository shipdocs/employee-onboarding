/**
 * Simple Translation Debug Script
 * Checks system settings and provider availability
 */

require('dotenv').config();

// Simple test to check if we can load system settings
async function testTranslationSettings() {
  try {
    console.log('🔍 Debugging Translation Service Issues\n');

    // Test dynamic import of ES modules
    console.log('1. Loading modules...');
    const { supabase } = await import('../../lib/supabase.js');
    const { default: AITranslationService } = await import('../../lib/aiTranslationService.js');
    
    console.log('✅ Modules loaded successfully\n');

    console.log('2. Checking database connection...');
    const { data: testData, error: testError } = await supabase
      .from('system_settings')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.error('❌ Database connection failed:', testError);
      return;
    }
    console.log('✅ Database connection successful\n');

    console.log('3. Loading translation settings from database...');
    const { data: settingsData, error: settingsError } = await supabase
      .from('system_settings')
      .select('*')
      .eq('category', 'translation');

    if (settingsError) {
      console.error('❌ Failed to load translation settings:', settingsError);
      return;
    }

    console.log('📊 Translation settings from database:');
    if (settingsData.length === 0) {
      console.log('   ⚠️  No translation settings found in database');
    } else {
      settingsData.forEach(setting => {
        const hasValue = setting.value && setting.value.trim() !== '';
        console.log(`   ${setting.key}: ${hasValue ? '✅ SET' : '❌ NOT SET'} (type: ${setting.type})`);
      });
    }

    // Check environment variables
    console.log('\n4. Checking environment variables...');
    const envVars = [
      'ANTHROPIC_API_KEY',
      'OPENAI_API_KEY', 
      'MICROSOFT_TRANSLATOR_KEY',
      'GOOGLE_TRANSLATE_API_KEY'
    ];
    
    envVars.forEach(envVar => {
      const hasValue = process.env[envVar] && process.env[envVar].trim() !== '';
      console.log(`   ${envVar}: ${hasValue ? '✅ SET' : '❌ NOT SET'}`);
    });

    // Convert to nested object structure like the API does
    const settings = { translation: {} };
    settingsData.forEach(setting => {
      settings.translation[setting.key] = {
        value: setting.value,
        type: setting.type
      };
    });

    console.log('\n5. Initializing AI Translation Service...');
    const translationService = new AITranslationService();

    console.log('6. Checking initial provider availability (before settings update)...');
    for (const [name, provider] of Object.entries(translationService.providers)) {
      try {
        const available = await provider.isAvailable();
        console.log(`   ${name}: ${available ? '✅ available' : '❌ unavailable'} (API Key: ${provider.apiKey ? '✅ SET' : '❌ NOT SET'})`);
      } catch (error) {
        console.log(`   ${name}: ❌ error checking availability - ${error.message}`);
      }
    }

    console.log('\n7. Updating providers with database settings...');
    translationService.updateFromSettings(settings);

    console.log('8. Checking provider availability after settings update...');
    for (const [name, provider] of Object.entries(translationService.providers)) {
      try {
        const available = await provider.isAvailable();
        console.log(`   ${name}: ${available ? '✅ available' : '❌ unavailable'} (API Key: ${provider.apiKey ? '✅ SET' : '❌ NOT SET'})`);
      } catch (error) {
        console.log(`   ${name}: ❌ error checking availability - ${error.message}`);
      }
    }

    console.log('\n9. Testing maritime_terminology table...');
    try {
      const { data: terminologyData, error: terminologyError } = await supabase
        .from('maritime_terminology')
        .select('count')
        .limit(1);
      
      if (terminologyError) {
        console.error(`❌ maritime_terminology table error: ${terminologyError.message}`);
        
        // Check if table exists in schema
        const { data: tableCheck, error: tableError } = await supabase
          .from('information_schema.tables')
          .select('table_name')
          .eq('table_name', 'maritime_terminology')
          .eq('table_schema', 'public');
          
        if (tableError || !tableCheck || tableCheck.length === 0) {
          console.log('💡 maritime_terminology table does not exist in database schema');
          console.log('💡 Run the migration: supabase/migrations/20250606115627_multilingual_workflow_system.sql');
        }
      } else {
        console.log('✅ maritime_terminology table exists and is accessible');
      }
    } catch (error) {
      console.error('❌ Error checking maritime_terminology table:', error.message);
    }

    console.log('\n10. Testing getting an available provider...');
    try {
      const availableProvider = await translationService.getAvailableProvider();
      console.log(`✅ Available provider found: ${availableProvider.name}`);
      
      // Test a simple translation
      console.log('\n11. Testing a simple translation...');
      const result = await translationService.translateText('Hello', 'en', 'nl');
      console.log('✅ Translation successful:', JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('❌ No available providers or translation failed:', error.message);
      
      // Show recommendations
      console.log('\n💡 Recommendations:');
      console.log('   1. Set at least one API key in the system settings');
      console.log('   2. Ensure the translation category settings exist in the database');
      console.log('   3. Check that the maritime_terminology table exists');
    }

  } catch (error) {
    console.error('❌ Debug script failed:', error);
  }
}

// Run the debug script
testTranslationSettings().then(() => {
  console.log('\n🏁 Debug script completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});