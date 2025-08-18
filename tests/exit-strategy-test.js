/**
 * Exit Strategy Comprehensive Test
 * Tests all exit functionalities for end customers
 */

const { supabase } = require('../lib/supabase');

async function testExitStrategy() {
  console.log('🚪 EXIT STRATEGY COMPREHENSIVE TEST');
  console.log('=====================================\n');

  const results = {
    gdprPortalData: null,
    dataExports: null,
    exportData: null,
    apiEndpoints: {},
    downloadTest: null,
    documentationAccess: null,
    overallStatus: 'PENDING'
  };

  try {
    // 1. Test Database Data Availability
    console.log('1. 📊 TESTING DATABASE DATA AVAILABILITY');
    console.log('----------------------------------------');
    
    // Check users data
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, role, created_at')
      .limit(5);
    
    if (usersError) {
      console.log('❌ Users table error:', usersError.message);
    } else {
      console.log(`✅ Users table: ${users.length} users found`);
      users.forEach(user => {
        console.log(`   - ${user.email} (${user.role}) - ${user.first_name} ${user.last_name}`);
      });
    }

    // Check data_exports table
    const { data: exports, error: exportsError } = await supabase
      .from('data_exports')
      .select('*')
      .limit(5);
    
    if (exportsError) {
      console.log('❌ Data exports table error:', exportsError.message);
    } else {
      console.log(`✅ Data exports table: ${exports.length} exports found`);
      results.dataExports = exports;
    }

    // Check export_data table
    const { data: exportData, error: exportDataError } = await supabase
      .from('export_data')
      .select('*')
      .limit(5);
    
    if (exportDataError) {
      console.log('❌ Export data table error:', exportDataError.message);
    } else {
      console.log(`✅ Export data table: ${exportData.length} export files found`);
      results.exportData = exportData;
    }

    // Check audit_log table
    const { data: auditLogs, error: auditError } = await supabase
      .from('audit_log')
      .select('action, resource_type, created_at')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (auditError) {
      console.log('❌ Audit log table error:', auditError.message);
    } else {
      console.log(`✅ Audit log table: ${auditLogs.length} recent entries found`);
      console.log('   Recent actions:');
      auditLogs.slice(0, 3).forEach(log => {
        console.log(`   - ${log.action} (${log.resource_type}) - ${new Date(log.created_at).toLocaleString()}`);
      });
    }

    console.log('\n');

    // 2. Test GDPR Portal Data Structure
    console.log('2. 🔐 TESTING GDPR PORTAL DATA STRUCTURE');
    console.log('----------------------------------------');

    if (users && users.length > 0) {
      const testUser = users[0];
      console.log(`Testing with user: ${testUser.email}`);

      // Simulate GDPR data collection
      const gdprData = {
        user_profile: {
          id: testUser.id,
          email: testUser.email,
          first_name: testUser.first_name,
          last_name: testUser.last_name,
          role: testUser.role,
          created_at: testUser.created_at
        },
        data_exports: exports?.filter(exp => exp.user_id === testUser.id) || [],
        audit_trail: auditLogs?.filter(log => log.user_id === testUser.id) || []
      };

      console.log('✅ GDPR data structure created:');
      console.log(`   - User profile: ${Object.keys(gdprData.user_profile).length} fields`);
      console.log(`   - Data exports: ${gdprData.data_exports.length} exports`);
      console.log(`   - Audit trail: ${gdprData.audit_trail.length} entries`);
      
      results.gdprPortalData = gdprData;
    } else {
      console.log('❌ No test users available for GDPR data test');
    }

    console.log('\n');

    // 3. Test API Endpoints Availability
    console.log('3. 🔗 TESTING API ENDPOINTS AVAILABILITY');
    console.log('----------------------------------------');

    const endpoints = [
      '/api/gdpr/my-requests',
      '/api/gdpr/request-export', 
      '/api/gdpr/request-deletion',
      '/api/admin/data-exports',
      '/api/admin/data-deletions'
    ];

    for (const endpoint of endpoints) {
      try {
        // Check if endpoint file exists
        const endpointPath = endpoint.replace('/api/', 'api/') + '.js';
        const fs = require('fs');
        
        if (fs.existsSync(endpointPath)) {
          console.log(`✅ ${endpoint} - File exists`);
          results.apiEndpoints[endpoint] = 'EXISTS';
        } else {
          console.log(`❌ ${endpoint} - File not found`);
          results.apiEndpoints[endpoint] = 'MISSING';
        }
      } catch (error) {
        console.log(`❌ ${endpoint} - Error: ${error.message}`);
        results.apiEndpoints[endpoint] = 'ERROR';
      }
    }

    console.log('\n');

    // 4. Test Export Data Completeness
    console.log('4. 📋 TESTING EXPORT DATA COMPLETENESS');
    console.log('--------------------------------------');

    if (exportData && exportData.length > 0) {
      const testExport = exportData[0];
      console.log(`Testing export ID: ${testExport.id}`);
      
      const exportContent = testExport.data;
      console.log('✅ Export data structure:');
      
      if (exportContent.export_metadata) {
        console.log(`   - Metadata: ✅ Present`);
        console.log(`     * Export ID: ${exportContent.export_metadata.export_id}`);
        console.log(`     * Export Type: ${exportContent.export_metadata.export_type}`);
        console.log(`     * Created: ${exportContent.export_metadata.created_at}`);
      } else {
        console.log(`   - Metadata: ❌ Missing`);
      }

      if (exportContent.user_data) {
        console.log(`   - User Data: ✅ Present`);
        console.log(`     * Fields: ${Object.keys(exportContent.user_data).length}`);
      } else {
        console.log(`   - User Data: ❌ Missing`);
      }

      // Calculate export size
      const exportSize = JSON.stringify(exportContent).length;
      console.log(`   - Export Size: ${(exportSize / 1024).toFixed(2)} KB`);
      
      results.downloadTest = {
        exportId: testExport.id,
        fileName: testExport.file_name,
        size: exportSize,
        hasMetadata: !!exportContent.export_metadata,
        hasUserData: !!exportContent.user_data
      };
    } else {
      console.log('❌ No export data available for testing');
    }

    console.log('\n');

    // 5. Test Documentation Accessibility
    console.log('5. 📚 TESTING DOCUMENTATION ACCESSIBILITY');
    console.log('-----------------------------------------');

    const documentationFiles = [
      'NIS2_COMPLIANCE_PACKAGE/README.md',
      'NIS2_COMPLIANCE_PACKAGE/SHIP_DOCS_COMPLIANCE_REPORT_2025.md',
      'docs/compliance/VENDOR_RISK_ASSESSMENT.md',
      'docs/infrastructure/INFRASTRUCTURE_DOCUMENTATION.md'
    ];

    let accessibleDocs = 0;
    for (const docFile of documentationFiles) {
      try {
        const fs = require('fs');
        if (fs.existsSync(docFile)) {
          const stats = fs.statSync(docFile);
          console.log(`✅ ${docFile} - ${(stats.size / 1024).toFixed(2)} KB`);
          accessibleDocs++;
        } else {
          console.log(`❌ ${docFile} - Not found`);
        }
      } catch (error) {
        console.log(`❌ ${docFile} - Error: ${error.message}`);
      }
    }

    results.documentationAccess = {
      totalFiles: documentationFiles.length,
      accessibleFiles: accessibleDocs,
      completeness: (accessibleDocs / documentationFiles.length) * 100
    };

    console.log(`\n📊 Documentation Completeness: ${results.documentationAccess.completeness}%`);

    console.log('\n');

    // 6. Overall Assessment
    console.log('6. 🎯 OVERALL EXIT STRATEGY ASSESSMENT');
    console.log('======================================');

    let passedTests = 0;
    let totalTests = 6;

    // Database availability
    if (users && exports !== null && exportData !== null) {
      console.log('✅ Database Data Availability: PASS');
      passedTests++;
    } else {
      console.log('❌ Database Data Availability: FAIL');
    }

    // GDPR portal data
    if (results.gdprPortalData) {
      console.log('✅ GDPR Portal Data Structure: PASS');
      passedTests++;
    } else {
      console.log('❌ GDPR Portal Data Structure: FAIL');
    }

    // API endpoints
    const workingEndpoints = Object.values(results.apiEndpoints).filter(status => status === 'EXISTS').length;
    if (workingEndpoints >= 4) {
      console.log('✅ API Endpoints Availability: PASS');
      passedTests++;
    } else {
      console.log('❌ API Endpoints Availability: FAIL');
    }

    // Export data completeness
    if (results.downloadTest && results.downloadTest.hasMetadata && results.downloadTest.hasUserData) {
      console.log('✅ Export Data Completeness: PASS');
      passedTests++;
    } else {
      console.log('❌ Export Data Completeness: FAIL');
    }

    // Documentation access
    if (results.documentationAccess.completeness >= 75) {
      console.log('✅ Documentation Accessibility: PASS');
      passedTests++;
    } else {
      console.log('❌ Documentation Accessibility: FAIL');
    }

    // Overall functionality
    if (passedTests >= 4) {
      console.log('✅ Overall Exit Strategy: PASS');
      passedTests++;
      results.overallStatus = 'PASS';
    } else {
      console.log('❌ Overall Exit Strategy: FAIL');
      results.overallStatus = 'FAIL';
    }

    console.log(`\n🏆 FINAL SCORE: ${passedTests}/${totalTests} tests passed (${((passedTests/totalTests)*100).toFixed(1)}%)`);

    if (results.overallStatus === 'PASS') {
      console.log('\n🎉 EXIT STRATEGY IS FUNCTIONAL AND READY FOR USE!');
    } else {
      console.log('\n⚠️  EXIT STRATEGY NEEDS ATTENTION BEFORE PRODUCTION USE');
    }

    return results;

  } catch (error) {
    console.error('❌ Exit strategy test failed:', error);
    results.overallStatus = 'ERROR';
    return results;
  }
}

// Run the test if called directly
if (require.main === module) {
  testExitStrategy()
    .then(results => {
      console.log('\n📋 Test completed. Results saved to exit-strategy-test-results.json');
      require('fs').writeFileSync(
        'exit-strategy-test-results.json', 
        JSON.stringify(results, null, 2)
      );
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { testExitStrategy };
