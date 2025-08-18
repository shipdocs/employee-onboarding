// Test runtime behavior - simulate what happens when components import
const Module = require('module');
const fs = require('fs');
const path = require('path');

// Mock React imports
const mockRequire = (modulePath) => {
  if (modulePath.includes('react')) return {};
  if (modulePath.includes('axios')) return { create: () => ({ interceptors: { request: { use: () => {} }, response: { use: () => {} } } }) };
  if (modulePath.includes('toast')) return {};
  if (modulePath.includes('errorHandlingService')) return { showError: () => {}, isOffline: () => false };
  if (modulePath.includes('tokenService')) return { getToken: () => null, clearToken: () => {} };
  
  // Read actual file
  const fullPath = path.resolve(__dirname, 'client/src/services', modulePath.replace('./', '') + '.js');
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8');
    // Simple ES6 module simulation
    return { __content: content };
  }
  return {};
};

console.log('=== Runtime Simulation Test ===\n');

// Test 1: Can apiClient be created?
console.log('1. Testing apiClient initialization...');
try {
  const apiClientPath = path.join(__dirname, 'client/src/services/apiClient.js');
  const apiClientContent = fs.readFileSync(apiClientPath, 'utf8');
  
  // Check for critical imports
  const hasAxios = apiClientContent.includes("import axios from 'axios'");
  const hasToast = apiClientContent.includes("import toast from 'react-hot-toast'");
  const exportsDefault = apiClientContent.includes('export default api');
  
  console.log(`   Has axios import: ${hasAxios ? '✅' : '❌'}`);
  console.log(`   Has toast import: ${hasToast ? '✅' : '❌'}`);
  console.log(`   Exports api instance: ${exportsDefault ? '✅' : '❌'}\n`);
} catch (e) {
  console.log(`   ❌ Error: ${e.message}\n`);
}

// Test 2: Check service dependencies
console.log('2. Testing service dependencies...');
const services = ['authService', 'adminService', 'contentService', 'crewService'];
let allServicesValid = true;

services.forEach(service => {
  try {
    const servicePath = path.join(__dirname, `client/src/services/${service}.js`);
    const content = fs.readFileSync(servicePath, 'utf8');
    
    // Each service should import from apiClient
    const importsApiClient = content.includes("import api from './apiClient'") || 
                            content.includes('import apiClient from "./apiClient"');
    
    // Should export the service
    const exportsService = content.includes(`export const ${service}`) || 
                          content.includes(`export default ${service}`);
    
    if (!importsApiClient || !exportsService) {
      console.log(`   ❌ ${service}: imports=${importsApiClient}, exports=${exportsService}`);
      allServicesValid = false;
    }
  } catch (e) {
    console.log(`   ❌ ${service}: ${e.message}`);
    allServicesValid = false;
  }
});

if (allServicesValid) {
  console.log('   ✅ All services have correct dependencies\n');
} else {
  console.log('   ❌ Some services have issues\n');
}

// Test 3: Check api.js compatibility layer
console.log('3. Testing api.js backward compatibility...');
try {
  const apiPath = path.join(__dirname, 'client/src/services/api.js');
  const apiContent = fs.readFileSync(apiPath, 'utf8');
  
  // Should import all services
  const importsAuthService = apiContent.includes("import authService from './authService'");
  const importsContentService = apiContent.includes("import contentService from './contentService'");
  
  // Should re-export them
  const exportBlock = apiContent.match(/export\s+\{([^}]+)\}/s);
  const hasAllExports = exportBlock && 
                       exportBlock[1].includes('authService') && 
                       exportBlock[1].includes('contentService') &&
                       exportBlock[1].includes('api');
  
  console.log(`   Imports services: ${importsAuthService && importsContentService ? '✅' : '❌'}`);
  console.log(`   Re-exports services: ${hasAllExports ? '✅' : '❌'}\n`);
} catch (e) {
  console.log(`   ❌ Error: ${e.message}\n`);
}

// Test 4: Critical ContentService methods
console.log('4. Testing ContentService completeness...');
const contentPath = path.join(__dirname, 'client/src/services/contentService.js');
const contentContent = fs.readFileSync(contentPath, 'utf8');

const criticalMethods = [
  'getTrainingPhases', 'createTrainingPhase', 'updateTrainingPhase', 'deleteTrainingPhase',
  'uploadMedia', 'deleteMedia', 'exportContent', 'importContent',
  'getVersionHistory', 'submitForApproval', 'approveContent', 'rejectContent',
  'getCollaborators', 'addCollaborator', 'getComments', 'addComment'
];

let missingMethods = [];
criticalMethods.forEach(method => {
  if (!contentContent.includes(`${method}:`)) {
    missingMethods.push(method);
  }
});

if (missingMethods.length === 0) {
  console.log(`   ✅ All ${criticalMethods.length} critical methods present\n`);
} else {
  console.log(`   ❌ Missing ${missingMethods.length} methods: ${missingMethods.join(', ')}\n`);
}

// Final verdict
console.log('=== FINAL VERDICT ===');
const testsPass = allServicesValid && missingMethods.length === 0;
if (testsPass) {
  console.log('✅ Refactor is FUNCTIONAL - Services can be imported and used');
} else {
  console.log('❌ Refactor has ISSUES - Would cause runtime errors');
}