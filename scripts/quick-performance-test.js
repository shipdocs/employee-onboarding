#!/usr/bin/env node

/**
 * Quick Performance Test for Production Deployment
 */

const axios = require('axios');
const { performance } = require('perf_hooks');

const BASE_URL = 'https://onboarding.burando.online';
const NUM_REQUESTS = 10;

async function performanceTest() {
  console.log('🚀 Quick Performance Test');
  console.log(`📍 Target: ${BASE_URL}`);
  console.log(`🔢 Requests: ${NUM_REQUESTS}\n`);
  
  const results = [];
  
  // Test health endpoint performance
  console.log('Testing /api/health endpoint...');
  for (let i = 0; i < NUM_REQUESTS; i++) {
    const start = performance.now();
    try {
      const response = await axios.get(`${BASE_URL}/api/health`, { timeout: 5000 });
      const duration = performance.now() - start;
      results.push({
        request: i + 1,
        duration: Math.round(duration),
        status: response.status,
        success: true
      });
      process.stdout.write(`✅ Request ${i + 1}: ${Math.round(duration)}ms `);
    } catch (error) {
      const duration = performance.now() - start;
      results.push({
        request: i + 1,
        duration: Math.round(duration),
        status: error.response?.status || 'ERROR',
        success: false
      });
      process.stdout.write(`❌ Request ${i + 1}: ${Math.round(duration)}ms `);
    }
  }
  
  console.log('\n');
  
  // Calculate statistics
  const successfulRequests = results.filter(r => r.success);
  const durations = successfulRequests.map(r => r.duration);
  
  if (durations.length === 0) {
    console.log('❌ No successful requests');
    return;
  }
  
  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
  const minDuration = Math.min(...durations);
  const maxDuration = Math.max(...durations);
  const p95Duration = durations.sort((a, b) => a - b)[Math.floor(durations.length * 0.95)];
  
  console.log('📊 Performance Results');
  console.log('======================');
  console.log(`✅ Successful requests: ${successfulRequests.length}/${NUM_REQUESTS}`);
  console.log(`📈 Success rate: ${Math.round((successfulRequests.length / NUM_REQUESTS) * 100)}%`);
  console.log(`⚡ Average response time: ${Math.round(avgDuration)}ms`);
  console.log(`🚀 Fastest response: ${minDuration}ms`);
  console.log(`🐌 Slowest response: ${maxDuration}ms`);
  console.log(`📊 95th percentile: ${p95Duration}ms`);
  
  // Validate against targets
  console.log('\n🎯 Target Validation');
  console.log('====================');
  
  const targets = {
    'Success rate > 95%': (successfulRequests.length / NUM_REQUESTS) >= 0.95,
    'Average response < 500ms': avgDuration < 500,
    '95th percentile < 1000ms': p95Duration < 1000
  };
  
  let allTargetsMet = true;
  for (const [target, met] of Object.entries(targets)) {
    console.log(`${met ? '✅' : '❌'} ${target}`);
    if (!met) allTargetsMet = false;
  }
  
  if (allTargetsMet) {
    console.log('\n🎉 All performance targets met!');
  } else {
    console.log('\n⚠️ Some performance targets not met');
  }
}

performanceTest().catch(error => {
  console.error('Performance test error:', error.message);
  process.exit(1);
});
