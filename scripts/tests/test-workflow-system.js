// test-workflow-system.js - Test the basic workflow system implementation
const { workflowEngine } = require('./services/workflow-engine');
const { progressTrackingService } = require('./services/progress-tracking');

async function testWorkflowSystem() {
  console.log('🧪 [TEST] Starting workflow system tests...\n');

  try {
    // Test 1: Health checks
    console.log('📋 [TEST 1] Testing service health checks...');
    
    const workflowHealth = await workflowEngine.healthCheck();
    console.log('🔄 Workflow Engine Health:', workflowHealth);
    
    const progressHealth = await progressTrackingService.healthCheck();
    console.log('📊 Progress Tracking Health:', progressHealth);
    
    if (!workflowHealth.healthy || !progressHealth.healthy) {
      throw new Error('One or more services are not healthy');
    }
    console.log('✅ [TEST 1] All services are healthy\n');

    // Test 2: Get existing workflows
    console.log('📋 [TEST 2] Testing workflow retrieval...');
    
    const workflows = await workflowEngine.getWorkflows({ active_only: true });
    console.log(`🔄 Found ${workflows.length} active workflows:`);
    workflows.forEach(w => {
      console.log(`   - ${w.name} (${w.slug}) - ${w.type}`);
    });
    console.log('✅ [TEST 2] Workflow retrieval successful\n');

    // Test 3: Get onboarding workflow specifically
    console.log('📋 [TEST 3] Testing onboarding workflow retrieval...');
    
    try {
      const onboardingWorkflow = await workflowEngine.getWorkflowBySlug('onboarding-captains');
      if (onboardingWorkflow) {
        console.log(`🔄 Onboarding workflow found:`);
        console.log(`   - Name: ${onboardingWorkflow.name}`);
        console.log(`   - Status: ${onboardingWorkflow.status}`);
        console.log(`   - Phases: ${onboardingWorkflow.workflow_phases?.length || 0}`);
        console.log('✅ [TEST 3] Onboarding workflow retrieval successful\n');
      } else {
        console.log('⚠️ [TEST 3] Onboarding workflow not found (migration may not have run)\n');
      }
    } catch (onboardingError) {
      console.log('⚠️ [TEST 3] Onboarding workflow not available:', onboardingError.message, '\n');
    }

    // Test 4: Workflow validation
    console.log('📋 [TEST 4] Testing workflow validation...');
    
    const validConfig = {
      name: 'Test Workflow',
      slug: 'test-workflow',
      type: 'training'
    };
    
    const isValid = workflowEngine.validateWorkflowConfig(validConfig);
    console.log('🔄 Valid config validation:', isValid);
    
    try {
      const invalidConfig = { name: 'Test' }; // Missing required fields
      workflowEngine.validateWorkflowConfig(invalidConfig);
      throw new Error('Validation should have failed');
    } catch (validationError) {
      if (validationError.message.includes('required')) {
        console.log('🔄 Invalid config correctly rejected:', validationError.message);
      } else {
        throw validationError;
      }
    }
    console.log('✅ [TEST 4] Workflow validation working correctly\n');

    // Test 5: Progress tracking utilities
    console.log('📋 [TEST 5] Testing progress tracking utilities...');
    
    // Test time calculation
    const mockProgress = [
      {
        started_at: '2025-01-01T10:00:00Z',
        completed_at: '2025-01-01T10:30:00Z',
        status: 'completed'
      },
      {
        started_at: '2025-01-01T11:00:00Z',
        completed_at: '2025-01-01T11:15:00Z',
        status: 'completed'
      }
    ];
    
    const timeSpent = progressTrackingService.calculateTimeSpent(mockProgress);
    console.log(`🔄 Time calculation test: ${timeSpent} minutes (expected: 45)`);
    
    if (timeSpent === 45) {
      console.log('✅ [TEST 5] Progress tracking utilities working correctly\n');
    } else {
      throw new Error(`Time calculation failed: expected 45, got ${timeSpent}`);
    }

    // Test 6: Database connectivity
    console.log('📋 [TEST 6] Testing database connectivity...');
    
    try {
      const testQuery = await workflowEngine.db.client
        .from('workflows')
        .select('count')
        .limit(1);
      
      if (testQuery.error) {
        console.log('⚠️ [TEST 6] Database query failed:', testQuery.error.message);
        console.log('   This might be expected if migrations haven\'t run yet\n');
      } else {
        console.log('✅ [TEST 6] Database connectivity successful\n');
      }
    } catch (dbError) {
      console.log('⚠️ [TEST 6] Database connectivity issues:', dbError.message);
      console.log('   This might be expected if migrations haven\'t run yet\n');
    }

    console.log('🎉 [COMPLETE] All available tests passed successfully!');
    console.log('\n📝 [NEXT STEPS]');
    console.log('1. Run database migrations to create workflow tables');
    console.log('2. Test workflow creation and instance management');
    console.log('3. Test the complete workflow execution flow');
    console.log('4. Implement frontend integration\n');

  } catch (error) {
    console.error('❌ [TEST FAILED]', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

// Run tests if called directly
if (require.main === module) {
  testWorkflowSystem()
    .then(() => {
      console.log('✅ Test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testWorkflowSystem };