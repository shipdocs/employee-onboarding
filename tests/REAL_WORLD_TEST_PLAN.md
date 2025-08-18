# Real-World Onboarding System Test Plan

## Overview

This document outlines the approach for conducting real-world tests of the shipdocs.app onboarding application. Unlike simulations, these tests will interact with the actual system, create real test accounts, and verify the functionality of all components in the production (or staging) environment.

## Test Environment Setup

### Prerequisites

1. Access to the shipdocs.app API endpoints
2. Valid API credentials or authentication tokens
3. Access to the @shipdocs.app email domain catch-all functionality
4. Permission to create and delete test accounts in the system

### Environment Configuration

Create a `.env` file with the following configuration:

```
# API Configuration
BASE_URL=https://shipdocs.app
API_KEY=your_api_key_here

# Test Account Configuration
TEST_EMAIL_DOMAIN=shipdocs.app
HR_EMAIL=hr@shipdocs.app
QHSE_EMAIL=qhse@shipdocs.app

# Email Verification
EMAIL_VERIFICATION_ENABLED=true
EMAIL_VERIFICATION_TIMEOUT=60000  # 60 seconds
```

## Real-World Test Methodology

### 1. Test Account Creation

1. Create 5 test crew accounts with @shipdocs.app domain emails
2. Create 1 test manager account with @shipdocs.app domain
3. Verify account creation in the database
4. Document account IDs for subsequent tests

### 2. Email Verification

1. Set up email monitoring for the @shipdocs.app domain
2. Verify receipt of welcome emails for each test account
3. Extract magic links from emails for authentication testing
4. Document email delivery times and content

### 3. Authentication Testing

1. Use extracted magic links to authenticate test accounts
2. Verify JWT token generation and session creation
3. Test token expiration and refresh mechanisms
4. Document authentication success rates and any issues

### 4. Form Completion Testing

1. Submit actual form data for Form 05_03a
2. Test partial form submission and state preservation
3. Verify data storage in the database
4. Test form completion across multiple sessions

### 5. PDF Generation Testing

1. Trigger actual PDF generation for completed forms
2. Download and verify PDF content and formatting
3. Test PDF template editing functionality
4. Verify PDF storage in the system

### 6. Email Notification Testing

1. Monitor email notifications at each stage of the process
2. Verify delivery to HR and QHSE addresses
3. Test 72-hour follow-up email trigger
4. Verify completion notification emails

### 7. Process Completion Testing

1. Complete the entire onboarding process with test accounts
2. Verify status updates in the database
3. Test visibility of completion status to HR
4. Verify final PDF distribution

## Test Execution Steps

### Step 1: Initial Setup

```bash
# Clone the test repository
git clone https://github.com/shipdocs/onboarding-tests.git
cd onboarding-tests

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your credentials
```

### Step 2: Create Test Accounts

```bash
# Run the account creation script
node create-test-accounts.js
```

This will:
- Create test crew and manager accounts
- Store account IDs in a local file for subsequent tests
- Output account details to the console

### Step 3: Execute Email and Authentication Tests

```bash
# Run the email and authentication tests
node test-email-auth.js
```

This will:
- Monitor the catch-all email inbox for @shipdocs.app
- Extract and verify magic links
- Test authentication with the extracted links
- Document results in a JSON file

### Step 4: Execute Form Completion Tests

```bash
# Run the form completion tests
node test-form-completion.js
```

This will:
- Submit form data for each test account
- Test partial and complete submissions
- Verify data storage and state preservation
- Document results in a JSON file

### Step 5: Execute PDF and Notification Tests

```bash
# Run the PDF and notification tests
node test-pdf-notifications.js
```

This will:
- Trigger PDF generation
- Verify PDF content and storage
- Monitor email notifications
- Document results in a JSON file

### Step 6: Execute Process Completion Tests

```bash
# Run the process completion tests
node test-process-completion.js
```

This will:
- Complete the onboarding process for each test account
- Verify status updates and notifications
- Document results in a JSON file

### Step 7: Generate Comprehensive Report

```bash
# Generate the final test report
node generate-report.js
```

This will:
- Compile results from all test phases
- Generate a comprehensive HTML report
- Highlight any issues or failures
- Provide recommendations for improvements

### Step 8: Clean Up Test Accounts

```bash
# Clean up test accounts
node cleanup-test-accounts.js
```

This will:
- Delete all test accounts created during testing
- Remove associated data from the database
- Verify successful cleanup

## Test Data

### Crew Test Accounts

| Email | Position | Vessel | Boarding Date |
|-------|----------|--------|--------------|
| testuser1@shipdocs.app | Deck Officer | Test Vessel 1 | Current date + 7 days |
| testuser2@shipdocs.app | Engineer | Test Vessel 2 | Current date + 14 days |
| testuser3@shipdocs.app | Captain | Test Vessel 3 | Current date + 21 days |
| testuser4@shipdocs.app | Chief Engineer | Test Vessel 4 | Current date + 28 days |
| testuser5@shipdocs.app | Deck Cadet | Test Vessel 5 | Current date + 35 days |

### Form Test Data

```json
{
  "personalInfo": {
    "fullName": "Test User",
    "dateOfBirth": "1990-01-01",
    "nationality": "Dutch",
    "passportNumber": "TEST123456",
    "passportExpiry": "2030-01-01"
  },
  "contactInfo": {
    "phoneNumber": "+31612345678",
    "emergencyContactName": "Emergency Contact",
    "emergencyContactPhone": "+31687654321",
    "homeAddress": "Test Street 123, Amsterdam"
  },
  "qualifications": {
    "certifications": ["Basic Safety Training", "Medical First Aid"],
    "languages": ["English", "Dutch"],
    "specialSkills": "Firefighting, Navigation"
  },
  "healthInfo": {
    "medicalCertificateDate": "2024-01-01",
    "medicalCertificateExpiry": "2026-01-01",
    "allergies": "None",
    "medications": "None"
  },
  "acknowledgements": {
    "safetyPoliciesReviewed": true,
    "emergencyProceduresUnderstood": true,
    "dataPrivacyConsent": true
  }
}
```

## Test Result Documentation

For each functional objective, document:

1. **Compliance Status**:
   - Fully Functional: All tests pass without issues
   - Partially Functional: Some tests pass, but with issues
   - Non-Functional: Critical tests fail

2. **Detailed Observations**:
   - API response times
   - Email delivery times
   - UI/UX issues encountered
   - Performance concerns

3. **Required Modifications**:
   - Specific code or configuration changes needed
   - Process improvements recommended
   - UI/UX enhancements suggested

4. **Email Verification Results**:
   - Delivery confirmation for each email type
   - Content verification against templates
   - Attachment verification for PDFs

5. **PDF Generation Results**:
   - Generation time and performance
   - Content accuracy and formatting
   - Attachment verification in emails

## Security Considerations

1. **Test Account Isolation**:
   - Ensure test accounts cannot access real user data
   - Use a separate test environment if possible

2. **Data Cleanup**:
   - Thoroughly delete all test accounts after testing
   - Remove all associated data from the database

3. **API Key Protection**:
   - Do not commit API keys to version control
   - Use environment variables for sensitive information

4. **Email Security**:
   - Monitor the catch-all email inbox for unauthorized access
   - Delete test emails after verification

## Troubleshooting

If tests fail:

1. **API Connection Issues**:
   - Verify API credentials and endpoints
   - Check network connectivity
   - Verify API rate limits

2. **Email Verification Issues**:
   - Check catch-all email configuration
   - Verify email server settings
   - Increase timeout for email delivery

3. **Database Issues**:
   - Verify database connection
   - Check permissions for test account creation
   - Verify schema compatibility

4. **PDF Generation Issues**:
   - Check template availability
   - Verify storage permissions
   - Check for PDF library dependencies

## Conclusion

This real-world test plan provides a comprehensive approach to testing the shipdocs.app onboarding application in a production or staging environment. By following these steps, you can verify the functionality of all components and identify any issues that need to be addressed.

The test results will provide valuable insights into the system's performance, reliability, and user experience, enabling continuous improvement of the onboarding process.