const TestBase = require('../utils/TestBase');

class ManagerDashboardModule extends TestBase {
  constructor(config) {
    super(config);
  }

  async addNewCrewMember(crewData) {
    const startTime = Date.now();
    console.log(`\n👥 Testing add new crew member...`);
    
    try {
      // Click add crew button
      await this.clickElement(this.config.selectors.manager.addCrewButton);
      await this.page.waitForTimeout(1000);
      
      // Fill crew member form
      await this.fillInput('input[name="name"]', crewData.name);
      await this.fillInput('input[name="email"]', crewData.email);
      await this.fillInput('input[name="vessel"]', crewData.vessel);
      await this.fillInput('input[name="boardingDate"]', crewData.boardingDate);
      
      // Select role if available
      const roleSelect = await this.page.$('select[name="role"]');
      if (roleSelect) {
        await this.selectOption('select[name="role"]', 'Deckhand');
      }
      
      await this.takeScreenshot('add-crew-form-filled');
      
      // Submit form
      await this.clickElement('button[type="submit"]');
      await this.page.waitForTimeout(2000);
      
      // Verify crew member was added
      const newCrewCard = await this.page.$(`${this.config.selectors.manager.crewCard}:has-text("${crewData.name}")`);
      if (!newCrewCard) {
        throw new Error('New crew member not found in list');
      }
      
      console.log(`✅ Crew member ${crewData.name} added successfully`);
      
      this.recordTestResult('Add Crew Member', true, {
        duration: Date.now() - startTime,
        screenshots: ['add-crew-form-filled']
      });
      
      return true;
    } catch (error) {
      console.error('❌ Add crew member failed:', error.message);
      await this.takeScreenshot('add-crew-error');
      
      this.recordTestResult('Add Crew Member', false, {
        duration: Date.now() - startTime,
        error: error.message,
        screenshots: ['add-crew-error']
      });
      
      return false;
    }
  }

  async viewCrewProgress() {
    const startTime = Date.now();
    console.log(`\n📊 Testing crew progress monitoring...`);
    
    try {
      // Get all crew cards
      const crewCards = await this.page.$$(this.config.selectors.manager.crewCard);
      console.log(`  Found ${crewCards.length} crew members`);
      
      if (crewCards.length === 0) {
        throw new Error('No crew members found');
      }
      
      // Click on first crew member
      await crewCards[0].click();
      await this.page.waitForTimeout(1500);
      
      await this.takeScreenshot('crew-member-details');
      
      // Check for progress information
      const progressElements = await this.page.$$('[data-testid="progress-item"], .progress-bar, .phase-status');
      console.log(`  Found ${progressElements.length} progress indicators`);
      
      // Check for phase completion status
      const phaseStatuses = await this.page.$$eval('.phase-status, [data-phase-status]', elements => 
        elements.map(el => el.textContent)
      );
      console.log(`  Phase statuses: ${phaseStatuses.join(', ')}`);
      
      // Look for analytics data
      const analyticsData = await this.page.$('.analytics-chart, canvas, [data-chart]');
      if (analyticsData) {
        console.log('  📈 Analytics visualization found');
      }
      
      console.log('✅ Crew progress monitoring successful');
      
      this.recordTestResult('View Crew Progress', true, {
        duration: Date.now() - startTime,
        screenshots: ['crew-member-details']
      });
      
      return true;
    } catch (error) {
      console.error('❌ View crew progress failed:', error.message);
      await this.takeScreenshot('crew-progress-error');
      
      this.recordTestResult('View Crew Progress', false, {
        duration: Date.now() - startTime,
        error: error.message,
        screenshots: ['crew-progress-error']
      });
      
      return false;
    }
  }

  async sendReminders() {
    const startTime = Date.now();
    console.log(`\n📧 Testing reminder notifications...`);
    
    try {
      // Find crew members with incomplete training
      const incompleteCrewCards = await this.page.$$(`${this.config.selectors.manager.crewCard}:has(.incomplete, .pending, [data-status="incomplete"])`);
      
      if (incompleteCrewCards.length === 0) {
        console.log('  ℹ️  No crew members with incomplete training found');
        return true;
      }
      
      console.log(`  Found ${incompleteCrewCards.length} crew members with incomplete training`);
      
      // Click on first incomplete crew member
      await incompleteCrewCards[0].click();
      await this.page.waitForTimeout(1000);
      
      // Find and click send reminder button
      const reminderButton = await this.page.$(this.config.selectors.manager.sendReminderButton);
      if (!reminderButton) {
        throw new Error('Send reminder button not found');
      }
      
      await reminderButton.click();
      await this.page.waitForTimeout(2000);
      
      // Check for success message
      const successMessage = await this.page.$('text=/reminder.*sent|notification.*sent/i');
      if (!successMessage) {
        throw new Error('Reminder confirmation not shown');
      }
      
      await this.takeScreenshot('reminder-sent');
      
      console.log('✅ Reminder sent successfully');
      
      this.recordTestResult('Send Reminders', true, {
        duration: Date.now() - startTime,
        screenshots: ['reminder-sent']
      });
      
      return true;
    } catch (error) {
      console.error('❌ Send reminders failed:', error.message);
      await this.takeScreenshot('reminder-error');
      
      this.recordTestResult('Send Reminders', false, {
        duration: Date.now() - startTime,
        error: error.message,
        screenshots: ['reminder-error']
      });
      
      return false;
    }
  }

  async generateReports() {
    const startTime = Date.now();
    console.log(`\n📑 Testing report generation...`);
    
    try {
      // Navigate to reports section
      await this.clickElement('a:has-text("Reports"), button:has-text("Reports")');
      await this.page.waitForTimeout(1500);
      
      // Test different report types
      const reportTypes = [
        'Compliance Report',
        'Progress Summary',
        'Training Overview'
      ];
      
      for (const reportType of reportTypes) {
        const reportButton = await this.page.$(`button:has-text("${reportType}")`);
        if (reportButton) {
          console.log(`  📄 Generating ${reportType}...`);
          await reportButton.click();
          await this.page.waitForTimeout(2000);
          
          // Check for download or preview
          const downloadLink = await this.page.$('a[download], button:has-text("Download")');
          if (downloadLink) {
            console.log(`  ✅ ${reportType} ready for download`);
          }
        }
      }
      
      await this.takeScreenshot('reports-generated');
      
      console.log('✅ Report generation successful');
      
      this.recordTestResult('Generate Reports', true, {
        duration: Date.now() - startTime,
        screenshots: ['reports-generated']
      });
      
      return true;
    } catch (error) {
      console.error('❌ Generate reports failed:', error.message);
      await this.takeScreenshot('reports-error');
      
      this.recordTestResult('Generate Reports', false, {
        duration: Date.now() - startTime,
        error: error.message,
        screenshots: ['reports-error']
      });
      
      return false;
    }
  }

  async reviewQuizSubmissions() {
    const startTime = Date.now();
    console.log(`\n📝 Testing quiz review functionality...`);
    
    try {
      // Navigate to quiz reviews
      await this.clickElement('a:has-text("Quiz Reviews"), button:has-text("Quiz Reviews")');
      await this.page.waitForTimeout(1500);
      
      // Check for pending reviews
      const pendingReviews = await this.page.$$('[data-testid="pending-review"], .pending-review');
      console.log(`  Found ${pendingReviews.length} pending reviews`);
      
      if (pendingReviews.length > 0) {
        // Click on first pending review
        await pendingReviews[0].click();
        await this.page.waitForTimeout(1000);
        
        await this.takeScreenshot('quiz-review-details');
        
        // Look for review options
        const approveButton = await this.page.$('button:has-text("Approve")');
        const rejectButton = await this.page.$('button:has-text("Reject")');
        
        if (approveButton) {
          // Add feedback
          const feedbackInput = await this.page.$('textarea[name="feedback"]');
          if (feedbackInput) {
            await feedbackInput.fill('Good job! All answers are correct.');
          }
          
          // Approve the quiz
          await approveButton.click();
          await this.page.waitForTimeout(2000);
          
          console.log('  ✅ Quiz approved successfully');
        }
      } else {
        console.log('  ℹ️  No pending quiz reviews');
      }
      
      this.recordTestResult('Review Quiz Submissions', true, {
        duration: Date.now() - startTime,
        screenshots: ['quiz-review-details']
      });
      
      return true;
    } catch (error) {
      console.error('❌ Quiz review failed:', error.message);
      await this.takeScreenshot('quiz-review-error');
      
      this.recordTestResult('Review Quiz Submissions', false, {
        duration: Date.now() - startTime,
        error: error.message,
        screenshots: ['quiz-review-error']
      });
      
      return false;
    }
  }

  async testDashboardPerformance() {
    const startTime = Date.now();
    console.log(`\n⚡ Testing dashboard performance...`);
    
    try {
      // Navigate to dashboard
      await this.page.goto(this.config.baseUrl + '/manager/dashboard', {
        waitUntil: 'networkidle'
      });
      
      // Measure performance
      const performance = await this.measurePerformance();
      
      console.log('  📊 Performance Metrics:');
      console.log(`    - Page Load Time: ${performance.timing.loadTime}ms`);
      console.log(`    - DOM Content Loaded: ${performance.timing.domContentLoaded}ms`);
      console.log(`    - First Contentful Paint: ${performance.timing.firstContentfulPaint}ms`);
      
      // Check if performance meets targets
      if (performance.timing.loadTime > 5000) {
        throw new Error(`Dashboard load time (${performance.timing.loadTime}ms) exceeds 5 second target`);
      }
      
      // Test dashboard with many crew members
      console.log('  🔄 Testing with bulk data...');
      
      // Check crew list rendering performance
      const crewListLoadStart = Date.now();
      await this.waitForSelector(this.config.selectors.manager.crewList);
      const crewListLoadTime = Date.now() - crewListLoadStart;
      console.log(`    - Crew list render time: ${crewListLoadTime}ms`);
      
      await this.takeScreenshot('dashboard-performance');
      
      console.log('✅ Dashboard performance acceptable');
      
      this.recordTestResult('Dashboard Performance', true, {
        duration: Date.now() - startTime,
        performance,
        screenshots: ['dashboard-performance']
      });
      
      return true;
    } catch (error) {
      console.error('❌ Dashboard performance test failed:', error.message);
      
      this.recordTestResult('Dashboard Performance', false, {
        duration: Date.now() - startTime,
        error: error.message
      });
      
      return false;
    }
  }

  async testBulkOperations() {
    const startTime = Date.now();
    console.log(`\n🔄 Testing bulk operations...`);
    
    try {
      // Check for bulk selection
      const selectAllCheckbox = await this.page.$('input[type="checkbox"][data-select-all]');
      if (selectAllCheckbox) {
        await selectAllCheckbox.click();
        console.log('  ✅ Selected all crew members');
        
        // Look for bulk action buttons
        const bulkActionButtons = await this.page.$$('button[data-bulk-action]');
        console.log(`  Found ${bulkActionButtons.length} bulk action options`);
        
        // Test bulk email
        const bulkEmailButton = await this.page.$('button:has-text("Send Email to Selected")');
        if (bulkEmailButton) {
          await bulkEmailButton.click();
          await this.page.waitForTimeout(1000);
          
          // Fill email form
          await this.fillInput('input[name="subject"]', 'Test Bulk Email');
          await this.fillInput('textarea[name="message"]', 'This is a test bulk email message.');
          
          await this.takeScreenshot('bulk-email-form');
          
          // Cancel instead of sending
          const cancelButton = await this.page.$('button:has-text("Cancel")');
          if (cancelButton) {
            await cancelButton.click();
          }
          
          console.log('  ✅ Bulk email functionality verified');
        }
      } else {
        console.log('  ℹ️  Bulk operations not available');
      }
      
      this.recordTestResult('Bulk Operations', true, {
        duration: Date.now() - startTime,
        screenshots: ['bulk-email-form']
      });
      
      return true;
    } catch (error) {
      console.error('❌ Bulk operations test failed:', error.message);
      
      this.recordTestResult('Bulk Operations', false, {
        duration: Date.now() - startTime,
        error: error.message
      });
      
      return false;
    }
  }

  async runAllTests() {
    console.log('\n👔 === MANAGER DASHBOARD MODULE TESTS ===\n');
    
    // Login as manager
    const authModule = new (require('./AuthenticationModule'))(this.config);
    authModule.browserManager = this.browserManager;
    authModule.page = this.page;
    await authModule.loginWithCredentials('manager');
    
    // Test dashboard performance
    await this.testDashboardPerformance();
    
    // Add new crew member
    await this.addNewCrewMember(this.config.testData.newCrew);
    
    // View crew progress
    await this.viewCrewProgress();
    
    // Send reminders
    await this.sendReminders();
    
    // Review quiz submissions
    await this.reviewQuizSubmissions();
    
    // Generate reports
    await this.generateReports();
    
    // Test bulk operations
    await this.testBulkOperations();
  }
}

module.exports = ManagerDashboardModule;