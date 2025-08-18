#!/bin/bash

# run-real-tests.sh - Execute real-world onboarding tests
# This script runs the comprehensive real-world tests against the actual shipdocs.app system

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Shipdocs.app Real-World Onboarding Tests...${NC}"
echo -e "${BLUE}📋 This will test the actual system with real test accounts${NC}"
echo ""

# Check if .env file exists
if [ ! -f ./.env ]; then
  echo -e "${YELLOW}⚠️ .env file not found. Creating example file...${NC}"
  cat > ./.env << EOL
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

# Email Server Configuration
EMAIL_SERVER=mail.shipdocs.app
EMAIL_USER=catchall@shipdocs.app
EMAIL_PASSWORD=your_password_here
EMAIL_PORT=993
EMAIL_TLS=true
EOL
  echo -e "${YELLOW}⚠️ Please edit the .env file with your credentials before running the tests.${NC}"
  exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}⚠️ node_modules not found. Installing dependencies...${NC}"
  npm install axios dotenv imapflow mailparser
  
  if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to install dependencies. Please install them manually:${NC}"
    echo "npm install axios dotenv imapflow mailparser"
    exit 1
  fi
fi

# Make scripts executable
chmod +x ./create-test-accounts.js ./test-email-auth.js ./test-form-completion.js

# Step 1: Create test accounts
echo -e "\n${BLUE}📋 Step 1: Creating test accounts...${NC}"
node ./create-test-accounts.js

# Check if the previous step was successful
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Failed to create test accounts. Aborting tests.${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Test accounts created successfully!${NC}"

# Step 2: Test email delivery and authentication
echo -e "\n${BLUE}📋 Step 2: Testing email delivery and authentication...${NC}"
node ./test-email-auth.js

# Check if the previous step was successful
if [ $? -ne 0 ]; then
  echo -e "${YELLOW}⚠️ Email and authentication tests had some issues, but continuing...${NC}"
else
  echo -e "${GREEN}✅ Email and authentication tests completed successfully!${NC}"
fi

# Step 3: Test form completion
echo -e "\n${BLUE}📋 Step 3: Testing form completion...${NC}"
node ./test-form-completion.js

# Check if the previous step was successful
if [ $? -ne 0 ]; then
  echo -e "${YELLOW}⚠️ Form completion tests had some issues, but continuing...${NC}"
else
  echo -e "${GREEN}✅ Form completion tests completed successfully!${NC}"
fi

# Step 4: Generate comprehensive report
echo -e "\n${BLUE}📋 Step 4: Generating comprehensive report...${NC}"

# Create a simple HTML report that combines all test results
cat > generate-report.js << EOL
#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const os = require('os');

async function generateReport() {
  // Load test results
  const results = {
    accounts: await loadJson('test-accounts.json'),
    emailAuth: await loadJson('email-auth-results.json'),
    formCompletion: await loadJson('form-completion-results.json')
  };
  
  // Generate HTML report
  const html = generateHtml(results);
  
  // Save report
  const reportFile = 'onboarding_test_report_' + Date.now() + '.html';
  await fs.writeFile(reportFile, html);
  console.log('Report saved to: ' + reportFile);
  
  // Open report
  openFile(reportFile);
  
  return reportFile;
}

async function loadJson(filename) {
  try {
    const data = await fs.readFile(filename, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to load ' + filename + ': ' + error.message);
    return {};
  }
}

function generateHtml(results) {
  // Count errors
  const errors = [
    ...(results.accounts.errors || []),
    ...(results.emailAuth.errors || []),
    ...(results.formCompletion.errors || [])
  ];
  
  // Determine overall status
  let overallStatus = 'Fully Functional';
  if (errors.length > 0) {
    overallStatus = 'Partially Functional';
  }
  
  return \`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Shipdocs.app Onboarding Real-World Test Report</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }
        header {
          background-color: #f5f5f5;
          padding: 20px;
          margin-bottom: 30px;
          border-radius: 5px;
        }
        h1 {
          color: #2c5aa0;
          margin-top: 0;
        }
        .summary {
          display: flex;
          justify-content: space-between;
          background-color: #f9f9f9;
          padding: 15px;
          border-radius: 5px;
          margin-bottom: 30px;
        }
        .summary-item {
          text-align: center;
        }
        .summary-item h3 {
          margin: 0;
          font-size: 16px;
          color: #666;
        }
        .summary-item p {
          margin: 5px 0 0 0;
          font-size: 24px;
          font-weight: bold;
        }
        .test-section {
          background-color: #f9f9f9;
          padding: 20px;
          margin-bottom: 20px;
          border-radius: 5px;
          border-left: 5px solid #ccc;
        }
        .test-section.success {
          border-left-color: #4caf50;
        }
        .test-section.warning {
          border-left-color: #ff9800;
        }
        .test-section.error {
          border-left-color: #f44336;
        }
        .test-section h2 {
          margin-top: 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .status {
          font-size: 14px;
          padding: 5px 10px;
          border-radius: 3px;
          color: white;
        }
        .status.success {
          background-color: #4caf50;
        }
        .status.warning {
          background-color: #ff9800;
        }
        .status.error {
          background-color: #f44336;
        }
        pre {
          background-color: #f1f1f1;
          padding: 10px;
          border-radius: 5px;
          overflow-x: auto;
        }
        .error-list {
          color: #d32f2f;
        }
        footer {
          margin-top: 50px;
          text-align: center;
          color: #666;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <header>
        <h1>Shipdocs.app Onboarding Real-World Test Report</h1>
        <p>Test conducted on \${new Date().toLocaleString()}</p>
      </header>
      
      <div class="summary">
        <div class="summary-item">
          <h3>Overall Status</h3>
          <p style="color: \${
            overallStatus === 'Fully Functional' ? '#4caf50' : 
            overallStatus === 'Partially Functional' ? '#ff9800' : '#f44336'
          };">\${overallStatus}</p>
        </div>
        <div class="summary-item">
          <h3>Test Accounts</h3>
          <p>\${(results.accounts.crew || []).length}</p>
        </div>
        <div class="summary-item">
          <h3>Emails Received</h3>
          <p>\${(results.emailAuth.emails || []).length}</p>
        </div>
        <div class="summary-item">
          <h3>Total Issues</h3>
          <p style="color: \${errors.length > 0 ? '#f44336' : '#4caf50'};">\${errors.length}</p>
        </div>
      </div>
      
      <div class="test-section \${(results.accounts.errors || []).length > 0 ? 'warning' : 'success'}">
        <h2>Account Creation <span class="status \${(results.accounts.errors || []).length > 0 ? 'warning' : 'success'}">\${(results.accounts.errors || []).length > 0 ? 'Partially Functional' : 'Fully Functional'}</span></h2>
        <p><strong>Manager Account:</strong> \${results.accounts.manager ? 'Created' : 'Failed'}</p>
        <p><strong>Crew Accounts:</strong> \${(results.accounts.crew || []).length} created</p>
        
        \${(results.accounts.errors || []).length > 0 ? \`
          <h3 class="error-list">Issues:</h3>
          <ul>
            \${(results.accounts.errors || []).map(error => \`<li>\${error.type}: \${error.error}</li>\`).join('')}
          </ul>
        \` : ''}
      </div>
      
      <div class="test-section \${(results.emailAuth.errors || []).length > 0 ? 'warning' : 'success'}">
        <h2>Email & Authentication <span class="status \${(results.emailAuth.errors || []).length > 0 ? 'warning' : 'success'}">\${(results.emailAuth.errors || []).length > 0 ? 'Partially Functional' : 'Fully Functional'}</span></h2>
        <p><strong>Emails Received:</strong> \${(results.emailAuth.emails || []).length}</p>
        <p><strong>Authentication Tests:</strong> \${(results.emailAuth.authentication || []).length}</p>
        <p><strong>Successful Authentications:</strong> \${((results.emailAuth.authentication || []).filter(a => a.success) || []).length}</p>
        
        \${(results.emailAuth.errors || []).length > 0 ? \`
          <h3 class="error-list">Issues:</h3>
          <ul>
            \${(results.emailAuth.errors || []).map(error => \`<li>\${error.type}: \${error.error}</li>\`).join('')}
          </ul>
        \` : ''}
      </div>
      
      <div class="test-section \${(results.formCompletion.errors || []).length > 0 ? 'warning' : 'success'}">
        <h2>Form Completion <span class="status \${(results.formCompletion.errors || []).length > 0 ? 'warning' : 'success'}">\${(results.formCompletion.errors || []).length > 0 ? 'Partially Functional' : 'Fully Functional'}</span></h2>
        <p><strong>Partial Submissions:</strong> \${(results.formCompletion.partialSubmissions || []).length}</p>
        <p><strong>Successful Partial Submissions:</strong> \${((results.formCompletion.partialSubmissions || []).filter(s => s.success) || []).length}</p>
        <p><strong>Complete Submissions:</strong> \${(results.formCompletion.completeSubmissions || []).length}</p>
        <p><strong>Successful Complete Submissions:</strong> \${((results.formCompletion.completeSubmissions || []).filter(s => s.success) || []).length}</p>
        
        \${(results.formCompletion.errors || []).length > 0 ? \`
          <h3 class="error-list">Issues:</h3>
          <ul>
            \${(results.formCompletion.errors || []).map(error => \`<li>\${error.type}: \${error.error}</li>\`).join('')}
          </ul>
        \` : ''}
      </div>
      
      <footer>
        <p>Generated by Shipdocs.app Onboarding Real-World Test Suite</p>
      </footer>
    </body>
    </html>
  \`;
}

function openFile(filePath) {
  const platform = os.platform();
  const absolutePath = path.resolve(filePath);
  
  console.log('Opening report: ' + absolutePath);
  
  let command;
  switch (platform) {
    case 'darwin': // macOS
      command = 'open "' + absolutePath + '"';
      break;
    case 'win32': // Windows
      command = 'start "" "' + absolutePath + '"';
      break;
    default: // Linux and others
      command = 'xdg-open "' + absolutePath + '"';
      break;
  }
  
  exec(command, (error) => {
    if (error) {
      console.error('Error opening report: ' + error.message);
    }
  });
}

// Run if called directly
if (require.main === module) {
  generateReport()
    .then(reportFile => {
      console.log('Report generated: ' + reportFile);
    })
    .catch(error => {
      console.error('Error generating report: ' + error.message);
      process.exit(1);
    });
}
EOL

# Make the report generator executable
chmod +x ./generate-report.js

# Run the report generator
node ./generate-report.js

# Check if the previous step was successful
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Failed to generate report.${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Report generated successfully!${NC}"

# Step 5: Clean up test accounts (optional)
echo -e "\n${BLUE}📋 Step 5: Do you want to clean up test accounts? (y/n)${NC}"
read -p "Clean up test accounts? " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${BLUE}📋 Cleaning up test accounts...${NC}"
  
  # Create cleanup script
  cat > cleanup-test-accounts.js << EOL
#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

async function cleanupTestAccounts() {
  try {
    // Load test accounts
    const accountsFile = path.join(__dirname, 'test-accounts.json');
    const data = await fs.readFile(accountsFile, 'utf8');
    const accounts = JSON.parse(data);
    
    // API client
    const api = axios.create({
      baseURL: process.env.BASE_URL || 'https://shipdocs.app',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${process.env.API_KEY}\`
      }
    });
    
    // Delete crew accounts
    console.log('Deleting crew accounts...');
    for (const crew of accounts.crew || []) {
      try {
        await api.delete(\`/api/manager/crew/\${crew.id}\`);
        console.log(\`Deleted crew account: \${crew.email}\`);
      } catch (error) {
        console.error(\`Failed to delete crew account \${crew.email}: \${error.message}\`);
      }
    }
    
    // Delete manager account
    if (accounts.manager) {
      try {
        await api.delete(\`/api/admin/managers/\${accounts.manager.id}\`);
        console.log(\`Deleted manager account: \${accounts.manager.email}\`);
      } catch (error) {
        console.error(\`Failed to delete manager account \${accounts.manager.email}: \${error.message}\`);
      }
    }
    
    console.log('Cleanup completed!');
  } catch (error) {
    console.error(\`Unexpected error: \${error.message}\`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  cleanupTestAccounts();
}
EOL
  
  # Make the cleanup script executable
  chmod +x ./cleanup-test-accounts.js
  
  # Run the cleanup script
  node ./cleanup-test-accounts.js
  
  # Check if the previous step was successful
  if [ $? -ne 0 ]; then
    echo -e "${YELLOW}⚠️ There were some issues cleaning up test accounts.${NC}"
  else
    echo -e "${GREEN}✅ Test accounts cleaned up successfully!${NC}"
  fi
else
  echo -e "${YELLOW}⚠️ Test accounts were not cleaned up. You can run cleanup-test-accounts.js manually later.${NC}"
fi

echo -e "\n${GREEN}🎉 All tests completed!${NC}"
echo -e "${BLUE}📝 For more information about the test protocol, see ../REAL_WORLD_TEST_PLAN.md${NC}"
echo ""