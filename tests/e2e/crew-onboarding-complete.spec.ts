/**
 * Complete Crew Onboarding Journey E2E Test
 * Tests the entire crew onboarding process using Page Object Model
 */

import { test, expect } from '@playwright/test';
import { CrewOnboardingPage } from './pages/CrewOnboardingPage';
import { LoginPage } from './pages/LoginPage';
import { testUsers, testDocuments, quizQuestions, generateRandomEmail } from './fixtures/testData';
import { AuthHelper } from './helpers/authHelper';

test.describe('Complete Crew Onboarding Journey', () => {
  let crewOnboardingPage: CrewOnboardingPage;
  let loginPage: LoginPage;
  let testCrewEmail: string;

  test.beforeEach(async ({ page }) => {
    crewOnboardingPage = new CrewOnboardingPage(page);
    loginPage = new LoginPage(page);
    testCrewEmail = generateRandomEmail();
  });

  test('should complete full crew onboarding process from invitation to certificate', async ({ page }) => {
    // Test data for this journey
    const crewData = {
      ...testUsers.crew,
      email: testCrewEmail
    };

    // Step 1: Request magic link
    await test.step('Request magic link for crew access', async () => {
      await loginPage.gotoLoginPage('crew');
      await loginPage.requestMagicLink(crewData.email);
      
      const successMessage = await loginPage.getSuccessMessage();
      expect(successMessage).toContain('Magic link sent');
    });

    // Step 2: Access onboarding with magic link (simulated)
    await test.step('Access onboarding via magic link', async () => {
      // In real test, we would extract token from email
      const mockToken = 'test-magic-token-12345';
      await crewOnboardingPage.startOnboarding(mockToken);
      
      const stepName = await crewOnboardingPage.getCurrentStepName();
      expect(stepName).toContain('Personal Information');
    });

    // Step 3: Fill personal information
    await test.step('Complete personal information form', async () => {
      await crewOnboardingPage.fillPersonalInformation(crewData);
      
      // Verify data was filled
      const filledEmail = await page.inputValue(crewOnboardingPage.emailInput);
      expect(filledEmail).toBe(crewData.email);
      
      await crewOnboardingPage.continueToNextStep();
      
      const nextStep = await crewOnboardingPage.getCurrentStepName();
      expect(nextStep).toContain('Documents');
    });

    // Step 4: Upload required documents
    await test.step('Upload all required documents', async () => {
      // Mock file uploads for testing
      await crewOnboardingPage.uploadMockDocument('passport');
      await crewOnboardingPage.uploadMockDocument('medical');
      await crewOnboardingPage.uploadMockDocument('stcw');
      
      // Verify uploads
      expect(await crewOnboardingPage.isDocumentUploaded('passport')).toBeTruthy();
      expect(await crewOnboardingPage.isDocumentUploaded('medical')).toBeTruthy();
      expect(await crewOnboardingPage.isDocumentUploaded('stcw')).toBeTruthy();
      
      await crewOnboardingPage.continueToNextStep();
      
      const nextStep = await crewOnboardingPage.getCurrentStepName();
      expect(nextStep).toContain('Training');
    });

    // Step 5: Complete training modules
    await test.step('Complete all training modules', async () => {
      const trainingModules = ['Safety Training', 'Security Awareness', 'Environmental Protection'];
      
      for (const module of trainingModules) {
        await crewOnboardingPage.completeTrainingModule(module);
      }
      
      const progress = await crewOnboardingPage.getTrainingProgress();
      expect(progress).toBe(100);
      
      await crewOnboardingPage.continueToNextStep();
      
      const nextStep = await crewOnboardingPage.getCurrentStepName();
      expect(nextStep).toContain('Assessment');
    });

    // Step 6: Take and pass the quiz
    await test.step('Complete knowledge assessment quiz', async () => {
      await crewOnboardingPage.startQuiz();
      
      // Answer questions correctly (using first option for all as mock)
      const correctAnswers = new Array(10).fill(0);
      await crewOnboardingPage.completeQuiz(correctAnswers);
      
      const score = await crewOnboardingPage.getQuizScore();
      expect(score).toBeGreaterThanOrEqual(70); // Passing score
      
      const passed = await crewOnboardingPage.isQuizPassed();
      expect(passed).toBeTruthy();
      
      await crewOnboardingPage.continueToNextStep();
    });

    // Step 7: Verify onboarding completion
    await test.step('Verify onboarding completion and certificate', async () => {
      const isComplete = await crewOnboardingPage.isOnboardingComplete();
      expect(isComplete).toBeTruthy();
      
      const completionSummary = await crewOnboardingPage.getCompletionSummary();
      expect(completionSummary.personalInfo).toBeTruthy();
      expect(completionSummary.documents).toBeTruthy();
      expect(completionSummary.training).toBeTruthy();
      expect(completionSummary.assessment).toBeTruthy();
      
      // Check certificate is available
      const certificateLink = page.locator(crewOnboardingPage.certificateDownload);
      await expect(certificateLink).toBeVisible();
    });

    // Step 8: Test progress persistence
    await test.step('Verify progress is saved and can be resumed', async () => {
      // Navigate away
      await page.goto('/');
      
      // Return to onboarding
      await crewOnboardingPage.startOnboarding('test-magic-token-12345');
      
      // Should be on completion page
      const isComplete = await crewOnboardingPage.isOnboardingComplete();
      expect(isComplete).toBeTruthy();
    });
  });

  test('should handle quiz failure and allow retake', async ({ page }) => {
    // Setup: Navigate to quiz step directly
    await crewOnboardingPage.navigateToStep('quiz');
    await crewOnboardingPage.startQuiz();
    
    // Answer questions incorrectly
    const wrongAnswers = new Array(10).fill(3); // Assuming last option is wrong
    await crewOnboardingPage.completeQuiz(wrongAnswers);
    
    // Verify failure
    const score = await crewOnboardingPage.getQuizScore();
    expect(score).toBeLessThan(70);
    
    const passed = await crewOnboardingPage.isQuizPassed();
    expect(passed).toBeFalsy();
    
    // Retake quiz
    await crewOnboardingPage.retakeQuiz();
    
    // Answer correctly this time
    const correctAnswers = new Array(10).fill(0);
    await crewOnboardingPage.completeQuiz(correctAnswers);
    
    // Verify pass
    const retakeScore = await crewOnboardingPage.getQuizScore();
    expect(retakeScore).toBeGreaterThanOrEqual(70);
  });

  test('should validate required fields in personal information', async ({ page }) => {
    await crewOnboardingPage.startOnboarding('test-token');
    
    // Try to continue without filling required fields
    await crewOnboardingPage.continueToNextStep();
    
    // Should show validation errors
    const hasErrors = await crewOnboardingPage.hasValidationErrors();
    expect(hasErrors).toBeTruthy();
    
    // Check specific field errors
    const nameError = await crewOnboardingPage.getFieldError('fullName');
    expect(nameError).toContain('required');
    
    const emailError = await crewOnboardingPage.getFieldError('email');
    expect(emailError).toContain('required');
  });

  test('should handle document upload errors gracefully', async ({ page }) => {
    await crewOnboardingPage.navigateToStep('documents');
    
    // Try to upload invalid file type
    const invalidFile = {
      name: 'test.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('invalid file content')
    };
    
    await page.locator(crewOnboardingPage.passportUpload).setInputFiles(invalidFile);
    
    // Should show error
    const errorMessage = await crewOnboardingPage.getErrorMessage();
    expect(errorMessage).toContain('PDF');
  });

  test('should work on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await crewOnboardingPage.startOnboarding('test-token');
    
    // Verify mobile layout
    const stepTitle = await crewOnboardingPage.getCurrentStepName();
    expect(stepTitle).toContain('Personal Information');
    
    // Fill form on mobile
    await crewOnboardingPage.fillPersonalInformation({
      ...testUsers.crew,
      email: testCrewEmail
    });
    
    // Verify form submission works
    await crewOnboardingPage.continueToNextStep();
    const nextStep = await crewOnboardingPage.getCurrentStepName();
    expect(nextStep).toContain('Documents');
  });

  test('should show progress throughout onboarding', async ({ page }) => {
    await crewOnboardingPage.startOnboarding('test-token');
    
    // Check initial progress
    let progress = await crewOnboardingPage.getOverallProgress();
    expect(progress).toBe(0);
    
    // Complete personal info
    await crewOnboardingPage.fillPersonalInformation({
      ...testUsers.crew,
      email: testCrewEmail
    });
    await crewOnboardingPage.continueToNextStep();
    
    // Progress should increase
    progress = await crewOnboardingPage.getOverallProgress();
    expect(progress).toBeGreaterThan(0);
    expect(progress).toBeLessThan(100);
  });

  test('should handle session timeout gracefully', async ({ page }) => {
    await crewOnboardingPage.startOnboarding('expired-token');
    
    // Should show expired message
    const errorMessage = await page.locator('text=expired').textContent();
    expect(errorMessage).toContain('expired');
    
    // Should offer to request new link
    const requestNewLink = page.locator('button:has-text("Request New Link")');
    await expect(requestNewLink).toBeVisible();
  });

  test('should allow saving progress at any step', async ({ page }) => {
    await crewOnboardingPage.startOnboarding('test-token');
    
    // Fill partial information
    await page.fill(crewOnboardingPage.fullNameInput, 'Test User');
    await page.fill(crewOnboardingPage.emailInput, testCrewEmail);
    
    // Save progress
    await crewOnboardingPage.saveProgress();
    
    // Verify progress is saved
    const isSaved = await crewOnboardingPage.isProgressSaved();
    expect(isSaved).toBeTruthy();
  });

  test('should provide help and support options', async ({ page }) => {
    await crewOnboardingPage.startOnboarding('test-token');
    
    // Check help is available
    const helpAvailable = await crewOnboardingPage.isHelpAvailable();
    expect(helpAvailable).toBeTruthy();
    
    // Open help
    await crewOnboardingPage.openHelp();
    
    // Verify help content is shown
    const helpContent = page.locator('.help-content');
    await expect(helpContent).toBeVisible();
  });

  test('should handle concurrent onboarding sessions', async ({ browser }) => {
    // Create two contexts for different crew members
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    const crewPage1 = new CrewOnboardingPage(page1);
    const crewPage2 = new CrewOnboardingPage(page2);
    
    // Start onboarding for both
    await crewPage1.startOnboarding('token-1');
    await crewPage2.startOnboarding('token-2');
    
    // Fill different data
    await crewPage1.fillPersonalInformation({
      ...testUsers.crew,
      email: 'crew1@test.com',
      fullName: 'Crew Member 1'
    });
    
    await crewPage2.fillPersonalInformation({
      ...testUsers.crew,
      email: 'crew2@test.com',
      fullName: 'Crew Member 2'
    });
    
    // Verify data isolation
    const name1 = await page1.inputValue(crewPage1.fullNameInput);
    const name2 = await page2.inputValue(crewPage2.fullNameInput);
    
    expect(name1).toBe('Crew Member 1');
    expect(name2).toBe('Crew Member 2');
    
    await context1.close();
    await context2.close();
  });
});