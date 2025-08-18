// Quick test to verify service integration
const fs = require('fs');
const path = require('path');

console.log('=== Service Integration Test ===\n');

// Test 1: Check api.js exports
console.log('1. Testing api.js exports...');
const apiContent = fs.readFileSync('client/src/services/api.js', 'utf8');
const requiredExports = ['authService', 'contentService', 'adminService', 'managerService', 'crewService'];
let apiExportsPassed = true;

requiredExports.forEach(exp => {
  // Check if service is in the export block
  const exportBlockMatch = apiContent.match(/export\s+\{([^}]+)\}/s);
  if (!exportBlockMatch || !exportBlockMatch[1].includes(exp)) {
    console.log(`   ❌ Missing export: ${exp}`);
    apiExportsPassed = false;
  }
});

if (apiExportsPassed) {
  console.log('   ✅ All required services exported from api.js\n');
} else {
  console.log('   ❌ Some exports missing from api.js\n');
}

// Test 2: Check ContentService methods
console.log('2. Testing ContentService methods...');
const contentService = fs.readFileSync('client/src/services/contentService.js', 'utf8');
const requiredMethods = [
  'getTrainingPhases',
  'createTrainingPhase', 
  'updateTrainingPhase',
  'deleteTrainingPhase',
  'uploadMedia',
  'getContentAnalytics',
  'exportContent',
  'importContent',
  'getVersionHistory',
  'submitForApproval'
];

let methodsPassed = true;
requiredMethods.forEach(method => {
  if (!contentService.includes(`${method}:`)) {
    console.log(`   ❌ Missing method: ${method}`);
    methodsPassed = false;
  }
});

if (methodsPassed) {
  console.log('   ✅ All critical ContentService methods present\n');
} else {
  console.log('   ❌ Some ContentService methods missing\n');
}

// Test 3: Check for import errors
console.log('3. Testing import chains...');
const authServiceContent = fs.readFileSync('client/src/services/authService.js', 'utf8');
const apiClientContent = fs.readFileSync('client/src/services/apiClient.js', 'utf8');

const authImportsCorrect = authServiceContent.includes("import api from './apiClient'");
const apiClientHasAxios = apiClientContent.includes("import axios from 'axios'");
const apiClientHasToast = apiClientContent.includes("import toast from 'react-hot-toast'");

console.log(`   AuthService imports apiClient: ${authImportsCorrect ? '✅' : '❌'}`);
console.log(`   ApiClient imports axios: ${apiClientHasAxios ? '✅' : '❌'}`);
console.log(`   ApiClient imports toast: ${apiClientHasToast ? '✅' : '❌'}\n`);

// Test 4: Check for circular dependencies
console.log('4. Checking for circular dependencies...');
const indexContent = fs.readFileSync('client/src/services/index.js', 'utf8');
const hasCircularImport = indexContent.includes("import api from './api'");

if (hasCircularImport) {
  console.log('   ❌ Circular dependency detected in index.js\n');
} else {
  console.log('   ✅ No circular dependencies\n');
}

// Test 5: Sample component import test
console.log('5. Testing component imports...');
const loginPageContent = fs.readFileSync('client/src/pages/LoginPage.js', 'utf8');
const contentMgmtContent = fs.readFileSync('client/src/pages/ContentManagementPage.js', 'utf8');

const loginImportsAuth = loginPageContent.includes("import { authService } from '../services/api'");
const contentImportsServices = contentMgmtContent.includes("import { contentService, workflowService } from '../services/api'");

console.log(`   LoginPage imports authService: ${loginImportsAuth ? '✅' : '❌'}`);
console.log(`   ContentManagementPage imports services: ${contentImportsServices ? '✅' : '❌'}\n`);

// Summary
console.log('=== Summary ===');
const allPassed = apiExportsPassed && methodsPassed && authImportsCorrect && 
                  apiClientHasAxios && apiClientHasToast && !hasCircularImport &&
                  loginImportsAuth && contentImportsServices;

if (allPassed) {
  console.log('✅ All tests passed - Refactor appears functional');
} else {
  console.log('❌ Some tests failed - Refactor has issues');
}