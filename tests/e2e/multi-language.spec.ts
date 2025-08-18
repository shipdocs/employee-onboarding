/**
 * Multi-Language Support E2E Tests
 * Tests internationalization and localization features across the application
 */

import { test, expect } from '@playwright/test';

const supportedLanguages = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' }
];

const translations = {
  welcome: {
    en: 'Welcome',
    es: 'Bienvenido',
    fr: 'Bienvenue',
    de: 'Willkommen',
    nl: 'Welkom',
    pt: 'Bem-vindo',
    zh: '欢迎',
    ja: 'ようこそ'
  },
  login: {
    en: 'Sign In',
    es: 'Iniciar Sesión',
    fr: 'Se Connecter',
    de: 'Anmelden',
    nl: 'Inloggen',
    pt: 'Entrar',
    zh: '登录',
    ja: 'ログイン'
  },
  crewMember: {
    en: 'Crew Member',
    es: 'Miembro de la Tripulación',
    fr: 'Membre d\'Équipage',
    de: 'Besatzungsmitglied',
    nl: 'Bemanningslid',
    pt: 'Membro da Tripulação',
    zh: '船员',
    ja: '乗組員'
  }
};

test.describe('Language Selection', () => {
  test('should display language selector on landing page', async ({ page }) => {
    await page.goto('/');
    
    // Check language selector
    const languageSelector = page.locator('[data-testid="language-selector"]');
    await expect(languageSelector).toBeVisible();
    
    // Click to open dropdown
    await languageSelector.click();
    
    // Verify all languages are available
    for (const lang of supportedLanguages) {
      await expect(page.locator(`text=${lang.flag} ${lang.name}`)).toBeVisible();
    }
  });

  test('should persist language selection', async ({ page }) => {
    await page.goto('/');
    
    // Change to Spanish
    await page.locator('[data-testid="language-selector"]').click();
    await page.click('text=🇪🇸 Español');
    
    // Verify language changed
    await expect(page.locator('text=Bienvenido')).toBeVisible();
    
    // Navigate to another page
    await page.click('text=Miembro de la Tripulación');
    
    // Language should persist
    await expect(page.locator('text=Incorporación de la Tripulación')).toBeVisible();
    
    // Refresh page
    await page.reload();
    
    // Language should still be Spanish
    await expect(page.locator('text=Incorporación de la Tripulación')).toBeVisible();
  });

  test('should detect browser language on first visit', async ({ page, browserName }) => {
    // Set browser language to German
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'language', {
        get: () => 'de-DE'
      });
    });
    
    await page.goto('/');
    
    // Should show German content
    await expect(page.locator('text=Willkommen')).toBeVisible();
  });
});

test.describe('Crew Interface Translations', () => {
  test('should translate crew onboarding flow', async ({ page }) => {
    for (const lang of supportedLanguages.slice(0, 3)) { // Test first 3 languages
      await page.goto('/');
      
      // Change language
      await page.locator('[data-testid="language-selector"]').click();
      await page.click(`text=${lang.flag} ${lang.name}`);
      
      // Navigate to crew section
      await page.click(`text=${translations.crewMember[lang.code]}`);
      
      // Check translated elements based on language
      switch (lang.code) {
        case 'en':
          await expect(page.locator('h1')).toContainText('Crew Onboarding');
          await expect(page.locator('button')).toContainText('Start Onboarding');
          break;
        case 'es':
          await expect(page.locator('h1')).toContainText('Incorporación de la Tripulación');
          await expect(page.locator('button')).toContainText('Iniciar Incorporación');
          break;
        case 'fr':
          await expect(page.locator('h1')).toContainText('Intégration de l\'Équipage');
          await expect(page.locator('button')).toContainText('Commencer l\'Intégration');
          break;
      }
    }
  });

  test('should translate form validation messages', async ({ page }) => {
    await page.goto('/');
    
    // Change to Spanish
    await page.locator('[data-testid="language-selector"]').click();
    await page.click('text=🇪🇸 Español');
    
    // Go to crew access
    await page.click('text=Miembro de la Tripulación');
    await page.click('button:has-text("Iniciar Incorporación")');
    
    // Submit empty form
    await page.click('button:has-text("Enviar")');
    
    // Check Spanish validation messages
    await expect(page.locator('text=El correo electrónico es obligatorio')).toBeVisible();
    
    // Enter invalid email
    await page.fill('input[type="email"]', 'invalid-email');
    await page.click('button:has-text("Enviar")');
    
    await expect(page.locator('text=Por favor, introduce un correo electrónico válido')).toBeVisible();
  });

  test('should translate dynamic content', async ({ page }) => {
    // Simulate logged in crew member
    await page.goto('/crew/dashboard?token=test-token');
    
    // Change to French
    await page.locator('[data-testid="language-selector"]').click();
    await page.click('text=🇫🇷 Français');
    
    // Check dynamic content
    await expect(page.locator('text=Bonjour, John')).toBeVisible();
    await expect(page.locator('text=Progression: 75%')).toBeVisible();
    await expect(page.locator('text=Phase actuelle: Formation de sécurité')).toBeVisible();
  });
});

test.describe('Manager Interface Translations', () => {
  test('should translate manager dashboard', async ({ page }) => {
    await page.goto('/manager/dashboard?token=test-manager-token');
    
    // Test German
    await page.locator('[data-testid="language-selector"]').click();
    await page.click('text=🇩🇪 Deutsch');
    
    // Check German translations
    await expect(page.locator('h1')).toContainText('Manager-Dashboard');
    await expect(page.locator('text=Besatzungsverwaltung')).toBeVisible();
    await expect(page.locator('text=Berichte')).toBeVisible();
    await expect(page.locator('text=Schulungen')).toBeVisible();
    
    // Check metrics
    await expect(page.locator('[data-testid="total-crew-label"]')).toContainText('Gesamte Besatzung');
    await expect(page.locator('[data-testid="active-onboarding-label"]')).toContainText('Aktive Einarbeitung');
  });

  test('should translate data tables and headers', async ({ page }) => {
    await page.goto('/manager/crew?token=test-manager-token');
    
    // Change to Dutch
    await page.locator('[data-testid="language-selector"]').click();
    await page.click('text=🇳🇱 Nederlands');
    
    // Check table headers
    await expect(page.locator('th')).toContainText('Naam');
    await expect(page.locator('th')).toContainText('Positie');
    await expect(page.locator('th')).toContainText('Status');
    await expect(page.locator('th')).toContainText('Voortgang');
    await expect(page.locator('th')).toContainText('Acties');
    
    // Check action buttons
    await expect(page.locator('button')).toContainText('Bekijken');
    await expect(page.locator('button')).toContainText('Bewerken');
    await expect(page.locator('button')).toContainText('Herinnering sturen');
  });
});

test.describe('Date and Number Formatting', () => {
  test('should format dates according to locale', async ({ page }) => {
    await page.goto('/crew/dashboard?token=test-token');
    
    const testDate = new Date('2024-03-15');
    
    // English (US format)
    await expect(page.locator('[data-testid="join-date"]')).toContainText('3/15/2024');
    
    // German (DD.MM.YYYY)
    await page.locator('[data-testid="language-selector"]').click();
    await page.click('text=🇩🇪 Deutsch');
    await expect(page.locator('[data-testid="join-date"]')).toContainText('15.03.2024');
    
    // French (DD/MM/YYYY)
    await page.locator('[data-testid="language-selector"]').click();
    await page.click('text=🇫🇷 Français');
    await expect(page.locator('[data-testid="join-date"]')).toContainText('15/03/2024');
  });

  test('should format numbers and currency according to locale', async ({ page }) => {
    await page.goto('/manager/reports?token=test-manager-token');
    
    // English
    await expect(page.locator('[data-testid="completion-rate"]')).toContainText('85.5%');
    await expect(page.locator('[data-testid="training-cost"]')).toContainText('$1,234.56');
    
    // German
    await page.locator('[data-testid="language-selector"]').click();
    await page.click('text=🇩🇪 Deutsch');
    await expect(page.locator('[data-testid="completion-rate"]')).toContainText('85,5%');
    await expect(page.locator('[data-testid="training-cost"]')).toContainText('1.234,56 €');
    
    // French
    await page.locator('[data-testid="language-selector"]').click();
    await page.click('text=🇫🇷 Français');
    await expect(page.locator('[data-testid="completion-rate"]')).toContainText('85,5 %');
    await expect(page.locator('[data-testid="training-cost"]')).toContainText('1 234,56 €');
  });
});

test.describe('RTL Language Support', () => {
  test('should support right-to-left languages', async ({ page }) => {
    await page.goto('/');
    
    // Add Arabic for RTL testing
    await page.locator('[data-testid="language-selector"]').click();
    await page.click('text=🇸🇦 العربية');
    
    // Check RTL direction
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    
    // Check layout adjustments
    const header = page.locator('header');
    const headerStyles = await header.evaluate(el => window.getComputedStyle(el));
    expect(headerStyles.direction).toBe('rtl');
    
    // Navigation should be right-aligned
    const nav = page.locator('nav');
    const navRect = await nav.boundingBox();
    const pageWidth = await page.viewportSize();
    expect(navRect.x + navRect.width).toBeCloseTo(pageWidth.width, 1);
  });
});

test.describe('Email Translations', () => {
  test('should send emails in user\'s preferred language', async ({ page }) => {
    // Mock email sending
    await page.route('**/api/auth/magic-link', async route => {
      const request = route.request();
      const data = await request.postDataJSON();
      
      // Check language header
      expect(request.headers()['accept-language']).toBe('es');
      
      route.fulfill({
        status: 200,
        body: JSON.stringify({ success: true })
      });
    });
    
    await page.goto('/');
    
    // Change to Spanish
    await page.locator('[data-testid="language-selector"]').click();
    await page.click('text=🇪🇸 Español');
    
    // Request magic link
    await page.click('text=Miembro de la Tripulación');
    await page.click('button:has-text("Iniciar Incorporación")');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.click('button:has-text("Enviar enlace mágico")');
    
    // Verify Spanish confirmation
    await expect(page.locator('text=Enlace mágico enviado a tu correo')).toBeVisible();
  });
});

test.describe('Language-Specific Features', () => {
  test('should handle language-specific form fields', async ({ page }) => {
    await page.goto('/crew/onboarding?token=test-token');
    
    // Chinese - should show additional fields
    await page.locator('[data-testid="language-selector"]').click();
    await page.click('text=🇨🇳 中文');
    
    // Chinese names have family name first
    await expect(page.locator('label')).toContainText('姓'); // Family name
    await expect(page.locator('label')).toContainText('名'); // Given name
    
    // Japanese - different name order
    await page.locator('[data-testid="language-selector"]').click();
    await page.click('text=🇯🇵 日本語');
    
    await expect(page.locator('label')).toContainText('姓'); // Sei (family name)
    await expect(page.locator('label')).toContainText('名'); // Mei (given name)
  });

  test('should respect cultural conventions', async ({ page }) => {
    await page.goto('/crew/dashboard?token=test-token');
    
    // German - formal addressing
    await page.locator('[data-testid="language-selector"]').click();
    await page.click('text=🇩🇪 Deutsch');
    
    await expect(page.locator('[data-testid="greeting"]')).toContainText('Guten Tag, Herr Schmidt');
    
    // Spanish - informal addressing
    await page.locator('[data-testid="language-selector"]').click();
    await page.click('text=🇪🇸 Español');
    
    await expect(page.locator('[data-testid="greeting"]')).toContainText('Hola, Juan');
  });
});

test.describe('Translation Quality', () => {
  test('should not have missing translations', async ({ page }) => {
    const missingTranslations = [];
    
    for (const lang of supportedLanguages) {
      await page.goto('/');
      
      // Change language
      await page.locator('[data-testid="language-selector"]').click();
      await page.click(`text=${lang.flag} ${lang.name}`);
      
      // Check for translation keys (usually shown as TRANSLATION_KEY)
      const elements = await page.locator('*:has-text("TRANSLATION_")').all();
      
      if (elements.length > 0) {
        for (const element of elements) {
          const text = await element.textContent();
          missingTranslations.push({
            language: lang.code,
            key: text
          });
        }
      }
    }
    
    // Should have no missing translations
    expect(missingTranslations).toHaveLength(0);
  });

  test('should handle long translations gracefully', async ({ page }) => {
    await page.goto('/');
    
    // German tends to have longer words
    await page.locator('[data-testid="language-selector"]').click();
    await page.click('text=🇩🇪 Deutsch');
    
    // Check that UI doesn't break with long words
    const buttons = await page.locator('button').all();
    for (const button of buttons) {
      const box = await button.boundingBox();
      const text = await button.textContent();
      
      // Button should not overflow
      expect(box.width).toBeLessThan(400); // reasonable max width
      
      // Text should be visible
      await expect(button).toBeVisible();
    }
  });
});

test.describe('Accessibility in Multiple Languages', () => {
  test('should maintain ARIA labels in different languages', async ({ page }) => {
    for (const lang of ['en', 'es', 'fr']) {
      await page.goto('/');
      
      // Change language
      if (lang !== 'en') {
        await page.locator('[data-testid="language-selector"]').click();
        await page.click(`text=${supportedLanguages.find(l => l.code === lang).flag}`);
      }
      
      // Check ARIA labels are translated
      const closeButton = page.locator('button[aria-label]').first();
      const ariaLabel = await closeButton.getAttribute('aria-label');
      
      switch (lang) {
        case 'en':
          expect(ariaLabel).toContain('Close');
          break;
        case 'es':
          expect(ariaLabel).toContain('Cerrar');
          break;
        case 'fr':
          expect(ariaLabel).toContain('Fermer');
          break;
      }
    }
  });

  test('should announce language changes to screen readers', async ({ page }) => {
    await page.goto('/');
    
    // Change language
    await page.locator('[data-testid="language-selector"]').click();
    await page.click('text=🇪🇸 Español');
    
    // Check for ARIA live region announcement
    const announcement = page.locator('[role="alert"]');
    await expect(announcement).toContainText('Idioma cambiado a Español');
  });
});

test.describe('Performance with Translations', () => {
  test('should load translations efficiently', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    
    // Change language (should load translation file)
    await page.locator('[data-testid="language-selector"]').click();
    await page.click('text=🇯🇵 日本語');
    
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Translation loading should be fast
    expect(loadTime).toBeLessThan(2000);
    
    // Content should be visible immediately
    await expect(page.locator('text=ようこそ')).toBeVisible();
  });

  test('should cache translations', async ({ page }) => {
    await page.goto('/');
    
    // Load Spanish
    await page.locator('[data-testid="language-selector"]').click();
    await page.click('text=🇪🇸 Español');
    
    // Navigate to different page
    await page.click('text=Miembro de la Tripulación');
    
    // Go back
    await page.goBack();
    
    // Spanish should still be loaded without network request
    await expect(page.locator('text=Bienvenido')).toBeVisible();
  });
});