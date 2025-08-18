#!/usr/bin/env node

/**
 * Test Translation API Endpoints
 * Tests the translation system locally with online database
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3002';

// Test data
const testTexts = [
  'Safety training is mandatory for all crew members',
  'Emergency procedures must be followed at all times',
  'Life jacket inspection completed successfully',
  'Navigation equipment check required',
  'Fire drill scheduled for tomorrow morning'
];

const testLanguages = ['nl', 'de', 'fr', 'es'];

async function testTranslationAPI() {
  console.log('🌍 Testing Translation API');
  console.log('=' .repeat(50));
  console.log(`Base URL: ${BASE_URL}`);
  console.log('');

  // Test 1: Single text translation
  console.log('📝 Test 1: Single Text Translation');
  console.log('-'.repeat(30));
  
  for (const text of testTexts.slice(0, 2)) { // Test first 2 texts
    for (const targetLang of testLanguages.slice(0, 2)) { // Test first 2 languages
      try {
        console.log(`\n🔄 Translating: "${text}"`);
        console.log(`   EN → ${targetLang.toUpperCase()}`);
        
        const response = await fetch(`${BASE_URL}/api/translation/translate-text`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: text,
            sourceLang: 'en',
            targetLang: targetLang,
            domain: 'maritime'
          })
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`   ✅ Translation: "${result.translation}"`);
          console.log(`   📊 Confidence: ${result.confidence}`);
          console.log(`   🔧 Provider: ${result.provider}`);
          console.log(`   ⚓ Maritime Enhanced: ${result.maritimeEnhanced || false}`);
        } else {
          const error = await response.text();
          console.log(`   ❌ Error: ${response.status} - ${error}`);
        }
      } catch (error) {
        console.log(`   ❌ Network Error: ${error.message}`);
      }
    }
  }

  // Test 2: Language Detection
  console.log('\n\n🔍 Test 2: Language Detection');
  console.log('-'.repeat(30));
  
  const detectTexts = [
    'Veiligheidstraining is verplicht voor alle bemanningsleden',
    'Sicherheitsschulung ist für alle Besatzungsmitglieder obligatorisch',
    'La formation à la sécurité est obligatoire pour tous les membres d\'équipage'
  ];

  for (const text of detectTexts) {
    try {
      console.log(`\n🔍 Detecting: "${text}"`);
      
      const response = await fetch(`${BASE_URL}/api/translation/detect-language`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text })
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`   ✅ Detected: ${result.language} (confidence: ${result.confidence})`);
        if (result.alternatives) {
          console.log(`   📋 Alternatives: ${result.alternatives.map(a => `${a.language}(${a.confidence})`).join(', ')}`);
        }
      } else {
        const error = await response.text();
        console.log(`   ❌ Error: ${response.status} - ${error}`);
      }
    } catch (error) {
      console.log(`   ❌ Network Error: ${error.message}`);
    }
  }

  // Test 3: Batch Translation
  console.log('\n\n📦 Test 3: Batch Translation');
  console.log('-'.repeat(30));
  
  try {
    console.log(`\n📦 Batch translating ${testTexts.length} texts to Dutch`);
    
    const response = await fetch(`${BASE_URL}/api/translation/batch-translate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        texts: testTexts,
        sourceLang: 'en',
        targetLangs: ['nl'],
        domain: 'maritime'
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`   ✅ Batch completed in ${result.processingTime}ms`);
      console.log(`   📊 Total translations: ${result.totalTranslations}`);
      console.log(`   📈 Success rate: ${result.successRate}%`);
      
      if (result.results && result.results.nl) {
        console.log('\n   📝 Results:');
        result.results.nl.forEach((translation, index) => {
          if (!translation.error) {
            console.log(`   ${index + 1}. "${translation.translation}" (${translation.confidence})`);
          } else {
            console.log(`   ${index + 1}. ❌ Error: ${translation.error}`);
          }
        });
      }
    } else {
      const error = await response.text();
      console.log(`   ❌ Error: ${response.status} - ${error}`);
    }
  } catch (error) {
    console.log(`   ❌ Network Error: ${error.message}`);
  }

  console.log('\n\n🎯 Translation API Test Complete!');
  console.log('=' .repeat(50));
}

// Run the test
if (require.main === module) {
  testTranslationAPI().catch(console.error);
}

module.exports = { testTranslationAPI };
