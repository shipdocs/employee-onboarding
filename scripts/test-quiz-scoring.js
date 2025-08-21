#!/usr/bin/env node

/**
 * Test script for quiz scoring functionality
 * Tests the real scoring implementation against various answer scenarios
 */

const { calculateScore, validateAnswer, normalizeText } = require('../api/training/quiz/scoring');

// Test questions from phase 1
const testQuestions = [
  {
    id: "p1_q2",
    type: "multiple_choice",
    question: "What is the first action you should take when the general alarm sounds?",
    options: [
      "Continue with current work",
      "Report to muster station immediately", 
      "Call the captain",
      "Check the Red Book"
    ],
    correctAnswer: 1,
    points: 8
  },
  {
    id: "p1_q3",
    type: "yes_no",
    question: "Is it acceptable to use a damaged life jacket during an emergency?",
    correctAnswer: false,
    points: 6
  },
  {
    id: "p1_q4",
    type: "fill_in_gaps",
    question: "Complete the emergency signal: Seven short blasts followed by _____ long blast(s) indicates _____ alarm.",
    correctAnswers: ["one", "abandon ship"],
    variations: [
      ["1", "abandon ship"],
      ["one", "abandon-ship"],
      ["1", "abandon-ship"]
    ],
    points: 10
  },
  {
    id: "p1_q5",
    type: "drag_order",
    question: "Arrange the following actions in the correct order when discovering a fire:",
    items: [
      "Raise the alarm",
      "Attempt to extinguish if safe to do so",
      "Evacuate the area if fire cannot be controlled",
      "Report to bridge/duty officer"
    ],
    correctOrder: [0, 3, 1, 2],
    points: 12
  }
];

// Test cases
const testCases = [
  {
    name: "All correct answers",
    answers: [
      1, // Multiple choice - correct
      false, // Yes/no - correct
      ["one", "abandon ship"], // Fill in gaps - correct
      [0, 3, 1, 2] // Drag order - correct
    ],
    expectedScore: 36,
    expectedPercentage: 100,
    expectedPassed: true
  },
  {
    name: "All incorrect answers",
    answers: [
      0, // Multiple choice - wrong
      true, // Yes/no - wrong
      ["two", "fire drill"], // Fill in gaps - wrong
      [1, 2, 3, 0] // Drag order - wrong
    ],
    expectedScore: 0,
    expectedPercentage: 0,
    expectedPassed: false
  },
  {
    name: "Mixed correct/incorrect (80% threshold test)",
    answers: [
      1, // Multiple choice - correct (8 points)
      false, // Yes/no - correct (6 points)
      ["1", "abandon ship"], // Fill in gaps - correct with variation (10 points)
      [1, 2, 3, 0] // Drag order - wrong (0 points)
    ],
    expectedScore: 24,
    expectedPercentage: 67, // 24/36 = 66.67%
    expectedPassed: false
  },
  {
    name: "Some unanswered questions",
    answers: [
      1, // Multiple choice - correct
      undefined, // Yes/no - unanswered
      ["one", "abandon ship"], // Fill in gaps - correct
      null // Drag order - unanswered
    ],
    expectedScore: 18,
    expectedPercentage: 50,
    expectedPassed: false
  }
];

console.log('🧪 Testing Quiz Scoring Implementation\n');
console.log('=' .repeat(50));

// Test individual answer validation
console.log('\n📝 Testing Individual Answer Validation:');
console.log('-'.repeat(50));

// Test multiple choice
const mcResult = validateAnswer(testQuestions[0], 1);
console.log('Multiple Choice (correct):', mcResult);

const mcWrong = validateAnswer(testQuestions[0], 0);
console.log('Multiple Choice (wrong):', mcWrong);

// Test yes/no
const ynResult = validateAnswer(testQuestions[1], false);
console.log('Yes/No (correct):', ynResult);

// Test fill in gaps with variation
const figResult = validateAnswer(testQuestions[2], ["1", "abandon-ship"]);
console.log('Fill in Gaps (variation):', figResult);

// Test text normalization
console.log('\n🔤 Testing Text Normalization:');
console.log('-'.repeat(50));
console.log('Input: "  ONE  " → Output:', `"${normalizeText("  ONE  ")}"`);
console.log('Input: "abandon-ship" → Output:', `"${normalizeText("abandon-ship")}"`);
console.log('Input: "Abandon Ship" → Output:', `"${normalizeText("Abandon Ship")}"`);

// Run test cases
console.log('\n🎯 Running Full Scoring Test Cases:');
console.log('=' .repeat(50));

let allTestsPassed = true;

testCases.forEach((testCase, index) => {
  console.log(`\nTest Case ${index + 1}: ${testCase.name}`);
  console.log('-'.repeat(40));
  
  try {
    const result = calculateScore(testQuestions, testCase.answers);
    
    console.log('Results:');
    console.log(`  - Earned Points: ${result.earnedPoints}/${result.totalPoints}`);
    console.log(`  - Percentage: ${result.percentage}%`);
    console.log(`  - Passed: ${result.passed}`);
    console.log(`  - Correct Answers: ${result.correctAnswers}/${result.totalQuestions}`);
    console.log(`  - Unanswered: ${result.unansweredQuestions.length}`);
    
    // Verify expectations
    const scoreMatch = result.earnedPoints === testCase.expectedScore;
    const percentageMatch = result.percentage === testCase.expectedPercentage;
    const passedMatch = result.passed === testCase.expectedPassed;
    
    if (scoreMatch && percentageMatch && passedMatch) {
      console.log('✅ Test PASSED');
    } else {
      console.log('❌ Test FAILED');
      if (!scoreMatch) console.log(`   Expected score: ${testCase.expectedScore}, got: ${result.earnedPoints}`);
      if (!percentageMatch) console.log(`   Expected percentage: ${testCase.expectedPercentage}%, got: ${result.percentage}%`);
      if (!passedMatch) console.log(`   Expected passed: ${testCase.expectedPassed}, got: ${result.passed}`);
      allTestsPassed = false;
    }
    
  } catch (error) {
    console.log('❌ Test FAILED with error:', error.message);
    allTestsPassed = false;
  }
});

// Summary
console.log('\n' + '='.repeat(50));
console.log(allTestsPassed ? '✅ All tests passed!' : '❌ Some tests failed!');
console.log('='.repeat(50));

// Test edge cases
console.log('\n🔍 Testing Edge Cases:');
console.log('-'.repeat(50));

// Test empty arrays
try {
  calculateScore([], []);
  console.log('✅ Empty arrays handled correctly');
} catch (error) {
  console.log('❌ Empty arrays error:', error.message);
}

// Test mismatched array lengths
try {
  const result = calculateScore(testQuestions, [1, 2]);
  console.log('✅ Mismatched array lengths handled correctly');
  console.log(`   Unanswered questions: ${result.unansweredQuestions.length}`);
} catch (error) {
  console.log('❌ Mismatched arrays error:', error.message);
}

console.log('\n✨ Quiz scoring test complete!');