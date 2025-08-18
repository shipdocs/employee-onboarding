# 🚢 Maritime Onboarding E2E Test Suite

Comprehensive end-to-end testing framework for the Maritime Onboarding System, built with Playwright and designed for maritime-specific scenarios.

## 🎯 Features

- **Complete User Journey Testing**: Tests for crew, managers, and administrators
- **Offline Mode Testing**: Validates offline functionality critical for maritime environments
- **Performance Testing**: Ensures fast load times even on satellite connections
- **Mobile Optimization**: Tests responsive design on various devices
- **Multilingual Support**: Validates Dutch/English language switching
- **Maritime-Specific Scenarios**: Tests designed for real ship conditions

## 📋 Test Coverage

### Authentication Module
- Standard login (crew, manager, admin)
- Magic link authentication
- Session management
- Password changes
- Security features

### Crew Onboarding Module  
- Complete 5-phase training journey
- Quiz completion and validation
- Offline training capabilities
- Progress tracking
- Certificate generation
- Multilingual content

### Manager Dashboard Module
- Crew management
- Progress monitoring
- Reminder notifications
- Report generation
- Quiz reviews
- Bulk operations

### Admin Module
- System settings
- Manager administration
- Audit logs
- Email templates
- Security configuration
- Data exports

### Performance Module
- Page load times
- Core Web Vitals
- Mobile performance
- Network conditions (3G, offline)
- Image optimization
- Load testing

## 🚀 Quick Start

### Installation

```bash
# Install dependencies
npm install

# Make executable
chmod +x index.js
```

### Basic Usage

```bash
# Run all tests
npm test

# Run specific module
npm run test:auth
npm run test:crew
npm run test:manager
npm run test:admin
npm run test:performance

# Run smoke tests (quick validation)
npm run test:smoke

# Run full test suite
npm run test:full

# Interactive mode
npm run test:interactive
```

### Advanced Usage

```bash
# Run with visible browser
./index.js --no-headless

# Test specific modules
./index.js --modules authentication "crew onboarding"

# Skip certain modules
./index.js --skip performance admin

# Test against staging
./index.js --env staging

# Custom timeout
./index.js --timeout 120000

# Override base URL
./index.js --base-url http://localhost:3001
```

## 🔧 Configuration

Edit `config.json` to customize:

```json
{
  "baseUrl": "http://localhost:3000",
  "timeout": 60000,
  "credentials": {
    "admin": {
      "email": "admin@shipdocs.app",
      "password": "admin123"
    }
  }
}
```

## 📊 Test Reports

Reports are generated in multiple formats:

- **HTML Report**: Visual report with charts and details
- **JSON Report**: Machine-readable test results
- **Screenshots**: Captured at key points and failures
- **Videos**: Full test execution recordings

View reports:
```bash
npm run report:open
```

## 🌊 Maritime-Specific Tests

### Offline Scenarios
- Start training online, continue offline
- Complete quizzes without connection
- Sync when connection restored

### Network Conditions
- Satellite internet (slow 3G)
- Intermittent connectivity
- Port vs. at-sea conditions

### Device Testing
- Rugged tablets
- Mobile phones
- Touch interfaces with gloves
- Sunlight readability

## 🛠️ Development

### Adding New Tests

1. Create a new module in `src/modules/`:
```javascript
const TestBase = require('../utils/TestBase');

class MyModule extends TestBase {
  async runAllTests() {
    // Your tests here
  }
}
```

2. Add to TestRunner.js:
```javascript
const MyModule = require('./modules/MyModule');
// Add to modulesToRun array
```

### Test Structure

Each test should:
- Start with clear console output
- Take screenshots at key points
- Handle errors gracefully
- Record detailed results
- Clean up after execution

## 🐛 Debugging

### Debug Mode
```bash
# Run single test with browser visible
./index.js --no-headless --modules authentication

# Increase timeout for debugging
./index.js --timeout 300000
```

### Common Issues

1. **Login fails**: Check credentials in config.json
2. **Timeouts**: Increase timeout or check selectors
3. **Offline tests fail**: Ensure PWA is properly cached
4. **Performance issues**: Run on better hardware

## 📈 Performance Targets

- Page Load: < 3 seconds
- First Contentful Paint: < 1.5 seconds
- Time to Interactive: < 3.5 seconds
- Largest Contentful Paint: < 2.5 seconds

## 🔐 Security

- Never commit real credentials
- Use test accounts only
- Sanitize screenshots for sensitive data
- Clear cookies between tests

## 📝 Best Practices

1. **Isolate Tests**: Each test should be independent
2. **Clean State**: Start fresh for each module
3. **Meaningful Names**: Use descriptive test names
4. **Error Handling**: Capture screenshots on failure
5. **Performance**: Monitor test execution time

## 🚦 CI/CD Integration

```yaml
# Example GitHub Actions
- name: Run E2E Tests
  run: |
    npm install
    npm run test:full -- --headless
  env:
    BASE_URL: ${{ secrets.TEST_URL }}
```

## 📞 Support

For issues or questions:
- Check test reports for detailed errors
- Review screenshots for visual issues
- Enable debug mode for investigation
- Contact the development team

## 🔄 Updates

Keep tests updated with application changes:
- Update selectors when UI changes
- Add tests for new features
- Remove tests for deprecated features
- Update performance baselines

---

**Happy Testing! 🧪🚢**