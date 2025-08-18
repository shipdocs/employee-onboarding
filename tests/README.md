# Shipdocs.app Test Suite

This directory contains comprehensive test suites for the shipdocs.app application. The tests are organized by feature area to provide thorough validation of all system components.

## Available Test Suites

### Onboarding Tests

Located in the `onboarding/` directory, these tests validate the complete onboarding process including:

- Crew registration
- Access link distribution
- Authentication
- Form completion
- PDF generation and distribution
- Process completion

## Running the Tests

The test scripts are integrated into the package.json and can be run using npm:

```bash
# Run all onboarding tests
npm run test:onboarding

# Run individual test components
npm run test:onboarding:create-accounts
npm run test:onboarding:email-auth
npm run test:onboarding:form-completion

# Run mock tests (for demonstration without affecting real data)
npm run test:onboarding:mock

# Clean up test accounts after testing
npm run test:onboarding:cleanup
```

## Test Configuration

Before running the real-world tests, you need to configure the test environment:

1. Copy the example environment file:
   ```bash
   cp tests/onboarding/.env.example tests/onboarding/.env
   ```

2. Edit the `.env` file with your specific configuration:
   - API credentials
   - Email server settings
   - Test account domain

## Test Documentation

Detailed documentation for each test suite is available:

- `tests/REAL_WORLD_TEST_PLAN.md` - Comprehensive test methodology
- `tests/ONBOARDING_TEST_PROTOCOL.md` - Test protocol documentation
- `tests/ONBOARDING_TEST_SUMMARY.md` - Summary of test approach and findings

## Test Results

When tests are run, they generate detailed reports:

- Account creation results: `tests/onboarding/test-accounts.json`
- Email and authentication results: `tests/onboarding/email-auth-results.json`
- Form completion results: `tests/onboarding/form-completion-results.json`
- Comprehensive HTML report: `tests/onboarding/onboarding_test_report_[timestamp].html`

## Adding New Tests

To add new tests for other features:

1. Create a new directory under `tests/` for the feature area
2. Follow the pattern established in the onboarding tests
3. Add new npm scripts to package.json for running the tests
4. Document the test approach and methodology

## Maintenance

The test suite should be maintained alongside the application code:

- Update tests when API endpoints change
- Add tests for new features
- Review and update test data regularly
- Run tests before and after major deployments