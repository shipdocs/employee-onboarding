# Exit Strategy Live Test Guide
## Comprehensive Testing of Exit Functionalities

**Test Date:** January 2025  
**Environment:** Production (https://onboarding.burando.online)  
**Purpose:** Verify all exit strategy components work in live environment  

---

## 🧪 **TEST EXECUTION CHECKLIST**

### **Phase 1: GDPR Self-Service Portal Test**

#### **Test 1.1: Portal Access**
- [ ] **Navigate to:** https://onboarding.burando.online/gdpr
- [ ] **Verify:** Portal loads without errors
- [ ] **Check:** Multi-language toggle (EN/NL) works
- [ ] **Confirm:** All tabs are visible (Overview, Export Data, Delete Data, My Requests)

#### **Test 1.2: Data Export Request**
- [ ] **Go to:** "Export Data" tab
- [ ] **Select:** "Personal Data Export" option
- [ ] **Click:** "Request Export" button
- [ ] **Verify:** Success message appears
- [ ] **Check:** Request appears in "My Requests" tab
- [ ] **Confirm:** Status shows "Processing" or "Completed"

#### **Test 1.3: Complete Data Export**
- [ ] **Go to:** "Export Data" tab
- [ ] **Select:** "Complete Data Export" option
- [ ] **Click:** "Request Export" button
- [ ] **Verify:** Success message appears
- [ ] **Check:** Request appears in "My Requests" tab
- [ ] **Wait:** For processing to complete (may take a few minutes)

#### **Test 1.4: Download Functionality**
- [ ] **Go to:** "My Requests" tab
- [ ] **Find:** Completed export request
- [ ] **Click:** "Download" button
- [ ] **Verify:** File downloads successfully
- [ ] **Check:** File contains expected data structure
- [ ] **Confirm:** JSON format is valid and readable

#### **Test 1.5: Data Deletion Request**
- [ ] **Go to:** "Delete Data" tab
- [ ] **Read:** Warning message about data deletion
- [ ] **Type:** "DELETE MY DATA" in confirmation field
- [ ] **Add:** Reason for deletion
- [ ] **Click:** "Request Deletion" button
- [ ] **Verify:** Success message appears
- [ ] **Check:** Request appears in "My Requests" tab

---

### **Phase 2: Admin Export Management Test**

#### **Test 2.1: Admin Dashboard Access**
- [ ] **Login as:** Admin user
- [ ] **Navigate to:** Admin Dashboard
- [ ] **Go to:** "Data Export & GDPR Management" tab
- [ ] **Verify:** Export list loads without errors
- [ ] **Check:** Test entries are visible

#### **Test 2.2: Export Details View**
- [ ] **Click:** Eye icon (👁️) on an export entry
- [ ] **Verify:** Modal opens with export details
- [ ] **Check:** All information is displayed correctly:
  - Export ID
  - Export Type
  - User Email
  - Status
  - File Size
  - Creation/Completion timestamps
- [ ] **Test:** Close modal functionality

#### **Test 2.3: Admin Download Test**
- [ ] **In export details modal:** Click "Download" button
- [ ] **Verify:** File downloads successfully
- [ ] **Check:** File contains export data in JSON format
- [ ] **Confirm:** Data structure includes metadata and user data

#### **Test 2.4: Bulk Export Management**
- [ ] **Check:** Multiple export entries are visible
- [ ] **Verify:** Status indicators work correctly
- [ ] **Test:** Sorting and filtering (if available)

---

### **Phase 3: API Endpoints Direct Test**

#### **Test 3.1: GDPR API Endpoints**
```bash
# Test My Requests endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://onboarding.burando.online/api/gdpr/my-requests

# Test Request Export endpoint
curl -X POST \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"exportType": "personal"}' \
     https://onboarding.burando.online/api/gdpr/request-export
```

#### **Test 3.2: Admin API Endpoints**
```bash
# Test Admin Data Exports endpoint
curl -H "Authorization: Bearer ADMIN_TOKEN" \
     https://onboarding.burando.online/api/admin/data-exports

# Test Download endpoint
curl -H "Authorization: Bearer ADMIN_TOKEN" \
     https://onboarding.burando.online/api/admin/data-exports/ID/download
```

---

### **Phase 4: Documentation Accessibility Test**

#### **Test 4.1: Compliance Documentation**
- [ ] **Access:** NIS2_COMPLIANCE_PACKAGE/README.md
- [ ] **Review:** Ship Docs Compliance Report 2025
- [ ] **Check:** Vendor Risk Assessment documentation
- [ ] **Verify:** Infrastructure Documentation completeness
- [ ] **Confirm:** Business Continuity Plan accessibility

#### **Test 4.2: Technical Documentation**
- [ ] **Review:** API documentation completeness
- [ ] **Check:** Database schema documentation
- [ ] **Verify:** Migration scripts availability
- [ ] **Confirm:** Exit procedure documentation

---

### **Phase 5: Data Completeness Verification**

#### **Test 5.1: Export Data Structure**
```json
// Expected export structure:
{
  "export_metadata": {
    "export_id": "...",
    "export_type": "personal|complete",
    "user_id": "...",
    "created_at": "...",
    "options": {}
  },
  "user_data": {
    "profile": { ... },
    "training_records": [ ... ],
    "certificates": [ ... ],
    "audit_trail": [ ... ]
  }
}
```

#### **Test 5.2: Data Integrity Check**
- [ ] **Verify:** All user profile fields present
- [ ] **Check:** Training data completeness
- [ ] **Confirm:** Timestamps are accurate
- [ ] **Validate:** No sensitive data exposure

---

### **Phase 6: Security & Compliance Test**

#### **Test 6.1: Authentication & Authorization**
- [ ] **Test:** Unauthenticated access is blocked
- [ ] **Verify:** Users can only access their own data
- [ ] **Check:** Admin functions require admin role
- [ ] **Confirm:** Rate limiting is enforced

#### **Test 6.2: Audit Logging**
- [ ] **Verify:** All export requests are logged
- [ ] **Check:** Download actions are tracked
- [ ] **Confirm:** Deletion requests are audited
- [ ] **Validate:** IP addresses and timestamps recorded

---

## 📊 **TEST RESULTS TEMPLATE**

### **Overall Test Results**

| Test Phase | Status | Notes |
|------------|--------|-------|
| GDPR Portal Access | ⏳ PENDING | |
| Data Export Request | ⏳ PENDING | |
| Download Functionality | ⏳ PENDING | |
| Admin Export Management | ⏳ PENDING | |
| API Endpoints | ⏳ PENDING | |
| Documentation Access | ⏳ PENDING | |
| Data Completeness | ⏳ PENDING | |
| Security & Compliance | ⏳ PENDING | |

### **Issues Found**
- [ ] Issue 1: Description
- [ ] Issue 2: Description
- [ ] Issue 3: Description

### **Recommendations**
- [ ] Recommendation 1
- [ ] Recommendation 2
- [ ] Recommendation 3

---

## 🎯 **SUCCESS CRITERIA**

### **Minimum Requirements for PASS:**
- ✅ GDPR portal accessible and functional
- ✅ Data export requests work end-to-end
- ✅ Download functionality produces valid files
- ✅ Admin export management operational
- ✅ API endpoints respond correctly
- ✅ Documentation is accessible and complete
- ✅ Security controls are enforced

### **Exit Strategy Readiness:**
- ✅ **READY:** All tests pass, minor issues only
- ⚠️ **PARTIAL:** Core functionality works, some issues
- ❌ **NOT READY:** Critical issues prevent usage

---

## 📞 **SUPPORT CONTACTS**

**During Testing:**
- **Technical Issues:** tech@shipdocs.app
- **Access Problems:** support@shipdocs.app
- **Data Questions:** dpo@shipdocs.app

**Emergency Contact:**
- **24/7 Hotline:** +31 (0)20 123 4567

---

**Test Completed By:** ________________  
**Test Date:** ________________  
**Overall Result:** ________________  
**Next Review:** ________________
