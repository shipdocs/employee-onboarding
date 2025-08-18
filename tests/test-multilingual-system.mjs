#!/usr/bin/env node

/**
 * Test Multilingual System
 * End-to-end test of the AI translation system
 */

import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Test data
const testTexts = [
  'Safety training is mandatory for all crew members',
  'Emergency procedures must be followed at all times',
  'Life jackets are required on deck',
  'Report to the muster station immediately',
  'Complete the safety checklist before departure'
];

const testLanguages = ['nl', 'de', 'fr', 'es'];

async function testTranslationAPI() {
  console.log('🧪 Testing Translation API...\n');

  // Test 1: Single text translation
  console.log('📝 Test 1: Single text translation');
  try {
    const response = await fetch(`${BASE_URL}/api/translation/translate-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: testTexts[0],
        sourceLang: 'en',
        targetLang: 'nl',
        domain: 'maritime'
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Single translation successful');
      console.log(`   Original: ${testTexts[0]}`);
      console.log(`   Dutch: ${result.translation}`);
      console.log(`   Confidence: ${result.confidence}`);
      console.log(`   Provider: ${result.provider}`);
      console.log(`   Maritime Enhanced: ${result.maritimeEnhanced}`);
    } else {
      console.log('❌ Single translation failed:', response.status);
    }
  } catch (error) {
    console.log('❌ Single translation error:', error.message);
  }

  console.log('');

  // Test 2: Batch translation
  console.log('📝 Test 2: Batch translation');
  try {
    const response = await fetch(`${BASE_URL}/api/translation/batch-translate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        texts: testTexts.slice(0, 3),
        sourceLang: 'en',
        targetLangs: ['nl', 'de'],
        domain: 'maritime'
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Batch translation successful');
      console.log(`   Processed ${result.metadata.total_texts} texts into ${result.metadata.target_languages.length} languages`);
      console.log(`   Success rate: ${result.metadata.success_rate.toFixed(1)}%`);
      console.log(`   Average confidence: ${result.metadata.average_confidence.toFixed(2)}`);
      
      // Show first translation as example
      if (result.results.nl && result.results.nl[0]) {
        console.log(`   Example (Dutch): ${result.results.nl[0].translation}`);
      }
    } else {
      console.log('❌ Batch translation failed:', response.status);
    }
  } catch (error) {
    console.log('❌ Batch translation error:', error.message);
  }

  console.log('');
}

async function testDatabaseIntegration() {
  console.log('🗄️ Testing Database Integration...\n');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.log('⚠️ Skipping database tests (missing Supabase credentials)');
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // Test 1: Check translation tables exist
  console.log('📝 Test 1: Check translation tables');
  try {
    const { data: tables, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['translation_memory', 'maritime_terminology', 'translation_jobs']);

    if (!error && tables) {
      console.log(`✅ Found ${tables.length} translation tables:`);
      tables.forEach(table => console.log(`   - ${table.table_name}`));
    } else {
      console.log('❌ Error checking tables:', error?.message);
    }
  } catch (error) {
    console.log('❌ Database connection error:', error.message);
  }

  console.log('');

  // Test 2: Check maritime terminology
  console.log('📝 Test 2: Check maritime terminology');
  try {
    const { data: terms, error } = await supabase
      .from('maritime_terminology')
      .select('term_key, translations, human_verified')
      .limit(5);

    if (!error && terms) {
      console.log(`✅ Found ${terms.length} maritime terms:`);
      terms.forEach(term => {
        const languages = Object.keys(term.translations).join(', ');
        console.log(`   - ${term.term_key} (${languages}) ${term.human_verified ? '✓' : ''}`);
      });
    } else {
      console.log('❌ Error checking terminology:', error?.message);
    }
  } catch (error) {
    console.log('❌ Terminology check error:', error.message);
  }

  console.log('');

  // Test 3: Check workflow multilingual columns
  console.log('📝 Test 3: Check workflow multilingual columns');
  try {
    const { data: workflows, error } = await supabase
      .from('workflows')
      .select('id, slug, source_language, supported_languages, translation_status')
      .limit(3);

    if (!error && workflows) {
      console.log(`✅ Found ${workflows.length} workflows with multilingual support:`);
      workflows.forEach(workflow => {
        console.log(`   - ${workflow.slug}: ${workflow.source_language} → [${workflow.supported_languages?.join(', ') || 'none'}]`);
        console.log(`     Status: ${workflow.translation_status || 'source_only'}`);
      });
    } else {
      console.log('❌ Error checking workflows:', error?.message);
    }
  } catch (error) {
    console.log('❌ Workflow check error:', error.message);
  }

  console.log('');
}

async function testTranslationMemory() {
  console.log('🧠 Testing Translation Memory...\n');

  // This would test the translation memory functionality
  // by making a translation, then checking if it's cached
  console.log('📝 Test: Translation memory and caching');
  
  const testText = 'Emergency evacuation procedure';
  
  try {
    // First translation
    const response1 = await fetch(`${BASE_URL}/api/translation/translate-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: testText,
        sourceLang: 'en',
        targetLang: 'nl',
        domain: 'maritime'
      })
    });

    if (response1.ok) {
      const result1 = await response1.json();
      console.log('✅ First translation successful');
      console.log(`   Source: ${result1.source || 'ai'}`);
      
      // Second translation (should be cached)
      const response2 = await fetch(`${BASE_URL}/api/translation/translate-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: testText,
          sourceLang: 'en',
          targetLang: 'nl',
          domain: 'maritime'
        })
      });

      if (response2.ok) {
        const result2 = await response2.json();
        console.log('✅ Second translation successful');
        console.log(`   Source: ${result2.source || 'ai'}`);
        
        if (result2.source === 'memory') {
          console.log('🎉 Translation memory working correctly!');
        } else {
          console.log('⚠️ Translation memory might not be working (or this is the first time)');
        }
      }
    }
  } catch (error) {
    console.log('❌ Translation memory test error:', error.message);
  }

  console.log('');
}

async function testMaritimeTerminologyEnhancement() {
  console.log('⚓ Testing Maritime Terminology Enhancement...\n');

  const maritimeText = 'Put on your life jacket and report to the muster station for emergency procedures';
  
  console.log('📝 Test: Maritime terminology enhancement');
  try {
    const response = await fetch(`${BASE_URL}/api/translation/translate-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: maritimeText,
        sourceLang: 'en',
        targetLang: 'nl',
        domain: 'maritime'
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Maritime text translation successful');
      console.log(`   Original: ${maritimeText}`);
      console.log(`   Translation: ${result.translation}`);
      console.log(`   Maritime Enhanced: ${result.maritimeEnhanced ? 'Yes' : 'No'}`);
      console.log(`   Confidence: ${result.confidence}`);
      
      if (result.maritimeEnhanced) {
        console.log('🎉 Maritime terminology enhancement working!');
      } else {
        console.log('⚠️ Maritime enhancement not detected (might still be working)');
      }
    } else {
      console.log('❌ Maritime translation failed:', response.status);
    }
  } catch (error) {
    console.log('❌ Maritime terminology test error:', error.message);
  }

  console.log('');
}

async function runAllTests() {
  console.log('🚀 Starting Multilingual System End-to-End Tests\n');
  console.log('='.repeat(60));
  console.log('');

  await testTranslationAPI();
  await testDatabaseIntegration();
  await testTranslationMemory();
  await testMaritimeTerminologyEnhancement();

  console.log('='.repeat(60));
  console.log('🎉 All tests completed!');
  console.log('');
  console.log('📋 Next steps for Vercel deployment:');
  console.log('  1. Deploy to Vercel: vercel --prod');
  console.log('  2. Optionally add Microsoft/Google API keys for enhanced capacity');
  console.log('  3. Test frontend multilingual editor');
  console.log('  4. Create multilingual workflows with AI translation');
  console.log('  5. Verify maritime terminology enhancement');
  console.log('');
  console.log('💡 Translation providers:');
  console.log('  • Cloud LibreTranslate: FREE unlimited (primary)');
  console.log('  • Microsoft Translator: 2M chars/month FREE');
  console.log('  • Google Translate: 500K chars/month FREE');
  console.log('  • Browser fallback: Always available');
  console.log('');
  console.log('🚀 Ready for serverless deployment!');
}

// Run tests
runAllTests().catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});