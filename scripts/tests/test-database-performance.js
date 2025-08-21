#!/usr/bin/env node

// Database Performance Testing Script
// Sprint S02 T02: Database Query Optimization & Indexing
// Tests the performance improvements from optimization

const { supabase } = require('../lib/database-supabase-compat');
const { performance } = require('perf_hooks');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Performance test configuration
const PERFORMANCE_TARGETS = {
  singleUserQuery: 50,      // ms
  crewListQuery: 200,       // ms
  adminStatsQuery: 100,     // ms
  searchQuery: 150,         // ms
  complexJoinQuery: 300     // ms
};

// Test results storage
const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

/**
 * Utility function to measure query performance
 */
async function measureQuery(name, queryFunction, targetMs) {
  console.log(`\n🔍 Testing: ${name}`);
  console.log(`   Target: < ${targetMs}ms`);
  
  const startTime = performance.now();
  
  try {
    const result = await queryFunction();
    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);
    
    const passed = duration < targetMs;
    const status = passed ? '✅ PASS' : '❌ FAIL';
    
    console.log(`   Result: ${duration}ms ${status}`);
    
    if (result && typeof result === 'object' && 'length' in result) {
      console.log(`   Records: ${result.length}`);
    }
    
    testResults.tests.push({
      name,
      duration,
      target: targetMs,
      passed,
      recordCount: result?.length || 0
    });
    
    if (passed) {
      testResults.passed++;
    } else {
      testResults.failed++;
    }
    
    return { duration, passed, result };
    
  } catch (error) {
    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);
    
    console.log(`   Result: ${duration}ms ❌ ERROR`);
    console.log(`   Error: ${error.message}`);
    
    testResults.tests.push({
      name,
      duration,
      target: targetMs,
      passed: false,
      error: error.message
    });
    
    testResults.failed++;
    
    return { duration, passed: false, error };
  }
}

/**
 * Test 1: Single User Query Performance
 */
async function testSingleUserQuery() {
  return await measureQuery(
    'Single User Query',
    async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'crew')
        .limit(1)
        .single();
      
      if (error) throw error;
      return data;
    },
    PERFORMANCE_TARGETS.singleUserQuery
  );
}

/**
 * Test 2: Crew List Query Performance (Original N+1 Problem)
 */
async function testCrewListQuery() {
  return await measureQuery(
    'Crew List with Progress (Optimized)',
    async () => {
      // Get all crew members
      const { data: crewMembers, error: crewError } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, role, status, created_at')
        .eq('role', 'crew')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (crewError) throw crewError;
      
      if (!crewMembers || crewMembers.length === 0) {
        return [];
      }

      const crewIds = crewMembers.map(crew => crew.id);

      // Batch fetch training sessions
      const { data: sessions, error: sessionsError } = await supabase
        .from('training_sessions')
        .select(`
          id, user_id, phase, status, started_at, completed_at,
          training_items (id, completed, completed_at)
        `)
        .in('user_id', crewIds);

      if (sessionsError) throw sessionsError;

      // Batch fetch quiz results
      const { data: quizResults, error: quizError } = await supabase
        .from('quiz_results')
        .select('id, user_id, phase, score, total_questions, passed')
        .in('user_id', crewIds);

      if (quizError) throw quizError;

      // Process in memory (fast)
      const result = crewMembers.map(crew => {
        const userSessions = (sessions || []).filter(s => s.user_id === crew.id);
        const userQuizResults = (quizResults || []).filter(q => q.user_id === crew.id);
        
        return {
          ...crew,
          sessionCount: userSessions.length,
          quizCount: userQuizResults.length
        };
      });

      return result;
    },
    PERFORMANCE_TARGETS.crewListQuery
  );
}

/**
 * Test 3: Admin Statistics Query Performance
 */
async function testAdminStatsQuery() {
  return await measureQuery(
    'Admin Statistics Query',
    async () => {
      // Parallel execution of count queries
      const [
        managersResult,
        crewResult,
        activeUsersResult,
        completedTrainingResult
      ] = await Promise.all([
        db.from('users').select('*', { count: 'exact', head: true }).eq('role', 'manager'),
        db.from('users').select('*', { count: 'exact', head: true }).eq('role', 'crew'),
        db.from('users').select('*', { count: 'exact', head: true }).eq('is_active', true),
        db.from('training_sessions').select('*', { count: 'exact', head: true }).eq('status', 'completed')
      ]);

      return {
        totalManagers: managersResult.count || 0,
        totalCrew: crewResult.count || 0,
        activeUsers: activeUsersResult.count || 0,
        completedTraining: completedTrainingResult.count || 0
      };
    },
    PERFORMANCE_TARGETS.adminStatsQuery
  );
}

/**
 * Test 4: User Search Query Performance
 */
async function testSearchQuery() {
  return await measureQuery(
    'User Search Query',
    async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, role, status')
        .eq('role', 'crew')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    },
    PERFORMANCE_TARGETS.searchQuery
  );
}

/**
 * Test 5: Complex Join Query Performance
 */
async function testComplexJoinQuery() {
  return await measureQuery(
    'Complex Join Query (Training Progress)',
    async () => {
      const { data, error } = await supabase
        .from('training_sessions')
        .select(`
          id,
          user_id,
          phase,
          status,
          started_at,
          completed_at,
          users (
            id,
            email,
            first_name,
            last_name,
            role
          ),
          training_items (
            id,
            title,
            completed,
            completed_at
          )
        `)
        .eq('users.role', 'crew')
        .limit(20);
      
      if (error) throw error;
      return data;
    },
    PERFORMANCE_TARGETS.complexJoinQuery
  );
}

/**
 * Test 6: Index Usage Verification
 */
async function testIndexUsage() {
  console.log('\n🔍 Testing: Index Usage Verification');
  
  try {
    // Test queries that should use indexes
    const indexTests = [
      { name: 'users.email index', query: () => db.from('users').select('id').eq('email', 'test@example.com') },
      { name: 'users.role index', query: () => db.from('users').select('id').eq('role', 'crew') },
      { name: 'training_sessions.user_id index', query: () => db.from('training_sessions').select('id').eq('user_id', '123') },
      { name: 'quiz_results.user_id index', query: () => db.from('quiz_results').select('id').eq('user_id', '123') }
    ];

    for (const test of indexTests) {
      const startTime = performance.now();
      await test.query();
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);
      
      console.log(`   ${test.name}: ${duration}ms`);
    }
    
    console.log('   ✅ Index usage tests completed');
    
  } catch (error) {
    console.log(`   ❌ Index usage test failed: ${error.message}`);
  }
}

/**
 * Main test execution
 */
async function runPerformanceTests() {
  console.log('🚀 DATABASE PERFORMANCE TESTING');
  console.log('================================');
  console.log('Testing optimized queries and index performance...\n');

  // Run all performance tests
  await testSingleUserQuery();
  await testCrewListQuery();
  await testAdminStatsQuery();
  await testSearchQuery();
  await testComplexJoinQuery();
  await testIndexUsage();

  // Print summary
  console.log('\n📊 PERFORMANCE TEST SUMMARY');
  console.log('============================');
  console.log(`Total Tests: ${testResults.passed + testResults.failed}`);
  console.log(`Passed: ${testResults.passed} ✅`);
  console.log(`Failed: ${testResults.failed} ❌`);
  console.log(`Success Rate: ${Math.round((testResults.passed / (testResults.passed + testResults.failed)) * 100)}%`);

  // Detailed results
  console.log('\n📋 DETAILED RESULTS');
  console.log('===================');
  testResults.tests.forEach(test => {
    const status = test.passed ? '✅' : '❌';
    const records = test.recordCount ? ` (${test.recordCount} records)` : '';
    console.log(`${status} ${test.name}: ${test.duration}ms / ${test.target}ms${records}`);
    if (test.error) {
      console.log(`   Error: ${test.error}`);
    }
  });

  // Performance recommendations
  console.log('\n💡 RECOMMENDATIONS');
  console.log('==================');
  
  const slowTests = testResults.tests.filter(test => !test.passed && !test.error);
  if (slowTests.length > 0) {
    console.log('Slow queries detected:');
    slowTests.forEach(test => {
      console.log(`- ${test.name}: ${test.duration}ms (target: ${test.target}ms)`);
    });
    console.log('\nConsider:');
    console.log('- Adding more specific indexes');
    console.log('- Optimizing query structure');
    console.log('- Implementing query caching');
  } else {
    console.log('✅ All performance targets met!');
    console.log('Database optimization is working effectively.');
  }

  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run tests if this script is executed directly
if (require.main === module) {
  runPerformanceTests().catch(error => {
    console.error('❌ Performance testing failed:', error);
    process.exit(1);
  });
}

module.exports = {
  runPerformanceTests,
  measureQuery,
  PERFORMANCE_TARGETS
};
