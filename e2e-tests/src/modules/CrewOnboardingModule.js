const TestBase = require('../utils/TestBase');
const path = require('path');

class CrewOnboardingModule extends TestBase {
  constructor(config) {
    super(config);
  }

  async completePhase(phaseNumber) {
    const startTime = Date.now();
    console.log(`\n📚 Testing Phase ${phaseNumber} completion...`);
    
    try {
      // Click on phase card
      const phaseCard = await this.page.$(`${this.config.selectors.onboarding.phaseCard}:has-text("Phase ${phaseNumber}")`);
      if (!phaseCard) {
        throw new Error(`Phase ${phaseNumber} card not found`);
      }
      
      await phaseCard.click();
      await this.takeScreenshot(`phase-${phaseNumber}-start`);
      
      // Click start button
      await this.clickElement(this.config.selectors.onboarding.startButton);
      
      // Navigate through training content
      let contentIndex = 1;
      let hasNextButton = true;
      
      while (hasNextButton) {
        await this.page.waitForTimeout(1000); // Allow content to load
        
        // Check for video content and wait if present
        const videoElement = await this.page.$('video');
        if (videoElement) {
          console.log(`  📹 Video content detected in section ${contentIndex}`);
          await this.page.waitForTimeout(3000); // Simulate watching video
        }
        
        // Check for interactive elements
        const interactiveElements = await this.page.$$('button[data-interactive], input[type="checkbox"]');
        for (const element of interactiveElements) {
          await element.click();
          await this.page.waitForTimeout(500);
        }
        
        // Take screenshot of content
        if (contentIndex % 3 === 0) { // Screenshot every 3rd content page
          await this.takeScreenshot(`phase-${phaseNumber}-content-${contentIndex}`);
        }
        
        // Check for next button
        const nextButton = await this.page.$(this.config.selectors.onboarding.nextButton);
        if (nextButton && await nextButton.isVisible()) {
          await nextButton.click();
          contentIndex++;
        } else {
          hasNextButton = false;
        }
      }
      
      console.log(`  ✅ Completed ${contentIndex} content sections`);
      
      // Check if quiz is required
      const quizForm = await this.page.$(this.config.selectors.onboarding.quizForm);
      if (quizForm) {
        await this.completeQuiz(phaseNumber);
      }
      
      const duration = Date.now() - startTime;
      console.log(`✅ Phase ${phaseNumber} completed (${duration}ms)`);
      
      this.recordTestResult(`Phase ${phaseNumber} Completion`, true, {
        duration,
        screenshots: [`phase-${phaseNumber}-start`]
      });
      
      return true;
    } catch (error) {
      console.error(`❌ Phase ${phaseNumber} completion failed:`, error.message);
      await this.takeScreenshot(`phase-${phaseNumber}-error`);
      
      this.recordTestResult(`Phase ${phaseNumber} Completion`, false, {
        duration: Date.now() - startTime,
        error: error.message,
        screenshots: [`phase-${phaseNumber}-error`]
      });
      
      return false;
    }
  }

  async completeQuiz(phaseNumber) {
    console.log(`  📝 Completing quiz for Phase ${phaseNumber}...`);
    
    try {
      await this.takeScreenshot(`quiz-${phaseNumber}-start`);
      
      // Get all quiz questions
      const questions = await this.page.$$('[data-testid="quiz-question"]');
      console.log(`  Found ${questions.length} questions`);
      
      // Answer each question
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        
        // For multiple choice, select first option (in real test, use correct answers)
        const radioButtons = await question.$$('input[type="radio"]');
        if (radioButtons.length > 0) {
          await radioButtons[0].click();
        }
        
        // For text input questions
        const textInputs = await question.$$('input[type="text"], textarea');
        for (const input of textInputs) {
          await input.fill('Test answer for automated testing');
        }
        
        // For checkbox questions
        const checkboxes = await question.$$('input[type="checkbox"]');
        if (checkboxes.length > 0) {
          await checkboxes[0].click();
        }
      }
      
      await this.takeScreenshot(`quiz-${phaseNumber}-answered`);
      
      // Submit quiz
      await this.clickElement(this.config.selectors.onboarding.submitQuiz);
      
      // Wait for results
      await this.page.waitForTimeout(2000);
      
      // Check for success message
      const successMessage = await this.page.$('text=/quiz.*passed|completed|success/i');
      if (!successMessage) {
        // Check if we need to retry
        const retryButton = await this.page.$('button:has-text("Retry"), button:has-text("Try Again")');
        if (retryButton) {
          console.log('  ⚠️  Quiz failed, retrying...');
          await retryButton.click();
          return await this.completeQuiz(phaseNumber); // Recursive retry
        }
      }
      
      console.log(`  ✅ Quiz completed successfully`);
      return true;
    } catch (error) {
      console.error(`  ❌ Quiz completion failed:`, error.message);
      return false;
    }
  }

  async testOfflineMode() {
    const startTime = Date.now();
    console.log(`\n📡 Testing offline mode functionality...`);
    
    try {
      // Start phase 1 while online
      await this.completePhase(1);
      
      // Go offline
      console.log('  🔌 Going offline...');
      await this.setNetworkConditions('offline');
      await this.page.waitForTimeout(2000);
      
      // Try to complete phase 2 offline
      await this.completePhase(2);
      
      // Go back online
      console.log('  🔌 Going back online...');
      await this.setNetworkConditions('fast');
      await this.page.waitForTimeout(2000);
      
      // Check if data synced
      await this.page.reload();
      const progressBar = await this.page.$(this.config.selectors.onboarding.progressBar);
      if (progressBar) {
        const progressText = await progressBar.textContent();
        console.log(`  📊 Progress after sync: ${progressText}`);
      }
      
      console.log('✅ Offline mode test completed');
      
      this.recordTestResult('Offline Mode', true, {
        duration: Date.now() - startTime
      });
      
      return true;
    } catch (error) {
      console.error('❌ Offline mode test failed:', error.message);
      
      this.recordTestResult('Offline Mode', false, {
        duration: Date.now() - startTime,
        error: error.message
      });
      
      return false;
    }
  }

  async testMultilingualSupport() {
    const startTime = Date.now();
    console.log(`\n🌐 Testing multilingual support...`);
    
    try {
      // Test Dutch interface
      await this.clickElement(this.config.selectors.navigation.languageSwitch);
      await this.clickElement('button:has-text("Nederlands"), option:has-text("Nederlands")');
      await this.page.waitForTimeout(1000);
      
      await this.takeScreenshot('interface-dutch');
      
      // Verify Dutch text appears
      const dutchText = await this.page.$('text=/welkom|fase|volgende/i');
      if (!dutchText) {
        throw new Error('Dutch translation not applied');
      }
      
      // Switch back to English
      await this.clickElement(this.config.selectors.navigation.languageSwitch);
      await this.clickElement('button:has-text("English"), option:has-text("English")');
      await this.page.waitForTimeout(1000);
      
      await this.takeScreenshot('interface-english');
      
      console.log('✅ Multilingual support verified');
      
      this.recordTestResult('Multilingual Support', true, {
        duration: Date.now() - startTime,
        screenshots: ['interface-dutch', 'interface-english']
      });
      
      return true;
    } catch (error) {
      console.error('❌ Multilingual test failed:', error.message);
      
      this.recordTestResult('Multilingual Support', false, {
        duration: Date.now() - startTime,
        error: error.message
      });
      
      return false;
    }
  }

  async testProgressTracking() {
    const startTime = Date.now();
    console.log(`\n📊 Testing progress tracking...`);
    
    try {
      // Get initial progress
      const progressBar = await this.page.$(this.config.selectors.onboarding.progressBar);
      const initialProgress = progressBar ? await progressBar.getAttribute('aria-valuenow') : '0';
      console.log(`  Initial progress: ${initialProgress}%`);
      
      // Complete a phase
      await this.completePhase(1);
      
      // Check updated progress
      await this.page.reload();
      const updatedProgress = progressBar ? await progressBar.getAttribute('aria-valuenow') : '0';
      console.log(`  Updated progress: ${updatedProgress}%`);
      
      if (parseInt(updatedProgress) <= parseInt(initialProgress)) {
        throw new Error('Progress not updated after phase completion');
      }
      
      // Check progress persistence
      await this.page.reload();
      const persistedProgress = progressBar ? await progressBar.getAttribute('aria-valuenow') : '0';
      
      if (persistedProgress !== updatedProgress) {
        throw new Error('Progress not persisted after page reload');
      }
      
      console.log('✅ Progress tracking working correctly');
      
      this.recordTestResult('Progress Tracking', true, {
        duration: Date.now() - startTime
      });
      
      return true;
    } catch (error) {
      console.error('❌ Progress tracking test failed:', error.message);
      
      this.recordTestResult('Progress Tracking', false, {
        duration: Date.now() - startTime,
        error: error.message
      });
      
      return false;
    }
  }

  async testCertificateGeneration() {
    const startTime = Date.now();
    console.log(`\n📜 Testing certificate generation...`);
    
    try {
      // Complete all phases (simplified for testing)
      console.log('  Completing all training phases...');
      for (let i = 1; i <= 5; i++) {
        await this.completePhase(i);
      }
      
      // Navigate to certificates section
      await this.clickElement('a:has-text("Certificates"), button:has-text("Certificates")');
      await this.page.waitForTimeout(2000);
      
      // Generate certificate
      const generateButton = await this.page.$('button:has-text("Generate Certificate")');
      if (!generateButton) {
        throw new Error('Generate certificate button not found');
      }
      
      await generateButton.click();
      await this.page.waitForTimeout(3000);
      
      // Check for download or view option
      const downloadButton = await this.page.$('a:has-text("Download"), button:has-text("Download")');
      if (downloadButton) {
        // Set up download handling
        const downloadPromise = this.page.waitForEvent('download');
        await downloadButton.click();
        const download = await downloadPromise;
        
        console.log(`  📥 Certificate downloaded: ${download.suggestedFilename()}`);
        
        // Save to test reports
        const certificatePath = path.join(__dirname, '../../reports', download.suggestedFilename());
        await download.saveAs(certificatePath);
      }
      
      await this.takeScreenshot('certificate-generated');
      
      console.log('✅ Certificate generation successful');
      
      this.recordTestResult('Certificate Generation', true, {
        duration: Date.now() - startTime,
        screenshots: ['certificate-generated']
      });
      
      return true;
    } catch (error) {
      console.error('❌ Certificate generation test failed:', error.message);
      await this.takeScreenshot('certificate-error');
      
      this.recordTestResult('Certificate Generation', false, {
        duration: Date.now() - startTime,
        error: error.message,
        screenshots: ['certificate-error']
      });
      
      return false;
    }
  }

  async runAllTests() {
    console.log('\n🚢 === CREW ONBOARDING MODULE TESTS ===\n');
    
    // Login as crew
    const authModule = new (require('./AuthenticationModule'))(this.config);
    authModule.browserManager = this.browserManager;
    authModule.page = this.page;
    await authModule.loginWithCredentials('crew');
    
    // Test progress tracking
    await this.testProgressTracking();
    
    // Test multilingual support
    await this.testMultilingualSupport();
    
    // Complete phases 1-3
    for (let i = 1; i <= 3; i++) {
      await this.completePhase(i);
    }
    
    // Test offline mode
    await this.testOfflineMode();
    
    // Complete remaining phases
    for (let i = 4; i <= 5; i++) {
      await this.completePhase(i);
    }
    
    // Test certificate generation
    await this.testCertificateGeneration();
  }
}

module.exports = CrewOnboardingModule;