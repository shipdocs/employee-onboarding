/**
 * Crew Onboarding Page Object
 * Handles the multi-step crew onboarding process
 */

import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export interface CrewMemberData {
  email: string;
  fullName: string;
  dateOfBirth: string;
  nationality: string;
  position: string;
  phoneNumber?: string;
  address?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
}

export class CrewOnboardingPage extends BasePage {
  // Step indicators
  readonly progressIndicator = '.progress-indicator';
  readonly currentStep = '.current-step';
  readonly stepTitle = 'h2';
  
  // Personal Information step
  readonly fullNameInput = 'input[name="fullName"]';
  readonly emailInput = 'input[name="email"]';
  readonly dateOfBirthInput = 'input[name="dateOfBirth"]';
  readonly nationalitySelect = 'select[name="nationality"]';
  readonly positionInput = 'input[name="position"]';
  readonly phoneNumberInput = 'input[name="phoneNumber"]';
  readonly addressInput = 'textarea[name="address"]';
  readonly emergencyContactInput = 'input[name="emergencyContact"]';
  readonly emergencyPhoneInput = 'input[name="emergencyPhone"]';
  
  // Documents step
  readonly documentUploadInput = 'input[type="file"]';
  readonly passportUpload = '[data-document="passport"] input[type="file"]';
  readonly medicalCertUpload = '[data-document="medical"] input[type="file"]';
  readonly stwcUpload = '[data-document="stcw"] input[type="file"]';
  readonly uploadedDocumentsList = '.uploaded-documents';
  
  // Training step
  readonly trainingModules = '.training-module';
  readonly startTrainingButton = 'button:has-text("Start")';
  readonly completeTrainingButton = 'button:has-text("Mark as Complete")';
  readonly trainingProgress = '.training-progress';
  
  // Quiz step
  readonly startQuizButton = 'button:has-text("Start Quiz")';
  readonly quizQuestion = '.quiz-question';
  readonly quizOptions = 'input[type="radio"]';
  readonly nextQuestionButton = 'button:has-text("Next Question")';
  readonly submitQuizButton = 'button:has-text("Submit Quiz")';
  readonly quizScore = '.quiz-score';
  readonly retakeQuizButton = 'button:has-text("Retake Quiz")';
  
  // Navigation
  readonly continueButton = 'button:has-text("Continue")';
  readonly backButton = 'button:has-text("Back")';
  readonly saveProgressButton = 'button:has-text("Save Progress")';
  
  // Completion
  readonly completionStatus = '.completion-status';
  readonly certificateDownload = 'a:has-text("Download Certificate")';

  constructor(page: Page) {
    super(page);
  }

  /**
   * Start onboarding process
   */
  async startOnboarding(token?: string) {
    if (token) {
      await this.goto(`/crew/onboarding?token=${token}`);
    } else {
      await this.goto('/crew');
      await this.page.click('button:has-text("Start Onboarding")');
    }
    await this.waitForPageLoad();
  }

  /**
   * Get current step number
   */
  async getCurrentStepNumber(): Promise<number> {
    const stepText = await this.getTextContent(this.currentStep);
    const match = stepText.match(/Step (\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  /**
   * Get current step name
   */
  async getCurrentStepName(): Promise<string> {
    return await this.getTextContent(this.stepTitle);
  }

  /**
   * Fill personal information
   */
  async fillPersonalInformation(data: CrewMemberData) {
    await this.fillInput(this.fullNameInput, data.fullName);
    await this.fillInput(this.emailInput, data.email);
    await this.fillInput(this.dateOfBirthInput, data.dateOfBirth);
    await this.selectOption(this.nationalitySelect, data.nationality);
    await this.fillInput(this.positionInput, data.position);
    
    if (data.phoneNumber) {
      await this.fillInput(this.phoneNumberInput, data.phoneNumber);
    }
    if (data.address) {
      await this.fillInput(this.addressInput, data.address);
    }
    if (data.emergencyContact) {
      await this.fillInput(this.emergencyContactInput, data.emergencyContact);
    }
    if (data.emergencyPhone) {
      await this.fillInput(this.emergencyPhoneInput, data.emergencyPhone);
    }
  }

  /**
   * Upload document
   */
  async uploadDocument(documentType: 'passport' | 'medical' | 'stcw', filePath: string) {
    let selector: string;
    switch (documentType) {
      case 'passport':
        selector = this.passportUpload;
        break;
      case 'medical':
        selector = this.medicalCertUpload;
        break;
      case 'stcw':
        selector = this.stwcUpload;
        break;
    }
    
    await this.uploadFile(selector, filePath);
    // Wait for upload to complete
    await this.waitForResponse(/\/api\/crew\/upload-document/);
  }

  /**
   * Upload mock document (for testing)
   */
  async uploadMockDocument(documentType: 'passport' | 'medical' | 'stcw') {
    const mockFile = {
      name: `${documentType}.pdf`,
      mimeType: 'application/pdf',
      buffer: Buffer.from('mock pdf content for testing')
    };
    
    let selector: string;
    switch (documentType) {
      case 'passport':
        selector = this.passportUpload;
        break;
      case 'medical':
        selector = this.medicalCertUpload;
        break;
      case 'stcw':
        selector = this.stwcUpload;
        break;
    }
    
    await this.page.locator(selector).setInputFiles(mockFile);
  }

  /**
   * Check if document is uploaded
   */
  async isDocumentUploaded(documentType: string): Promise<boolean> {
    const uploadedDocs = await this.getTextContent(this.uploadedDocumentsList);
    return uploadedDocs.toLowerCase().includes(documentType.toLowerCase());
  }

  /**
   * Complete training module
   */
  async completeTrainingModule(moduleName: string) {
    // Find and click the specific module
    const module = this.page.locator(`.training-module:has-text("${moduleName}")`);
    const startButton = module.locator(this.startTrainingButton);
    
    if (await startButton.isVisible()) {
      await startButton.click();
      await this.waitForPageLoad();
      
      // Wait for training content to load
      await this.page.waitForTimeout(2000); // Simulate reading/watching
      
      // Complete the training
      await this.page.click(this.completeTrainingButton);
      await this.waitForResponse(/\/api\/crew\/complete-training/);
    }
  }

  /**
   * Get training progress percentage
   */
  async getTrainingProgress(): Promise<number> {
    const progressText = await this.getTextContent(this.trainingProgress);
    const match = progressText.match(/(\d+)%/);
    return match ? parseInt(match[1]) : 0;
  }

  /**
   * Start quiz
   */
  async startQuiz() {
    await this.page.click(this.startQuizButton);
    await this.waitForPageLoad();
  }

  /**
   * Answer quiz question
   */
  async answerQuizQuestion(optionIndex: number) {
    const options = this.page.locator(this.quizOptions);
    await options.nth(optionIndex).click();
  }

  /**
   * Complete entire quiz
   */
  async completeQuiz(answers: number[]) {
    for (let i = 0; i < answers.length; i++) {
      await this.answerQuizQuestion(answers[i]);
      
      if (i < answers.length - 1) {
        await this.page.click(this.nextQuestionButton);
      } else {
        await this.page.click(this.submitQuizButton);
      }
      
      await this.page.waitForTimeout(500); // Small delay between questions
    }
    
    // Wait for results
    await this.waitForResponse(/\/api\/crew\/submit-quiz/);
  }

  /**
   * Get quiz score
   */
  async getQuizScore(): Promise<number> {
    const scoreText = await this.getTextContent(this.quizScore);
    const match = scoreText.match(/(\d+)%/);
    return match ? parseInt(match[1]) : 0;
  }

  /**
   * Check if quiz passed
   */
  async isQuizPassed(): Promise<boolean> {
    const score = await this.getQuizScore();
    return score >= 70; // Assuming 70% is passing
  }

  /**
   * Retake quiz
   */
  async retakeQuiz() {
    await this.page.click(this.retakeQuizButton);
    await this.waitForPageLoad();
  }

  /**
   * Continue to next step
   */
  async continueToNextStep() {
    await this.page.click(this.continueButton);
    await this.waitForPageLoad();
  }

  /**
   * Go back to previous step
   */
  async goToPreviousStep() {
    await this.page.click(this.backButton);
    await this.waitForPageLoad();
  }

  /**
   * Save progress
   */
  async saveProgress() {
    if (await this.isElementVisible(this.saveProgressButton)) {
      await this.page.click(this.saveProgressButton);
      await this.waitForResponse(/\/api\/crew\/save-progress/);
    }
  }

  /**
   * Check if onboarding is complete
   */
  async isOnboardingComplete(): Promise<boolean> {
    return await this.isElementVisible(this.completionStatus);
  }

  /**
   * Download certificate
   */
  async downloadCertificate(): Promise<string> {
    return await this.downloadFile(this.certificateDownload);
  }

  /**
   * Get completion summary
   */
  async getCompletionSummary(): Promise<{
    personalInfo: boolean;
    documents: boolean;
    training: boolean;
    assessment: boolean;
  }> {
    const summary = await this.getTextContent(this.completionStatus);
    
    return {
      personalInfo: summary.includes('Personal Information: Complete'),
      documents: summary.includes('Documents: Complete'),
      training: summary.includes('Training: Complete'),
      assessment: summary.includes('Assessment: Passed')
    };
  }

  /**
   * Navigate to specific step
   */
  async navigateToStep(step: 'personal' | 'documents' | 'training' | 'quiz' | 'completion') {
    const currentUrl = await this.getCurrentUrl();
    const url = new URL(currentUrl);
    url.searchParams.set('step', step);
    await this.goto(url.pathname + url.search);
    await this.waitForPageLoad();
  }

  /**
   * Check if form has validation errors
   */
  async hasValidationErrors(): Promise<boolean> {
    return await this.isElementVisible('.validation-error, .field-error');
  }

  /**
   * Get validation error for field
   */
  async getFieldError(fieldName: string): Promise<string> {
    const errorSelector = `[name="${fieldName}"] ~ .error-message, .field-error[data-field="${fieldName}"]`;
    if (await this.isElementVisible(errorSelector)) {
      return await this.getTextContent(errorSelector);
    }
    return '';
  }

  /**
   * Check if session is saved
   */
  async isProgressSaved(): Promise<boolean> {
    const savedData = await this.getLocalStorageItem('onboarding_progress');
    return savedData !== null;
  }

  /**
   * Clear saved progress
   */
  async clearProgress() {
    await this.page.evaluate(() => {
      localStorage.removeItem('onboarding_progress');
      sessionStorage.clear();
    });
  }

  /**
   * Get time remaining for session
   */
  async getSessionTimeRemaining(): Promise<string> {
    const timerSelector = '.session-timer';
    if (await this.isElementVisible(timerSelector)) {
      return await this.getTextContent(timerSelector);
    }
    return '';
  }

  /**
   * Check if help is available
   */
  async isHelpAvailable(): Promise<boolean> {
    return await this.isElementVisible('.help-button, [aria-label="Help"]');
  }

  /**
   * Open help
   */
  async openHelp() {
    await this.page.click('.help-button, [aria-label="Help"]');
    await this.page.waitForSelector('.help-content', { state: 'visible' });
  }

  /**
   * Get progress percentage
   */
  async getOverallProgress(): Promise<number> {
    const progressBar = this.page.locator('.progress-bar, [role="progressbar"]');
    const value = await progressBar.getAttribute('aria-valuenow');
    return value ? parseInt(value) : 0;
  }
}