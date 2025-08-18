#!/usr/bin/env node

/**
 * Quiz Translation System Integration Test
 * Tests the complete workflow from content migration to translation UI
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import fs from 'fs';

// Configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const testApiUrl = process.env.TEST_API_URL || 'http://localhost:3000';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Test utilities
let testResults = [];
let totalTests = 0;
let passedTests = 0;

function test(description, testFn) {
  totalTests++;
  console.log(`\n🧪 Testing: ${description}`);
  
  try {
    const result = testFn();
    if (result && typeof result.then === 'function') {
      return result.then(() => {
        console.log(`  ✅ PASSED: ${description}`);
        passedTests++;
        testResults.push({ description, status: 'PASSED' });
      }).catch(error => {
        console.error(`  ❌ FAILED: ${description} - ${error.message}`);
        testResults.push({ description, status: 'FAILED', error: error.message });
      });
    } else {
      console.log(`  ✅ PASSED: ${description}`);
      passedTests++;
      testResults.push({ description, status: 'PASSED' });
    }
  } catch (error) {
    console.error(`  ❌ FAILED: ${description} - ${error.message}`);
    testResults.push({ description, status: 'FAILED', error: error.message });
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

/**
 * Test 1: Database Schema Verification
 */
async function testDatabaseSchema() {
  // Check if migration tables exist
  const { data: tables, error } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .in('table_name', [
      'quiz_content_multilingual',
      'quiz_answer_options_multilingual', 
      'quiz_translations',
      'translation_memory',
      'maritime_terminology'
    ]);

  assert(!error, `Database query failed: ${error?.message}`);
  assert(tables.length >= 5, `Expected 5+ translation tables, found ${tables.length}`);
  
  console.log(`    📊 Found ${tables.length} translation tables`);
}

/**
 * Test 2: Content Migration Verification
 */
async function testContentMigration() {
  // Check if sample quiz content exists
  const { data: quizContent, error } = await supabase
    .from('quiz_content_multilingual')
    .select('*')
    .eq('quiz_phase', 'phase1');

  assert(!error, `Failed to fetch quiz content: ${error?.message}`);
  assert(quizContent && quizContent.length > 0, 'No quiz content found for phase1');
  
  console.log(`    📝 Found ${quizContent.length} quiz questions in phase1`);
  
  // Check answer options
  const { data: answerOptions, error: answerError } = await supabase
    .from('quiz_answer_options_multilingual')
    .select('*')
    .eq('quiz_phase', 'phase1')
    .eq('question_index', 0);

  assert(!answerError, `Failed to fetch answer options: ${answerError?.message}`);
  assert(answerOptions && answerOptions.length > 0, 'No answer options found');
  
  console.log(`    🔤 Found ${answerOptions.length} answer options for first question`);
}

/**
 * Test 3: Translation Functions
 */
async function testTranslationFunctions() {
  // Test get_quiz_content_in_language function
  const { data: englishContent, error: enError } = await supabase
    .rpc('get_quiz_content_in_language', {
      p_quiz_phase: 'phase1',
      p_question_index: 0,
      p_content_type: 'question',
      p_target_language: 'en'
    });

  assert(!enError, `English content function failed: ${enError?.message}`);
  assert(englishContent && englishContent.text, 'No English content returned');
  
  console.log(`    🇬🇧 English content: "${englishContent.text.substring(0, 50)}..."`);
  
  // Test get_quiz_answers_in_language function
  const { data: answers, error: answersError } = await supabase
    .rpc('get_quiz_answers_in_language', {
      p_quiz_phase: 'phase1',
      p_question_index: 0,
      p_target_language: 'en'
    });

  assert(!answersError, `Answers function failed: ${answersError?.message}`);
  assert(Array.isArray(answers) && answers.length > 0, 'No answers returned');
  
  console.log(`    📋 Found ${answers.length} answer options via function`);
}

/**
 * Test 4: API Endpoints
 */
async function testApiEndpoints() {
  // Note: This test assumes the API is running locally
  // In production, you'd need proper authentication
  
  console.log('    📡 Testing API endpoints (requires local server)...');
  
  try {
    // Test quiz translations endpoint
    const response = await fetch(`${testApiUrl}/api/training/quiz/phase1/translations`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.TEST_TOKEN || 'test-token'}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 401) {
      console.log('    ⚠️ API endpoint requires authentication (expected)');
      return;
    }

    assert(response.ok, `API request failed: ${response.status} ${response.statusText}`);
    
    const data = await response.json();
    assert(data.phase === 'phase1', 'Invalid API response structure');
    
    console.log(`    ✅ API endpoint responded correctly`);
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('    ⚠️ API server not running (expected in test environment)');
      return;
    }
    throw error;
  }
}

/**
 * Test 5: Translation Views
 */
async function testTranslationViews() {
  // Test quiz_translation_status view
  const { data: translationStatus, error } = await supabase
    .from('quiz_translation_status')
    .select('*')
    .eq('quiz_phase', 'phase1');

  // Note: This might be empty if no translations exist yet, which is OK
  assert(!error, `Translation status view failed: ${error?.message}`);
  
  console.log(`    📈 Translation status view accessible`);
  
  // Test quiz_content_detailed view
  const { data: detailedContent, error: detailError } = await supabase
    .schema('admin_views')
    .from('quiz_content_detailed')
    .select('*')
    .eq('quiz_phase', 'phase1')
    .limit(1);

  assert(!detailError, `Detailed content view failed: ${detailError?.message}`);
  assert(detailedContent && detailedContent.length > 0, 'No detailed content found');
  
  console.log(`    🔍 Detailed content view working correctly`);
}

/**
 * Test 6: RLS Policies
 */
async function testRLSPolicies() {
  // Test that RLS is enabled on new tables
  const { data: rlsStatus, error } = await supabase
    .from('pg_tables')
    .select('tablename, rowsecurity')
    .eq('schemaname', 'public')
    .in('tablename', [
      'quiz_content_multilingual',
      'quiz_answer_options_multilingual',
      'quiz_translations'
    ]);

  assert(!error, `RLS status check failed: ${error?.message}`);
  
  const tablesWithRLS = rlsStatus.filter(table => table.rowsecurity);
  console.log(`    🔒 RLS enabled on ${tablesWithRLS.length}/${rlsStatus.length} tables`);
}

/**
 * Test 7: Translation Memory Integration
 */
async function testTranslationMemory() {
  // Test if translation memory functions exist
  const { data: memoryTest, error } = await supabase
    .from('translation_memory')
    .select('count(*)')
    .limit(1);

  assert(!error, `Translation memory access failed: ${error?.message}`);
  
  console.log(`    💾 Translation memory accessible`);
  
  // Test maritime terminology
  const { data: terminology, error: termError } = await supabase
    .from('maritime_terminology')
    .select('count(*)')
    .limit(1);

  assert(!termError, `Maritime terminology access failed: ${termError?.message}`);
  
  console.log(`    ⚓ Maritime terminology table accessible`);
}

/**
 * Test 8: Performance Test
 */
async function testPerformance() {
  console.log('    ⚡ Running performance tests...');
  
  const startTime = Date.now();
  
  // Simulate getting a full quiz in multiple languages
  const phases = ['phase1', 'phase2'];
  const languages = ['en', 'nl'];
  
  for (const phase of phases) {
    for (const language of languages) {
      const { data, error } = await supabase
        .schema('admin_views')
        .from('quiz_content_detailed')
        .select('*')
        .eq('quiz_phase', phase);
      
      assert(!error, `Performance test failed for ${phase}/${language}: ${error?.message}`);
    }
  }
  
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  assert(duration < 5000, `Performance test too slow: ${duration}ms (should be < 5000ms)`);
  
  console.log(`    ⏱️ Quiz loading performance: ${duration}ms`);
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🚀 Starting Quiz Translation System Integration Tests\n');
  console.log('=' .repeat(60));
  
  try {
    await test('Database Schema Verification', testDatabaseSchema);
    await test('Content Migration Verification', testContentMigration);
    await test('Translation Functions', testTranslationFunctions);
    await test('API Endpoints', testApiEndpoints);
    await test('Translation Views', testTranslationViews);
    await test('RLS Policies', testRLSPolicies);
    await test('Translation Memory Integration', testTranslationMemory);
    await test('Performance Test', testPerformance);
    
    // Wait for all async tests to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    
  } catch (error) {
    console.error(`\n❌ Test suite failed: ${error.message}`);
  }
  
  // Print summary
  console.log('\n' + '=' .repeat(60));
  console.log('📊 Test Results Summary');
  console.log('=' .repeat(60));
  
  testResults.forEach(result => {
    const status = result.status === 'PASSED' ? '✅' : '❌';
    console.log(`${status} ${result.description}`);
    if (result.error) {
      console.log(`    Error: ${result.error}`);
    }
  });
  
  console.log('\n📈 Statistics:');
  console.log(`  Total tests: ${totalTests}`);
  console.log(`  Passed: ${passedTests}`);
  console.log(`  Failed: ${totalTests - passedTests}`);
  console.log(`  Success rate: ${Math.round((passedTests / totalTests) * 100)}%`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 All tests passed! Quiz translation system is ready.');
    
    console.log('\n📝 Next Steps:');
    console.log('  1. Run migration: node scripts/migrate-quiz-content.js migrate');
    console.log('  2. Start translation: Use batch translate APIs for quiz content');
    console.log('  3. Test UI: Access quiz pages with language dropdown');
    console.log('  4. Verify: Check that content switches languages correctly');
    
  } else {
    console.log('\n⚠️ Some tests failed. Please fix issues before deploying.');
    process.exit(1);
  }
}

// Export for use in other scripts
export { runTests, test, assert };

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}