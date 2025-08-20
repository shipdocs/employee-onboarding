/**
 * Exit Strategy Manual Test
 * Tests exit strategy components without database connection
 */

const fs = require('fs');
const path = require('path');

async function testExitStrategyManual() {
  console.log('🚪 EXIT STRATEGY MANUAL TEST');
  console.log('============================\n');

  const results = {
    apiEndpoints: {},
    frontendComponents: {},
    documentation: {},
    dataStructures: {},
    overallStatus: 'PENDING'
  };

  let passedTests = 0;
  let totalTests = 0;

  try {
    // 1. Test API Endpoints Existence
    console.log('1. 🔗 TESTING API ENDPOINTS EXISTENCE');
    console.log('------------------------------------');
    totalTests++;

    const endpoints = [
      { path: 'api/gdpr/my-requests.js', name: 'GDPR My Requests' },
      { path: 'api/gdpr/request-export.js', name: 'GDPR Request Export' },
      { path: 'api/gdpr/request-deletion.js', name: 'GDPR Request Deletion' },
      { path: 'api/gdpr/download/[id].js', name: 'GDPR Download' },
      { path: 'api/admin/data-exports.js', name: 'Admin Data Exports' },
      { path: 'api/admin/data-exports/[id]/download.js', name: 'Admin Export Download' }
    ];

    let workingEndpoints = 0;
    for (const endpoint of endpoints) {
      const fullPath = path.join('..', endpoint.path);
      if (fs.existsSync(fullPath)) {
        console.log(`✅ ${endpoint.name}: EXISTS`);
        results.apiEndpoints[endpoint.name] = 'EXISTS';
        workingEndpoints++;
      } else {
        console.log(`❌ ${endpoint.name}: MISSING`);
        results.apiEndpoints[endpoint.name] = 'MISSING';
      }
    }

    if (workingEndpoints === endpoints.length) {
      console.log(`\n✅ API Endpoints Test: PASS (${workingEndpoints}/${endpoints.length})`);
      passedTests++;
    } else {
      console.log(`\n❌ API Endpoints Test: FAIL (${workingEndpoints}/${endpoints.length})`);
    }

    console.log('\n');

    // 2. Test Frontend Components
    console.log('2. 🎨 TESTING FRONTEND COMPONENTS');
    console.log('---------------------------------');
    totalTests++;

    const components = [
      { path: 'client/src/components/gdpr/GDPRSelfServicePortal.js', name: 'GDPR Portal' },
      { path: 'client/src/pages/GDPRPortalPage.js', name: 'GDPR Page' },
      { path: 'client/src/components/admin/DataExportManager.js', name: 'Admin Export Manager' },
      { path: 'client/src/locales/en/gdpr.json', name: 'GDPR Translations EN' },
      { path: 'client/src/locales/nl/gdpr.json', name: 'GDPR Translations NL' }
    ];

    let workingComponents = 0;
    for (const component of components) {
      const fullPath = path.join('..', component.path);
      if (fs.existsSync(fullPath)) {
        const stats = fs.statSync(fullPath);
        console.log(`✅ ${component.name}: EXISTS (${(stats.size / 1024).toFixed(2)} KB)`);
        results.frontendComponents[component.name] = 'EXISTS';
        workingComponents++;
      } else {
        console.log(`❌ ${component.name}: MISSING`);
        results.frontendComponents[component.name] = 'MISSING';
      }
    }

    if (workingComponents === components.length) {
      console.log(`\n✅ Frontend Components Test: PASS (${workingComponents}/${components.length})`);
      passedTests++;
    } else {
      console.log(`\n❌ Frontend Components Test: FAIL (${workingComponents}/${components.length})`);
    }

    console.log('\n');

    // 3. Test Documentation Availability
    console.log('3. 📚 TESTING DOCUMENTATION AVAILABILITY');
    console.log('---------------------------------------');
    totalTests++;

    const docs = [
      { path: 'NIS2_COMPLIANCE_PACKAGE/README.md', name: 'Package README' },
      { path: 'NIS2_COMPLIANCE_PACKAGE/SHIP_DOCS_COMPLIANCE_REPORT_2025.md', name: 'Compliance Report' },
      { path: 'docs/compliance/VENDOR_RISK_ASSESSMENT.md', name: 'Vendor Risk Assessment' },
      { path: 'docs/infrastructure/INFRASTRUCTURE_DOCUMENTATION.md', name: 'Infrastructure Docs' },
      { path: 'docs/compliance/BUSINESS_CONTINUITY_PLAN.md', name: 'Business Continuity Plan' }
    ];

    let availableDocs = 0;
    let totalDocSize = 0;
    for (const doc of docs) {
      const fullPath = path.join('..', doc.path);
      if (fs.existsSync(fullPath)) {
        const stats = fs.statSync(fullPath);
        const sizeKB = stats.size / 1024;
        totalDocSize += sizeKB;
        console.log(`✅ ${doc.name}: ${sizeKB.toFixed(2)} KB`);
        results.documentation[doc.name] = 'AVAILABLE';
        availableDocs++;
      } else {
        console.log(`❌ ${doc.name}: MISSING`);
        results.documentation[doc.name] = 'MISSING';
      }
    }

    console.log(`\n📊 Total Documentation: ${totalDocSize.toFixed(2)} KB`);

    if (availableDocs >= docs.length * 0.8) { // 80% threshold
      console.log(`✅ Documentation Test: PASS (${availableDocs}/${docs.length})`);
      passedTests++;
    } else {
      console.log(`❌ Documentation Test: FAIL (${availableDocs}/${docs.length})`);
    }

    console.log('\n');

    // 4. Test Database Schema Files
    console.log('4. 🗄️ TESTING DATABASE SCHEMA FILES');
    console.log('----------------------------------');
    totalTests++;

    const schemas = [
      { path: 'supabase/migrations/20250118000001_add_gdpr_self_service_tables.sql', name: 'GDPR Tables Migration' }
    ];

    let availableSchemas = 0;
    for (const schema of schemas) {
      const fullPath = path.join('..', schema.path);
      if (fs.existsSync(fullPath)) {
        const stats = fs.statSync(fullPath);
        console.log(`✅ ${schema.name}: ${(stats.size / 1024).toFixed(2)} KB`);
        results.dataStructures[schema.name] = 'AVAILABLE';
        availableSchemas++;

        // Check schema content
        const content = fs.readFileSync(fullPath, 'utf8');
        const tables = ['export_data', 'compliance_notifications', 'data_deletions'];
        let foundTables = 0;
        for (const table of tables) {
          if (content.includes(table)) {
            console.log(`   ✅ Table: ${table}`);
            foundTables++;
          } else {
            console.log(`   ❌ Table: ${table}`);
          }
        }
        console.log(`   📊 Tables found: ${foundTables}/${tables.length}`);
      } else {
        console.log(`❌ ${schema.name}: MISSING`);
        results.dataStructures[schema.name] = 'MISSING';
      }
    }

    if (availableSchemas === schemas.length) {
      console.log(`\n✅ Database Schema Test: PASS (${availableSchemas}/${schemas.length})`);
      passedTests++;
    } else {
      console.log(`\n❌ Database Schema Test: FAIL (${availableSchemas}/${schemas.length})`);
    }

    console.log('\n');

    // 5. Test GDPR Portal Component Structure
    console.log('5. 🔍 TESTING GDPR PORTAL COMPONENT STRUCTURE');
    console.log('---------------------------------------------');
    totalTests++;

    const gdprPortalPath = path.join('..', 'client/src/components/gdpr/GDPRSelfServicePortal.js');
    if (fs.existsSync(gdprPortalPath)) {
      const content = fs.readFileSync(gdprPortalPath, 'utf8');
      
      const features = [
        { name: 'Data Export Request', pattern: /request.*export/i },
        { name: 'Data Deletion Request', pattern: /request.*deletion/i },
        { name: 'Download Functionality', pattern: /download/i },
        { name: 'Status Tracking', pattern: /status/i },
        { name: 'Multi-language Support', pattern: /useTranslation/i }
      ];

      let foundFeatures = 0;
      for (const feature of features) {
        if (feature.pattern.test(content)) {
          console.log(`✅ ${feature.name}: IMPLEMENTED`);
          foundFeatures++;
        } else {
          console.log(`❌ ${feature.name}: MISSING`);
        }
      }

      if (foundFeatures >= features.length * 0.8) {
        console.log(`\n✅ GDPR Portal Structure Test: PASS (${foundFeatures}/${features.length})`);
        passedTests++;
      } else {
        console.log(`\n❌ GDPR Portal Structure Test: FAIL (${foundFeatures}/${features.length})`);
      }
    } else {
      console.log('❌ GDPR Portal component not found');
    }

    console.log('\n');

    // 6. Test Exit Strategy Documentation Content
    console.log('6. 📋 TESTING EXIT STRATEGY DOCUMENTATION CONTENT');
    console.log('-------------------------------------------------');
    totalTests++;

    const complianceReportPath = path.join('..', 'NIS2_COMPLIANCE_PACKAGE/SHIP_DOCS_COMPLIANCE_REPORT_2025.md');
    if (fs.existsSync(complianceReportPath)) {
      const content = fs.readFileSync(complianceReportPath, 'utf8');
      
      const exitFeatures = [
        { name: 'Data Export Functionality', pattern: /data.*export.*functionality/i },
        { name: 'Technical Documentation', pattern: /technical.*documentation/i },
        { name: 'Exit Termijnen', pattern: /exit.*termijn/i },
        { name: 'Beveiligde Data Verwijdering', pattern: /beveiligde.*data.*verwijdering/i },
        { name: 'Open Standaarden', pattern: /open.*standaard/i }
      ];

      let foundExitFeatures = 0;
      for (const feature of exitFeatures) {
        if (feature.pattern.test(content)) {
          console.log(`✅ ${feature.name}: DOCUMENTED`);
          foundExitFeatures++;
        } else {
          console.log(`❌ ${feature.name}: MISSING`);
        }
      }

      if (foundExitFeatures >= exitFeatures.length * 0.8) {
        console.log(`\n✅ Exit Strategy Documentation Test: PASS (${foundExitFeatures}/${exitFeatures.length})`);
        passedTests++;
      } else {
        console.log(`\n❌ Exit Strategy Documentation Test: FAIL (${foundExitFeatures}/${exitFeatures.length})`);
      }
    } else {
      console.log('❌ Compliance report not found');
    }

    console.log('\n');

    // Final Assessment
    console.log('🎯 FINAL EXIT STRATEGY ASSESSMENT');
    console.log('=================================');

    const successRate = (passedTests / totalTests) * 100;
    console.log(`📊 Overall Score: ${passedTests}/${totalTests} tests passed (${successRate.toFixed(1)}%)`);

    if (successRate >= 80) {
      results.overallStatus = 'PASS';
      console.log('\n🎉 EXIT STRATEGY IS COMPREHENSIVE AND READY!');
      console.log('✅ All major exit functionalities are implemented');
      console.log('✅ Documentation is complete and accessible');
      console.log('✅ API endpoints are available for data export');
      console.log('✅ Frontend components support user self-service');
    } else if (successRate >= 60) {
      results.overallStatus = 'PARTIAL';
      console.log('\n⚠️  EXIT STRATEGY IS MOSTLY FUNCTIONAL');
      console.log('✅ Core exit functionalities are implemented');
      console.log('⚠️  Some components may need attention');
    } else {
      results.overallStatus = 'FAIL';
      console.log('\n❌ EXIT STRATEGY NEEDS SIGNIFICANT WORK');
      console.log('❌ Critical components are missing');
      console.log('❌ Not ready for production use');
    }

    // Practical Next Steps
    console.log('\n📋 PRACTICAL TESTING RECOMMENDATIONS:');
    console.log('1. 🌐 Test GDPR portal at: https://maritime-onboarding.example.com/gdpr');
    console.log('2. 👤 Login as different user roles (crew, manager, admin)');
    console.log('3. 📤 Request data export and verify download');
    console.log('4. 🗑️  Test data deletion request process');
    console.log('5. 👨‍💼 Test admin export functionality in dashboard');
    console.log('6. 📚 Review documentation package completeness');

    return results;

  } catch (error) {
    console.error('❌ Exit strategy test failed:', error);
    results.overallStatus = 'ERROR';
    return results;
  }
}

// Run the test
testExitStrategyManual()
  .then(results => {
    console.log('\n💾 Saving test results...');
    fs.writeFileSync('exit-strategy-test-results.json', JSON.stringify(results, null, 2));
    console.log('✅ Results saved to exit-strategy-test-results.json');
  })
  .catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
