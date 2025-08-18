/**
 * Crew Onboarding E2E Tests
 * Tests complete crew member onboarding workflow
 */

import { test, expect } from '@playwright/test';

// Test data
const testCrew = {
  email: 'test.crew@shipdocs.app',
  name: 'Test Crew Member',
  position: 'Deck Officer',
  nationality: 'Netherlands',
  dateOfBirth: '1990-01-01'
};

test.describe('Crew Onboarding Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start from the home page
    await page.goto('/');
  });

  test('should display crew onboarding landing page', async ({ page }) => {
    // Navigate to crew section
    await page.click('text=Crew Member');
    await expect(page).toHaveURL('/crew');

    // Check page elements
    await expect(page.locator('h1')).toContainText('Crew Onboarding');
    await expect(page.locator('text=Welcome to your maritime onboarding')).toBeVisible();
    await expect(page.locator('button:has-text("Start Onboarding")')).toBeVisible();
  });

  test('should request magic link for crew access', async ({ page }) => {
    await page.goto('/crew');
    
    // Click start onboarding
    await page.click('button:has-text("Start Onboarding")');
    await expect(page).toHaveURL('/crew/access');

    // Enter email for magic link
    await page.fill('input[type="email"]', testCrew.email);
    await page.click('button:has-text("Send Magic Link")');

    // Check success message
    await expect(page.locator('text=Magic link sent to your email')).toBeVisible();
    await expect(page.locator('text=Check your email')).toBeVisible();
  });

  test('should validate email format for magic link', async ({ page }) => {
    await page.goto('/crew/access');
    
    // Enter invalid email
    await page.fill('input[type="email"]', 'invalid-email');
    await page.click('button:has-text("Send Magic Link")');
    
    // Check validation error
    await expect(page.locator('text=Please enter a valid email')).toBeVisible();
  });

  test('should complete personal information form', async ({ page }) => {
    // Simulate magic link access (would normally come from email)
    await page.goto('/crew/onboarding?token=test-magic-token');
    
    // Should be on personal info step
    await expect(page.locator('h2')).toContainText('Personal Information');
    
    // Fill personal information
    await page.fill('input[name="fullName"]', testCrew.name);
    await page.fill('input[name="email"]', testCrew.email);
    await page.fill('input[name="dateOfBirth"]', testCrew.dateOfBirth);
    await page.selectOption('select[name="nationality"]', testCrew.nationality);
    await page.fill('input[name="position"]', testCrew.position);
    
    // Continue to next step
    await page.click('button:has-text("Continue")');
    
    // Should progress to next step
    await expect(page.locator('h2')).toContainText('Documents');
  });

  test('should upload required documents', async ({ page }) => {
    // Start from documents step
    await page.goto('/crew/onboarding?token=test-magic-token&step=documents');
    
    // Check required documents list
    await expect(page.locator('text=Passport')).toBeVisible();
    await expect(page.locator('text=Medical Certificate')).toBeVisible();
    await expect(page.locator('text=STCW Certificate')).toBeVisible();
    
    // Upload passport (simulate file upload)
    const passportUpload = page.locator('input[type="file"]').first();
    await passportUpload.setInputFiles({
      name: 'passport.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('fake pdf content')
    });
    
    // Check upload success
    await expect(page.locator('text=passport.pdf uploaded')).toBeVisible();
    
    // Continue to next step
    await page.click('button:has-text("Continue")');
    
    // Should progress to training step
    await expect(page.locator('h2')).toContainText('Training');
  });

  test('should complete training modules', async ({ page }) => {
    // Start from training step
    await page.goto('/crew/onboarding?token=test-magic-token&step=training');
    
    // Check training modules
    await expect(page.locator('text=Safety Training')).toBeVisible();
    await expect(page.locator('text=Security Awareness')).toBeVisible();
    await expect(page.locator('text=Environmental Protection')).toBeVisible();
    
    // Start first training module
    await page.click('button:has-text("Start Safety Training")');
    
    // Should open training content
    await expect(page.locator('h3')).toContainText('Safety Training Module');
    
    // Complete training (simulate watching video/reading content)
    await page.click('button:has-text("Mark as Complete")');
    
    // Should show completion checkmark
    await expect(page.locator('.training-complete')).toBeVisible();
  });

  test('should take and pass quiz', async ({ page }) => {
    // Start from quiz step
    await page.goto('/crew/onboarding?token=test-magic-token&step=quiz');
    
    // Check quiz introduction
    await expect(page.locator('h2')).toContainText('Knowledge Assessment');
    await expect(page.locator('text=10 questions')).toBeVisible();
    
    // Start quiz
    await page.click('button:has-text("Start Quiz")');
    
    // Answer questions (simulate correct answers)
    for (let i = 1; i <= 10; i++) {
      await expect(page.locator(`text=Question ${i}`)).toBeVisible();
      
      // Select first option (assuming it's correct for test)
      await page.click('input[type="radio"]');
      
      if (i < 10) {
        await page.click('button:has-text("Next Question")');
      } else {
        await page.click('button:has-text("Submit Quiz")');
      }
    }
    
    // Check quiz results
    await expect(page.locator('text=Quiz Completed')).toBeVisible();
    await expect(page.locator('text=Score:')).toBeVisible();
    
    // Should show pass/fail status
    await expect(page.locator('text=Passed')).toBeVisible();
  });

  test('should handle quiz failure and retake', async ({ page }) => {
    // Simulate quiz with failing score
    await page.goto('/crew/onboarding?token=test-magic-token&step=quiz');
    
    await page.click('button:has-text("Start Quiz")');
    
    // Answer questions incorrectly
    for (let i = 1; i <= 10; i++) {
      await expect(page.locator(`text=Question ${i}`)).toBeVisible();
      
      // Select last option (assuming it's incorrect)
      const options = page.locator('input[type="radio"]');
      const lastOption = options.last();
      await lastOption.click();
      
      if (i < 10) {
        await page.click('button:has-text("Next Question")');
      } else {
        await page.click('button:has-text("Submit Quiz")');
      }
    }
    
    // Check failure message
    await expect(page.locator('text=Quiz Failed')).toBeVisible();
    await expect(page.locator('text=You need 70% to pass')).toBeVisible();
    
    // Should offer retake option
    await expect(page.locator('button:has-text("Retake Quiz")')).toBeVisible();
  });

  test('should complete onboarding and show completion status', async ({ page }) => {
    // Start from final step
    await page.goto('/crew/onboarding?token=test-magic-token&step=completion');
    
    // Check completion page
    await expect(page.locator('h2')).toContainText('Onboarding Complete');
    await expect(page.locator('text=Congratulations')).toBeVisible();
    
    // Check completion summary
    await expect(page.locator('text=Personal Information: Complete')).toBeVisible();
    await expect(page.locator('text=Documents: Complete')).toBeVisible();
    await expect(page.locator('text=Training: Complete')).toBeVisible();
    await expect(page.locator('text=Assessment: Passed')).toBeVisible();
    
    // Should show next steps
    await expect(page.locator('text=Next Steps')).toBeVisible();
    await expect(page.locator('text=You will receive boarding instructions')).toBeVisible();
  });

  test('should show progress indicator throughout onboarding', async ({ page }) => {
    await page.goto('/crew/onboarding?token=test-magic-token');
    
    // Check progress indicator
    await expect(page.locator('.progress-indicator')).toBeVisible();
    await expect(page.locator('text=Step 1 of 4')).toBeVisible();
    
    // Progress should update as user moves through steps
    await page.click('button:has-text("Continue")');
    await expect(page.locator('text=Step 2 of 4')).toBeVisible();
  });

  test('should save progress and allow resuming', async ({ page }) => {
    // Start onboarding
    await page.goto('/crew/onboarding?token=test-magic-token');
    
    // Fill some information
    await page.fill('input[name="fullName"]', testCrew.name);
    await page.fill('input[name="email"]', testCrew.email);
    
    // Leave page (simulate closing browser)
    await page.goto('/');
    
    // Return to onboarding
    await page.goto('/crew/onboarding?token=test-magic-token');
    
    // Should have saved progress
    await expect(page.locator('input[name="fullName"]')).toHaveValue(testCrew.name);
    await expect(page.locator('input[name="email"]')).toHaveValue(testCrew.email);
  });

  test('should handle expired magic link', async ({ page }) => {
    // Try to access with expired token
    await page.goto('/crew/onboarding?token=expired-token');
    
    // Should show error message
    await expect(page.locator('text=Link has expired')).toBeVisible();
    await expect(page.locator('button:has-text("Request New Link")')).toBeVisible();
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/crew/onboarding?token=test-magic-token');
    
    // Check mobile layout
    await expect(page.locator('h2')).toBeVisible();
    await expect(page.locator('input[name="fullName"]')).toBeVisible();
    
    // Check that form is usable on mobile
    await page.fill('input[name="fullName"]', testCrew.name);
    await expect(page.locator('input[name="fullName"]')).toHaveValue(testCrew.name);
  });
});
