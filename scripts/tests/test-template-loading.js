// Quick test to check template loading with background images
const axios = require('axios');

async function testTemplateLoading() {
  console.log('🧪 Testing Template Loading with Background Images');
  console.log('='.repeat(60));

  try {
    const client = axios.create({
      baseURL: 'http://localhost:3001',
      timeout: 10000,
      validateStatus: () => true
    });

    // Test getting the template that should have a background image
    console.log('1. Testing template retrieval...');
    
    const res = await client.get('/api/templates/1');
    
    console.log(`Status: ${res.status}`);
    
    if (res.status === 401) {
      console.log('❌ Authentication required - this is expected');
      console.log('✅ Template endpoint is accessible');
      return;
    }
    
    if (res.status === 200) {
      const template = res.data;
      console.log('✅ Template retrieved successfully');
      console.log(`Template ID: ${template.id}`);
      console.log(`Template Name: ${template.name}`);
      console.log(`Has Background Image: ${!!template.backgroundImage}`);
      console.log(`Background Image URL: ${template.backgroundImage}`);
      console.log(`Fields Count: ${template.fields?.length || 0}`);
      
      if (template.backgroundImage) {
        console.log('✅ Background image URL is present in response');
        
        // Test if the background image URL is accessible
        try {
          const imgRes = await client.get(template.backgroundImage);
          if (imgRes.status === 200) {
            console.log('✅ Background image URL is accessible');
          } else {
            console.log(`⚠️ Background image URL returned status: ${imgRes.status}`);
          }
        } catch (error) {
          console.log(`⚠️ Background image URL test failed: ${error.message}`);
        }
      } else {
        console.log('❌ Background image URL is missing from response');
      }
    } else {
      console.log(`❌ Failed to retrieve template: ${res.status}`);
      console.log(`Response: ${JSON.stringify(res.data, null, 2)}`);
    }

  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Server not running on localhost:3001');
    } else {
      console.log(`❌ Test error: ${error.message}`);
    }
  }
}

// Run test
testTemplateLoading().catch(console.error);
