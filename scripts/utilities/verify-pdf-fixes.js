// Verification script for PDF Template Editor fixes
const fs = require('fs');
const path = require('path');

class PDFFixVerifier {
  constructor() {
    this.fixes = [];
    this.issues = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`${prefix} ${message}`);
  }

  // Verify Fix 1: Enhanced Background Image Upload
  verifyBackgroundImageUploadFix() {
    this.log('\n🔍 Verifying Fix 1: Enhanced Background Image Upload', 'info');
    
    try {
      const templateApiPath = path.join(process.cwd(), 'api', 'templates', '[id].js');
      
      if (!fs.existsSync(templateApiPath)) {
        this.issues.push('Template API file not found');
        this.log('Template API file not found', 'error');
        return false;
      }

      const content = fs.readFileSync(templateApiPath, 'utf8');
      
      // Check for enhanced upload function
      const hasEnhancedUpload = content.includes('listBuckets()') && 
                               content.includes('documentsBucket') &&
                               content.includes('upsert: true');
      
      const hasErrorHandling = content.includes('Storage upload error:') &&
                              content.includes('alternative storage approach');
      
      const hasFallbackPath = content.includes('simplePath') &&
                             content.includes('Alternative upload also failed');

      if (hasEnhancedUpload && hasErrorHandling && hasFallbackPath) {
        this.fixes.push('Enhanced Background Image Upload with bucket verification and fallback');
        this.log('Enhanced background image upload function found', 'success');
        this.log('  ✓ Bucket verification implemented', 'success');
        this.log('  ✓ Error handling enhanced', 'success');
        this.log('  ✓ Fallback upload strategy added', 'success');
        return true;
      } else {
        this.issues.push('Background image upload enhancements incomplete');
        this.log('Background image upload enhancements incomplete', 'error');
        this.log(`  - Bucket verification: ${hasEnhancedUpload ? '✓' : '✗'}`, hasEnhancedUpload ? 'success' : 'error');
        this.log(`  - Error handling: ${hasErrorHandling ? '✓' : '✗'}`, hasErrorHandling ? 'success' : 'error');
        this.log(`  - Fallback strategy: ${hasFallbackPath ? '✓' : '✗'}`, hasFallbackPath ? 'success' : 'error');
        return false;
      }

    } catch (error) {
      this.issues.push(`Error verifying background upload fix: ${error.message}`);
      this.log(`Error verifying background upload fix: ${error.message}`, 'error');
      return false;
    }
  }

  // Verify Fix 2: Dedicated Template Renaming Endpoint
  verifyTemplateRenamingFix() {
    this.log('\n🔍 Verifying Fix 2: Dedicated Template Renaming Endpoint', 'info');
    
    try {
      const renameApiPath = path.join(process.cwd(), 'api', 'templates', '[id]', 'rename.js');
      
      if (!fs.existsSync(renameApiPath)) {
        this.issues.push('Dedicated rename endpoint not found');
        this.log('Dedicated rename endpoint not found', 'error');
        return false;
      }

      const content = fs.readFileSync(renameApiPath, 'utf8');
      
      // Check for key features
      const hasPatchMethod = content.includes("req.method !== 'PATCH'");
      const hasDuplicateCheck = content.includes('duplicateTemplate') &&
                               content.includes('same name already exists');
      const hasValidation = content.includes('Valid template name is required') &&
                           content.includes('trim()');
      const hasOwnershipCheck = content.includes('created_by') &&
                               content.includes('user.userId');

      if (hasPatchMethod && hasDuplicateCheck && hasValidation && hasOwnershipCheck) {
        this.fixes.push('Dedicated Template Renaming Endpoint with validation and security');
        this.log('Dedicated template renaming endpoint found', 'success');
        this.log('  ✓ PATCH method implemented', 'success');
        this.log('  ✓ Duplicate name checking', 'success');
        this.log('  ✓ Input validation', 'success');
        this.log('  ✓ Ownership verification', 'success');
        return true;
      } else {
        this.issues.push('Template renaming endpoint incomplete');
        this.log('Template renaming endpoint incomplete', 'error');
        this.log(`  - PATCH method: ${hasPatchMethod ? '✓' : '✗'}`, hasPatchMethod ? 'success' : 'error');
        this.log(`  - Duplicate checking: ${hasDuplicateCheck ? '✓' : '✗'}`, hasDuplicateCheck ? 'success' : 'error');
        this.log(`  - Input validation: ${hasValidation ? '✓' : '✗'}`, hasValidation ? 'success' : 'error');
        this.log(`  - Ownership check: ${hasOwnershipCheck ? '✓' : '✗'}`, hasOwnershipCheck ? 'success' : 'error');
        return false;
      }

    } catch (error) {
      this.issues.push(`Error verifying rename fix: ${error.message}`);
      this.log(`Error verifying rename fix: ${error.message}`, 'error');
      return false;
    }
  }

  // Verify Fix 3: Enhanced Template Update with Validation
  verifyTemplateUpdateEnhancements() {
    this.log('\n🔍 Verifying Fix 3: Enhanced Template Update with Validation', 'info');
    
    try {
      const templateApiPath = path.join(process.cwd(), 'api', 'templates', '[id].js');
      const content = fs.readFileSync(templateApiPath, 'utf8');
      
      // Check for enhanced update function
      const hasNameValidation = content.includes('name !== existingTemplate.name') &&
                                content.includes('trimmedName');
      const hasDuplicateCheck = content.includes('duplicateTemplate') &&
                               content.includes('conflictingTemplateId');
      const hasEmptyNameCheck = content.includes('Template name cannot be empty');

      if (hasNameValidation && hasDuplicateCheck && hasEmptyNameCheck) {
        this.fixes.push('Enhanced Template Update with name validation and duplicate checking');
        this.log('Enhanced template update function found', 'success');
        this.log('  ✓ Name change validation', 'success');
        this.log('  ✓ Duplicate name prevention', 'success');
        this.log('  ✓ Empty name validation', 'success');
        return true;
      } else {
        this.issues.push('Template update enhancements incomplete');
        this.log('Template update enhancements incomplete', 'error');
        this.log(`  - Name validation: ${hasNameValidation ? '✓' : '✗'}`, hasNameValidation ? 'success' : 'error');
        this.log(`  - Duplicate checking: ${hasDuplicateCheck ? '✓' : '✗'}`, hasDuplicateCheck ? 'success' : 'error');
        this.log(`  - Empty name check: ${hasEmptyNameCheck ? '✓' : '✗'}`, hasEmptyNameCheck ? 'success' : 'error');
        return false;
      }

    } catch (error) {
      this.issues.push(`Error verifying update enhancements: ${error.message}`);
      this.log(`Error verifying update enhancements: ${error.message}`, 'error');
      return false;
    }
  }

  // Verify server is running and endpoints are accessible
  async verifyServerAndEndpoints() {
    this.log('\n🔍 Verifying Server and Endpoint Accessibility', 'info');
    
    try {
      const axios = require('axios');
      const client = axios.create({
        baseURL: 'http://localhost:3000',
        timeout: 5000,
        validateStatus: () => true
      });

      // Test main template endpoint
      const templateRes = await client.get('/api/templates');
      const templateEndpointWorks = templateRes.status === 401; // Expected: requires auth

      // Test rename endpoint
      const renameRes = await client.patch('/api/templates/1/rename', { name: 'test' });
      const renameEndpointWorks = renameRes.status === 401; // Expected: requires auth

      if (templateEndpointWorks && renameEndpointWorks) {
        this.fixes.push('Server running and endpoints accessible');
        this.log('Server is running and endpoints are accessible', 'success');
        this.log('  ✓ Template API endpoint responding', 'success');
        this.log('  ✓ Rename API endpoint responding', 'success');
        return true;
      } else {
        this.issues.push('Server or endpoints not accessible');
        this.log('Server or endpoints not accessible', 'error');
        this.log(`  - Template endpoint: ${templateEndpointWorks ? '✓' : '✗'}`, templateEndpointWorks ? 'success' : 'error');
        this.log(`  - Rename endpoint: ${renameEndpointWorks ? '✓' : '✗'}`, renameEndpointWorks ? 'success' : 'error');
        return false;
      }

    } catch (error) {
      this.issues.push(`Error verifying server: ${error.message}`);
      this.log(`Error verifying server: ${error.message}`, 'error');
      return false;
    }
  }

  // Generate verification report
  generateReport() {
    this.log('\n📊 PDF TEMPLATE EDITOR FIX VERIFICATION REPORT', 'info');
    this.log('='.repeat(60), 'info');
    
    this.log(`\n✅ Fixes Implemented: ${this.fixes.length}`, 'success');
    this.fixes.forEach(fix => {
      this.log(`  • ${fix}`, 'success');
    });

    if (this.issues.length > 0) {
      this.log(`\n❌ Issues Found: ${this.issues.length}`, 'error');
      this.issues.forEach(issue => {
        this.log(`  • ${issue}`, 'error');
      });
    }

    const allFixesWorking = this.fixes.length >= 3 && this.issues.length === 0;
    
    this.log('\n🎯 VERIFICATION SUMMARY:', 'info');
    this.log('='.repeat(30), 'info');
    
    if (allFixesWorking) {
      this.log('🎉 ALL FIXES SUCCESSFULLY IMPLEMENTED!', 'success');
      this.log('✅ Background image upload enhanced with error handling', 'success');
      this.log('✅ Dedicated template renaming endpoint created', 'success');
      this.log('✅ Template update validation improved', 'success');
      this.log('✅ Server running and endpoints accessible', 'success');
      
      this.log('\n🚀 READY FOR TESTING:', 'info');
      this.log('1. Open http://localhost:3000 in your browser', 'info');
      this.log('2. Login as an admin user', 'info');
      this.log('3. Navigate to PDF Template Editor', 'info');
      this.log('4. Test template creation with background images', 'info');
      this.log('5. Test template renaming functionality', 'info');
      
    } else {
      this.log('⚠️ Some fixes may need attention', 'warning');
      this.log('Please review the issues above', 'warning');
    }

    return allFixesWorking;
  }

  // Run all verifications
  async runAllVerifications() {
    this.log('🚀 Starting PDF Template Editor Fix Verification', 'info');
    this.log('='.repeat(60), 'info');

    // Run all verification checks
    this.verifyBackgroundImageUploadFix();
    this.verifyTemplateRenamingFix();
    this.verifyTemplateUpdateEnhancements();
    await this.verifyServerAndEndpoints();

    // Generate final report
    return this.generateReport();
  }
}

// Run verification if called directly
if (require.main === module) {
  const verifier = new PDFFixVerifier();
  verifier.runAllVerifications().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  });
}

module.exports = PDFFixVerifier;
