#!/usr/bin/env node

/**
 * Test script to directly call the workflows API endpoint
 */

const { requireManagerOrAdmin } = require('../lib/auth.js');
const { workflowEngine } = require('../services/workflow-engine.js');

async function testWorkflowsAPI() {
  console.log('🧪 Testing workflows API endpoint directly...\n');
  
  try {
    // Mock request and response objects
    const mockReq = {
      method: 'GET',
      query: {},
      user: { id: 'test-user', role: 'admin' }
    };
    
    const mockRes = {
      status: (code) => ({
        json: (data) => {
          console.log(`📤 Response Status: ${code}`);
          console.log('📤 Response Data:', JSON.stringify(data, null, 2));
          return { status: code, data };
        }
      })
    };

    // Import the handler function
    const handler = require('../api/workflows/index.js');
    
    console.log('1. Testing direct workflow engine call...');
    const workflows = await workflowEngine.getWorkflows({});
    console.log(`✅ Direct call successful - found ${workflows.length} workflows\n`);
    
    console.log('2. Testing API handler...');
    await handler(mockReq, mockRes);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('   Stack trace:', error.stack);
  }
}

// Run the test
testWorkflowsAPI().then(() => {
  console.log('\n🎉 Test completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test script failed:', error.message);
  process.exit(1);
});
