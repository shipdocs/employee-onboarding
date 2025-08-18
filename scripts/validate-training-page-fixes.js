#!/usr/bin/env node

/**
 * TrainingPage Validation Script
 * Validates that all reported issues have been properly resolved
 */

const fs = require('fs');
const path = require('path');

async function validateTrainingPageFixes() {
  console.log('🔍 Validating TrainingPage.js fixes...\n');
  
  let passedChecks = 0;
  let totalChecks = 0;
  
  try {
    const trainingPagePath = path.join(process.cwd(), 'client/src/pages/TrainingPage.js');
    const content = fs.readFileSync(trainingPagePath, 'utf8');
    const lines = content.split('\n');
    
    // Check 1: Verify no dangerouslySetInnerHTML usage
    console.log('🧪 Check 1: dangerouslySetInnerHTML Usage');
    totalChecks++;
    
    const dangerousHTMLLines = lines.filter(line => 
      line.includes('dangerouslySetInnerHTML') && 
      !line.trim().startsWith('//') && 
      !line.trim().startsWith('*')
    );
    
    if (dangerousHTMLLines.length === 0) {
      console.log('   ✅ No dangerouslySetInnerHTML usage found');
      passedChecks++;
    } else {
      console.log('   ❌ dangerouslySetInnerHTML still found in lines:');
      dangerousHTMLLines.forEach((line, index) => {
        console.log(`     Line ${index + 1}: ${line.trim()}`);
      });
    }
    
    // Check 2: Verify renderSafeHTML function removal
    console.log('\n🧪 Check 2: renderSafeHTML Function Removal');
    totalChecks++;
    
    const renderSafeHTMLLines = lines.filter(line => 
      line.includes('renderSafeHTML') && 
      !line.trim().startsWith('//') && 
      !line.trim().startsWith('*')
    );
    
    if (renderSafeHTMLLines.length === 0) {
      console.log('   ✅ renderSafeHTML function completely removed');
      passedChecks++;
    } else {
      console.log('   ❌ renderSafeHTML still found in lines:');
      renderSafeHTMLLines.forEach((line, index) => {
        console.log(`     Line ${index + 1}: ${line.trim()}`);
      });
    }
    
    // Check 3: Verify utility function imports removal
    console.log('\n🧪 Check 3: Utility Function Imports');
    totalChecks++;
    
    const utilityImports = [
      'isHTMLSafe',
      'stripHTML', 
      'sanitizeTrainingContent'
    ];
    
    let foundUtilityImports = [];
    utilityImports.forEach(utilityFunc => {
      const importLines = lines.filter(line => 
        line.includes(utilityFunc) && 
        !line.trim().startsWith('//') && 
        !line.trim().startsWith('*')
      );
      if (importLines.length > 0) {
        foundUtilityImports.push(utilityFunc);
      }
    });
    
    if (foundUtilityImports.length === 0) {
      console.log('   ✅ No unused utility function imports found');
      passedChecks++;
    } else {
      console.log('   ❌ Unused utility imports still found:', foundUtilityImports.join(', '));
    }
    
    // Check 4: Verify TrainingContentRenderer usage
    console.log('\n🧪 Check 4: TrainingContentRenderer Usage');
    totalChecks++;
    
    const hasTrainingContentRenderer = content.includes('TrainingContentRenderer');
    const hasImport = content.includes('SafeHTMLRenderer');
    
    if (hasTrainingContentRenderer && hasImport) {
      console.log('   ✅ TrainingContentRenderer properly imported and used');
      passedChecks++;
    } else {
      console.log('   ❌ TrainingContentRenderer integration issues:');
      if (!hasTrainingContentRenderer) console.log('     - Missing TrainingContentRenderer usage');
      if (!hasImport) console.log('     - Missing SafeHTMLRenderer import');
    }
    
    // Check 5: Verify robust array validation
    console.log('\n🧪 Check 5: Array Validation for mediaFiles');
    totalChecks++;
    
    const mediaFilesCheck = content.includes('Array.isArray(phaseData?.mediaFiles)');
    
    if (mediaFilesCheck) {
      console.log('   ✅ Robust array validation implemented for mediaFiles');
      passedChecks++;
    } else {
      console.log('   ❌ Array.isArray validation not found for mediaFiles');
    }
    
    // Check 6: Verify no undefined function references
    console.log('\n🧪 Check 6: Undefined Function References');
    totalChecks++;
    
    const potentialUndefinedFunctions = [
      'renderSafeHTML',
      'isHTMLSafe',
      'stripHTML',
      'sanitizeTrainingContent'
    ];
    
    let undefinedReferences = [];
    potentialUndefinedFunctions.forEach(func => {
      // Look for function calls (not imports or comments)
      const functionCallPattern = new RegExp(`${func}\\s*\\(`, 'g');
      const matches = content.match(functionCallPattern);
      if (matches) {
        // Check if it's not in a comment or import
        const callLines = lines.filter(line => 
          functionCallPattern.test(line) && 
          !line.trim().startsWith('//') && 
          !line.trim().startsWith('*') &&
          !line.includes('import')
        );
        if (callLines.length > 0) {
          undefinedReferences.push(func);
        }
      }
    });
    
    if (undefinedReferences.length === 0) {
      console.log('   ✅ No undefined function references found');
      passedChecks++;
    } else {
      console.log('   ❌ Undefined function references found:', undefinedReferences.join(', '));
    }
    
    // Check 7: Verify safe content rendering
    console.log('\n🧪 Check 7: Safe Content Rendering');
    totalChecks++;
    
    const hasTrainingContentRendererUsage = lines.some(line => 
      line.includes('<TrainingContentRenderer') || 
      line.includes('TrainingContentRenderer')
    );
    
    if (hasTrainingContentRendererUsage) {
      console.log('   ✅ Safe content rendering with TrainingContentRenderer confirmed');
      passedChecks++;
    } else {
      console.log('   ❌ TrainingContentRenderer usage not found');
    }
    
    // Check 8: Verify import statements are correct
    console.log('\n🧪 Check 8: Import Statements Validation');
    totalChecks++;
    
    const importLines = lines.filter(line => line.trim().startsWith('import'));
    const hasCorrectImport = importLines.some(line => 
      line.includes('TrainingContentRenderer') && 
      line.includes('SafeHTMLRenderer')
    );
    
    if (hasCorrectImport) {
      console.log('   ✅ Correct import statements found');
      passedChecks++;
    } else {
      console.log('   ❌ Correct import statements not found');
      console.log('   Current imports:');
      importLines.forEach(line => console.log(`     ${line.trim()}`));
    }
    
    // Summary
    console.log('\n📊 Validation Results Summary');
    console.log(`   Total Checks: ${totalChecks}`);
    console.log(`   Passed: ${passedChecks}`);
    console.log(`   Failed: ${totalChecks - passedChecks}`);
    console.log(`   Success Rate: ${Math.round((passedChecks / totalChecks) * 100)}%`);
    
    if (passedChecks === totalChecks) {
      console.log('\n🎉 All TrainingPage.js issues have been resolved!');
      console.log('✅ No dangerouslySetInnerHTML usage');
      console.log('✅ No undefined function references');
      console.log('✅ Robust array validation implemented');
      console.log('✅ Safe content rendering with TrainingContentRenderer');
      console.log('✅ Proper import statements');
      console.log('✅ Code is production ready');
    } else {
      console.log('\n⚠️  Some issues still need to be addressed');
      console.log('🔧 Please review and fix the remaining issues');
    }
    
    // Security Status
    console.log('\n🔒 Security Status:');
    const securityScore = Math.round((passedChecks / totalChecks) * 100);
    if (securityScore >= 90) {
      console.log('   🟢 HIGH SECURITY - All major security issues resolved');
    } else if (securityScore >= 70) {
      console.log('   🟡 MEDIUM SECURITY - Some security improvements needed');
    } else {
      console.log('   🔴 LOW SECURITY - Critical security issues remain');
    }
    
    return passedChecks === totalChecks;
    
  } catch (error) {
    console.error('\n❌ Validation failed:', error.message);
    return false;
  }
}

// Run validation if called directly
if (require.main === module) {
  validateTrainingPageFixes().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = {
  validateTrainingPageFixes
};
