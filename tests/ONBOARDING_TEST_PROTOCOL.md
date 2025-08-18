# Comprehensive Onboarding App Functionality Test Protocol

## Overview

This document outlines the comprehensive test protocol for evaluating the shipdocs.app onboarding application functionality. The protocol includes systematic testing of all core features, user flows, and integration points to ensure the application meets the specified requirements.

## Test Script

The test protocol is implemented in the `test-onboarding-functionality.js` script, which automates the testing of all functional objectives. The script creates test accounts using @shipdocs.app domain emails (utilizing the catch-all functionality) and purges these accounts after testing to maintain environment integrity.

## Running the Tests

To run the comprehensive test suite:

```bash
node test-onboarding-functionality.js
```

This will:
1. Create test accounts for crew members and managers
2. Execute all test cases in sequence
3. Generate a detailed HTML report of the test results
4. Clean up all test accounts and associated data

## Test Methodology

For each functional objective, the test script:
- Evaluates compliance status (Fully functional / Partially functional / Non-functional)
- Documents detailed observations including errors, UI/UX issues, and performance concerns
- Identifies required modifications or enhancements to meet specifications
- Verifies email delivery and content for each communication point
- Validates PDF generation and attachment functionality

## Functional Test Objectives

### 1. Crew Registration System
- Verifies HR personnel can register new crew members with email and boarding date
- Confirms data persistence and accessibility in the system
- Validates registration confirmation email delivery to HR with accurate details

### 2. Access Link Distribution
- Confirms generation and delivery of secure access links to crew email addresses
- Tests link validity, expiration behavior, and proper environment routing
- Verifies email formatting, deliverability, and link functionality

### 3. Seamless Authentication
- Tests crew member login via provided link without account creation requirements
- Evaluates authentication flow efficiency and security (token validation, session management)
- Documents any authentication friction points using test accounts

### 4. Initial Form Completion
- Simulates crew member completing first section of onboarding documentation
- Verifies data persistence across sessions
- Confirms notification email to HR containing form completion status and data summary

### 5. Follow-up Form Sequence
- Tests 72-hour automated email trigger for remaining questions
- Verifies form state preservation and continuation functionality
- Confirms email delivery with proper follow-up form access links

### 6. Completion Notification System
- Verifies notifications to both HR and QHSE upon full onboarding completion
- Validates notification content completeness and accuracy
- Confirms email delivery to all designated recipients

### 7. PDF Document Generation
- Tests automatic generation of form 05_03a as PDF with all submitted data
- Verifies PDF formatting, completeness, and compliance with required standards
- Evaluates PDF generation performance and reliability

### 8. PDF Editing Capabilities
- Tests PDF modification functionality for form 05_03a
- Verifies text field editing, image manipulation, and content adjustment features
- Confirms changes persist correctly in the final document

### 9. Document Distribution
- Verifies automated PDF distribution to HR and QHSE departments
- Confirms email delivery with correct PDF attachment
- Tests attachment accessibility, integrity, and readability

### 10. Process Completion
- Verifies system properly marks onboarding process as completed
- Confirms status visibility to HR personnel
- Validates final confirmation email to HR with complete PDF attachment

## Test Accounts

The test script creates the following test accounts:
- testuser1@shipdocs.app - Used for testing crew registration and initial form completion
- testuser2@shipdocs.app - Used for testing follow-up form sequence
- testuser3@shipdocs.app - Used for testing completion notification system
- testuser4@shipdocs.app - Used for testing PDF generation and editing
- testuser5@shipdocs.app - Used for testing document distribution and process completion
- testmanager@shipdocs.app - Used for testing manager functionality

All test accounts are automatically purged after test completion.

## Test Report

After test execution, a comprehensive HTML report is generated with:
- Overall compliance status for each functional objective
- Detailed observations and issues encountered
- Specific attention to email notification system reliability
- PDF generation and attachment functionality validation

The report is saved as `onboarding_test_report_[timestamp].html` in the project root directory.

## Customization

The test configuration can be modified in the `TEST_CONFIG` object at the top of the script:
- Test account emails and details
- HR and QHSE email addresses
- Form data for testing
- Expected boarding dates

## Troubleshooting

If tests fail:
1. Check the console output for specific error messages
2. Review the generated test report for detailed information on which tests failed
3. Verify that the database is accessible and properly configured
4. Ensure that the email service is properly configured
5. Check that all required environment variables are set

## Maintenance

This test protocol should be run:
- After any significant changes to the onboarding system
- Before deploying to production
- Periodically (e.g., monthly) to ensure ongoing functionality
- When investigating reported issues with the onboarding process