/**
 * Debug Translation System
 * Test the translation API endpoints directly
 */

async function testTranslationAPI() {
  console.log('Testing Translation API...');
  
  try {
    // Test single translation
    console.log('\n=== Testing Single Translation ===');
    const singleResponse = await fetch('http://localhost:3001/api/translation/translate-text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: 'Welcome to our maritime training program',
        sourceLang: 'en',
        targetLang: 'nl',
        domain: 'maritime'
      })
    });

    if (singleResponse.ok) {
      const singleResult = await singleResponse.json();
      console.log('Single translation result:', singleResult);
    } else {
      console.error('Single translation failed:', singleResponse.status, await singleResponse.text());
    }

    // Test batch translation
    console.log('\n=== Testing Batch Translation ===');
    const batchResponse = await fetch('http://localhost:3001/api/translation/batch-translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        texts: ['Welcome aboard our maritime training program'],
        sourceLang: 'en',
        targetLangs: ['nl', 'de', 'fr', 'es']
      })
    });

    if (batchResponse.ok) {
      const batchResult = await batchResponse.json();
      console.log('Batch translation result:', JSON.stringify(batchResult, null, 2));
    } else {
      console.error('Batch translation failed:', batchResponse.status, await batchResponse.text());
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Test with LibreTranslate directly
async function testLibreTranslateDirectly() {
  console.log('\n=== Testing LibreTranslate Directly ===');
  
  const instances = [
    'https://libretranslate.com',
    'https://translate.argosopentech.com',
    'https://translate.astian.org'
  ];

  for (const instance of instances) {
    try {
      console.log(`Testing ${instance}...`);
      
      const response = await fetch(`${instance}/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: 'Welcome to our maritime training program',
          source: 'en',
          target: 'nl'
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`${instance} result:`, result);
      } else {
        console.error(`${instance} failed:`, response.status, await response.text());
      }
    } catch (error) {
      console.error(`${instance} error:`, error.message);
    }
  }
}

// Run tests
console.log('Starting translation tests...');
testLibreTranslateDirectly()
  .then(() => testTranslationAPI())
  .then(() => console.log('\nTests completed!'))
  .catch(console.error);