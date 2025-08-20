# 🤝 Contributing to Maritime Onboarding Platform

Thank you for your interest in contributing to the Maritime Onboarding Platform! This project thrives on community contributions from maritime professionals, developers, and industry experts.

## 🌟 **Ways to Contribute**

### **🐛 Report Bugs**
Found a bug? Help us fix it:
- **[Create an Issue](https://github.com/shipdocs/maritime-onboarding/issues/new?template=bug_report.md)**
- Include detailed steps to reproduce
- Provide system information and logs
- Screenshots are helpful for UI issues

### **💡 Suggest Features**
Have an idea for improvement?
- **[Start a Discussion](https://github.com/shipdocs/maritime-onboarding/discussions/new?category=ideas)**
- Explain the maritime use case
- Describe the expected behavior
- Consider implementation complexity

### **📝 Improve Documentation**
Help make our docs better:
- Fix typos and grammar
- Add missing information
- Create tutorials and guides
- Translate for international use

### **🔧 Submit Code**
Ready to code? Great!
- Fix bugs and issues
- Implement new features
- Improve performance
- Add tests and documentation

### **🌍 Translations**
Help make the platform accessible globally:
- Translate UI text
- Localize documentation
- Add maritime terminology for different regions

## 🚀 **Getting Started**

### **Development Setup**
```bash
# 1. Fork the repository on GitHub
# 2. Clone your fork
git clone https://github.com/your-username/maritime-onboarding.git
cd maritime-onboarding

# 3. Add upstream remote
git remote add upstream https://github.com/shipdocs/maritime-onboarding.git

# 4. Install dependencies
npm install

# 5. Start development environment
docker-compose -f docker-compose.dev.yml up -d
npm run dev
```

### **Development Environment**
- **Frontend**: React.js with hot reload at http://localhost:3000
- **Backend**: Node.js with auto-restart at http://localhost:3001
- **Database**: PostgreSQL with demo data
- **Email**: MailHog for testing at http://localhost:8025

## 📋 **Contribution Process**

### **1. Choose an Issue**
- Browse [open issues](https://github.com/shipdocs/maritime-onboarding/issues)
- Look for `good first issue` or `help wanted` labels
- Comment on the issue to claim it
- Ask questions if anything is unclear

### **2. Create a Branch**
```bash
# Create and switch to feature branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/issue-description
```

### **3. Make Changes**
- Write clean, readable code
- Follow existing code style
- Add tests for new functionality
- Update documentation as needed

### **4. Test Your Changes**
```bash
# Run tests
npm test

# Run linting
npm run lint

# Test in browser
npm run dev
```

### **5. Commit Changes**
```bash
# Stage your changes
git add .

# Commit with descriptive message
git commit -m "Add crew training progress visualization

- Add progress charts to crew dashboard
- Include phase completion percentages
- Update tests for new components"
```

### **6. Push and Create PR**
```bash
# Push to your fork
git push origin feature/your-feature-name

# Create Pull Request on GitHub
# Include description of changes and link to issue
```

## 📝 **Code Standards**

### **JavaScript/Node.js**
- Use ES6+ features
- Follow ESLint configuration
- Use meaningful variable names
- Add JSDoc comments for functions

```javascript
/**
 * Calculate crew training progress percentage
 * @param {Object} crew - Crew member object
 * @param {Array} trainingItems - Array of training items
 * @returns {number} Progress percentage (0-100)
 */
function calculateProgress(crew, trainingItems) {
  // Implementation
}
```

### **React Components**
- Use functional components with hooks
- Follow component naming conventions
- Add PropTypes for type checking
- Include accessibility attributes

```jsx
import React from 'react';
import PropTypes from 'prop-types';

const CrewProgressCard = ({ crew, onUpdate }) => {
  // Component implementation
};

CrewProgressCard.propTypes = {
  crew: PropTypes.object.isRequired,
  onUpdate: PropTypes.func.isRequired
};
```

### **CSS/Styling**
- Use CSS modules or styled-components
- Follow BEM naming convention
- Ensure responsive design
- Test on mobile devices

### **Database**
- Use migrations for schema changes
- Include rollback procedures
- Add appropriate indexes
- Document complex queries

## 🧪 **Testing Guidelines**

### **Unit Tests**
```bash
# Run all tests
npm test

# Run specific test file
npm test -- crew.test.js

# Run tests in watch mode
npm test -- --watch
```

### **Integration Tests**
```bash
# Run integration tests
npm run test:integration

# Test API endpoints
npm run test:api
```

### **E2E Tests**
```bash
# Run end-to-end tests
npm run test:e2e

# Run specific test suite
npm run test:e2e -- --spec="crew-onboarding.spec.js"
```

## 📚 **Documentation Standards**

### **Code Documentation**
- Add JSDoc comments for all functions
- Document complex algorithms
- Include usage examples
- Explain maritime-specific logic

### **User Documentation**
- Write clear, step-by-step instructions
- Include screenshots for UI changes
- Test instructions with fresh eyes
- Consider different user skill levels

### **API Documentation**
- Document all endpoints
- Include request/response examples
- Specify error codes and messages
- Add authentication requirements

## 🔍 **Review Process**

### **What We Look For**
- **Functionality**: Does it work as expected?
- **Code Quality**: Is it clean and maintainable?
- **Tests**: Are there adequate tests?
- **Documentation**: Is it properly documented?
- **Maritime Context**: Does it make sense for maritime use?

### **Review Timeline**
- **Initial Review**: Within 2-3 days
- **Feedback**: Constructive suggestions for improvement
- **Approval**: Once all requirements are met
- **Merge**: After approval from maintainers

## 🏷️ **Issue Labels**

| Label | Description |
|-------|-------------|
| `bug` | Something isn't working |
| `enhancement` | New feature or request |
| `good first issue` | Good for newcomers |
| `help wanted` | Extra attention is needed |
| `documentation` | Improvements or additions to docs |
| `maritime-specific` | Maritime industry specific features |
| `security` | Security-related issues |
| `performance` | Performance improvements |

## 🎯 **Contribution Areas**

### **High Priority**
- Bug fixes and stability improvements
- Performance optimizations
- Security enhancements
- Mobile responsiveness
- Accessibility improvements

### **Feature Development**
- Maritime-specific training modules
- Integration with maritime software
- Advanced reporting and analytics
- Multi-language support
- API enhancements

### **Documentation**
- User guides and tutorials
- API documentation
- Deployment guides
- Video tutorials
- Translation to other languages

## 🆘 **Getting Help**

### **Community Support**
- **[GitHub Discussions](https://github.com/shipdocs/maritime-onboarding/discussions)** - Ask questions
- **[Discord Server](https://discord.gg/maritime-onboarding)** - Real-time chat
- **[Community Forum](https://community.shipdocs.app)** - Longer discussions

### **Maintainer Contact**
- **Email**: [contributors@shipdocs.app](mailto:contributors@shipdocs.app)
- **Twitter**: [@shipdocs](https://twitter.com/shipdocs)

## 📄 **License**

By contributing to this project, you agree that your contributions will be licensed under the MIT License.

## 🙏 **Recognition**

All contributors are recognized in our:
- **[Contributors Page](https://github.com/shipdocs/maritime-onboarding/graphs/contributors)**
- **[Release Notes](https://github.com/shipdocs/maritime-onboarding/releases)**
- **[Project Website](https://shipdocs.app/contributors)**

---

**Thank you for helping make maritime training better for everyone! 🚢**

*Questions about contributing? [Start a discussion](https://github.com/shipdocs/maritime-onboarding/discussions) and we'll help you get started.*
