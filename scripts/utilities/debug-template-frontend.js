// Debug script to test the template API endpoint that the frontend uses
const https = require('https');
const http = require('http');

async function testTemplateAPI() {
  console.log('🔍 Testing Template API Endpoint for Template ID 1...\n');
  
  // Get auth token (you'll need to replace this with a valid admin token)
  const authToken = process.env.AUTH_TOKEN || null;
  
  if (!authToken) {
    console.log('⚠️  No AUTH_TOKEN environment variable set.');
    console.log('To test the actual API endpoint, you need a valid admin JWT token.');
    console.log('You can get one by:');
    console.log('1. Logging into the admin panel');
    console.log('2. Opening browser dev tools');
    console.log('3. Going to Application/Storage > Local Storage');
    console.log('4. Copying the "token" value');
    console.log('5. Running: AUTH_TOKEN="your_token_here" node debug-template-frontend.js');
    console.log('');
    console.log('For now, testing without authentication (will likely fail with 401)...\n');
  }
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/templates/1',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    }
  };
  
  if (authToken) {
    options.headers['Authorization'] = `Bearer ${authToken}`;
  }
  
  console.log('📡 Making request to:', `http://${options.hostname}:${options.port}${options.path}`);
  console.log('🔑 Auth header:', authToken ? 'Present' : 'Missing');
  console.log('');
  
  const req = http.request(options, (res) => {
    console.log('📊 Response Status:', res.statusCode);
    console.log('📋 Response Headers:');
    Object.keys(res.headers).forEach(key => {
      console.log(`  ${key}: ${res.headers[key]}`);
    });
    console.log('');
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        if (res.statusCode === 200) {
          const template = JSON.parse(data);
          console.log('✅ Template loaded successfully:');
          console.log('  - ID:', template.id);
          console.log('  - Name:', template.name);
          console.log('  - Background Image:', template.backgroundImage ? 'Present' : 'Not set');
          console.log('  - Background Image URL:', template.backgroundImage?.substring(0, 80) + '...');
          console.log('  - Fields Count:', template.fields?.length || 0);
          console.log('  - Page Size:', template.pageSize);
          console.log('  - Orientation:', template.orientation);
          
          console.log('\n🎯 Frontend Template Object:');
          console.log(JSON.stringify(template, null, 2));
          
          if (template.backgroundImage) {
            console.log('\n✅ Background image should now display in the canvas');
            console.log('🔍 Debug in browser:');
            console.log('1. Open PDF Template Editor for template ID 1');
            console.log('2. Check browser dev tools console for any errors');
            console.log('3. Check Network tab for failed image requests');
            console.log('4. Inspect the canvas element to verify background-image CSS property');
          }
        } else {
          console.log('❌ API Error Response:');
          console.log(data);
          
          if (res.statusCode === 401) {
            console.log('\n🔑 Authentication required. Please provide a valid AUTH_TOKEN.');
          }
        }
      } catch (parseError) {
        console.error('❌ Error parsing response:', parseError);
        console.log('Raw response:', data);
      }
    });
  });
  
  req.on('error', (error) => {
    console.error('❌ Request error:', error.message);
    console.log('\n💡 Make sure the development server is running:');
    console.log('  npm run dev');
    console.log('  or');
    console.log('  cd client && npm start');
  });
  
  req.end();
}

testTemplateAPI();