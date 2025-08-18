#!/usr/bin/env node

/**
 * Test Translation Providers Availability
 * Check which translation providers are available
 */

const fetch = require('node-fetch');

async function testProviderAvailability() {
  console.log('🔧 Testing Translation Provider Availability');
  console.log('=' .repeat(50));

  // Test LibreTranslate public instances
  const libreInstances = [
    'https://libretranslate.com',
    'https://translate.argosopentech.com',
    'https://translate.astian.org',
    'https://translate.mentality.rip'
  ];

  console.log('\n📡 Testing LibreTranslate Instances:');
  console.log('-'.repeat(40));

  for (const instance of libreInstances) {
    try {
      console.log(`\n🔍 Testing: ${instance}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${instance}/languages`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const languages = await response.json();
        console.log(`   ✅ Available - ${languages.length} languages supported`);
        console.log(`   📋 Sample languages: ${languages.slice(0, 5).map(l => l.code).join(', ')}`);
        
        // Test a simple translation
        try {
          const testResponse = await fetch(`${instance}/translate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              q: 'Hello world',
              source: 'en',
              target: 'nl',
              format: 'text'
            })
          });
          
          if (testResponse.ok) {
            const testResult = await testResponse.json();
            console.log(`   🔄 Test translation: "${testResult.translatedText}"`);
          } else {
            console.log(`   ⚠️  Translation test failed: ${testResponse.status}`);
          }
        } catch (testError) {
          console.log(`   ⚠️  Translation test error: ${testError.message}`);
        }
      } else {
        console.log(`   ❌ Unavailable - HTTP ${response.status}`);
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log(`   ❌ Timeout - No response within 5 seconds`);
      } else {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }
  }

  // Test local API endpoint
  console.log('\n\n🏠 Testing Local Translation API:');
  console.log('-'.repeat(40));

  try {
    const response = await fetch('http://localhost:3002/api/translation/translate-text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: 'Hello world',
        sourceLang: 'en',
        targetLang: 'nl',
        domain: 'maritime'
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`✅ Local API working`);
      console.log(`   Translation: "${result.translation}"`);
      console.log(`   Provider: ${result.provider}`);
      console.log(`   Confidence: ${result.confidence}`);
    } else {
      const error = await response.text();
      console.log(`❌ Local API error: ${response.status} - ${error}`);
    }
  } catch (error) {
    console.log(`❌ Local API network error: ${error.message}`);
  }

  console.log('\n\n🎯 Provider Availability Test Complete!');
  console.log('=' .repeat(50));
}

// Run the test
if (require.main === module) {
  testProviderAvailability().catch(console.error);
}

module.exports = { testProviderAvailability };
