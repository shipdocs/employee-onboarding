/**
 * Enhanced Password Validator
 * Provides comprehensive password validation with entropy calculation and strength scoring
 */

const crypto = require('crypto');
const { PASSWORD_REQUIREMENTS } = require('../validation');

class EnhancedPasswordValidator {
  constructor(options = {}) {
    this.requirements = { ...PASSWORD_REQUIREMENTS, ...options };
    this.minEntropy = options.minEntropy || 50; // bits of entropy
  }

  /**
   * Calculate password entropy
   * @param {string} password - The password to analyze
   * @returns {number} - Entropy in bits
   */
  calculateEntropy(password) {
    if (!password || typeof password !== 'string') {
      return 0;
    }

    // Character set sizes
    const charSets = {
      lowercase: /[a-z]/.test(password) ? 26 : 0,
      uppercase: /[A-Z]/.test(password) ? 26 : 0,
      digits: /\d/.test(password) ? 10 : 0,
      symbols: /[^a-zA-Z0-9]/.test(password) ? 32 : 0 // Approximate symbol count
    };

    // Total character set size
    const charSetSize = Object.values(charSets).reduce((sum, size) => sum + size, 0);
    
    if (charSetSize === 0) {
      return 0;
    }

    // Basic entropy calculation: log2(charSetSize^length)
    let entropy = password.length * Math.log2(charSetSize);

    // Reduce entropy for patterns and repetitions
    entropy = this.adjustEntropyForPatterns(password, entropy);

    return Math.round(entropy * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Adjust entropy based on detected patterns
   * @param {string} password - The password to analyze
   * @param {number} baseEntropy - Base entropy calculation
   * @returns {number} - Adjusted entropy
   */
  adjustEntropyForPatterns(password, baseEntropy) {
    let adjustedEntropy = baseEntropy;

    // Reduce entropy for repeated characters
    const repeatedChars = password.match(/(.)\1+/g);
    if (repeatedChars) {
      const reductionFactor = Math.min(0.5, repeatedChars.length * 0.1);
      adjustedEntropy *= (1 - reductionFactor);
    }

    // Reduce entropy for sequential patterns
    const sequences = [
      'abcdefghijklmnopqrstuvwxyz',
      'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      '0123456789',
      'qwertyuiopasdfghjklzxcvbnm',
      'QWERTYUIOPASDFGHJKLZXCVBNM'
    ];

    for (const sequence of sequences) {
      for (let i = 0; i <= sequence.length - 3; i++) {
        const subseq = sequence.substring(i, i + 3);
        if (password.includes(subseq)) {
          adjustedEntropy *= 0.8; // Reduce by 20% for each sequential pattern
        }
      }
    }

    // Reduce entropy for common substitutions
    const substitutions = {
      '@': 'a', '3': 'e', '1': 'i', '0': 'o', '5': 's', '7': 't', '4': 'a'
    };

    let substitutionCount = 0;
    for (const [sub, original] of Object.entries(substitutions)) {
      if (password.includes(sub)) {
        substitutionCount++;
      }
    }

    if (substitutionCount > 0) {
      adjustedEntropy *= Math.max(0.6, 1 - (substitutionCount * 0.1));
    }

    // Reduce entropy for dictionary words (simplified check)
    const commonWords = ['password', 'admin', 'user', 'login', 'welcome', 'qwerty'];
    for (const word of commonWords) {
      if (password.toLowerCase().includes(word)) {
        adjustedEntropy *= 0.5;
        break;
      }
    }

    return Math.max(0, adjustedEntropy);
  }

  /**
   * Calculate password strength score (0-100)
   * @param {string} password - The password to analyze
   * @returns {object} - Strength analysis result
   */
  calculateStrengthScore(password) {
    if (!password || typeof password !== 'string') {
      return {
        score: 0,
        level: 'very_weak',
        entropy: 0,
        feedback: ['Password is required']
      };
    }

    let score = 0;
    const feedback = [];
    const entropy = this.calculateEntropy(password);

    // Length scoring (0-25 points)
    if (password.length >= 16) {
      score += 25;
    } else if (password.length >= 12) {
      score += 20;
    } else if (password.length >= 8) {
      score += 15;
    } else {
      score += Math.max(0, password.length * 2);
      feedback.push(`Password should be at least ${this.requirements.minLength} characters long`);
    }

    // Character variety scoring (0-25 points)
    let varietyScore = 0;
    if (/[a-z]/.test(password)) varietyScore += 5;
    else feedback.push('Add lowercase letters');
    
    if (/[A-Z]/.test(password)) varietyScore += 5;
    else feedback.push('Add uppercase letters');
    
    if (/\d/.test(password)) varietyScore += 5;
    else feedback.push('Add numbers');
    
    if (/[^a-zA-Z0-9]/.test(password)) varietyScore += 10;
    else feedback.push('Add special characters');

    score += varietyScore;

    // Entropy scoring (0-30 points)
    if (entropy >= 80) {
      score += 30;
    } else if (entropy >= 60) {
      score += 25;
    } else if (entropy >= 40) {
      score += 20;
    } else if (entropy >= 20) {
      score += 15;
    } else {
      score += Math.max(0, entropy / 2);
      feedback.push('Password is too predictable');
    }

    // Pattern penalties (0-20 points)
    let patternScore = 20;

    // Check for repeated characters
    if (/(.)\1{2,}/.test(password)) {
      patternScore -= 5;
      feedback.push('Avoid repeating characters');
    }

    // Check for sequential patterns
    const sequences = ['abc', '123', 'qwe'];
    for (const seq of sequences) {
      if (password.toLowerCase().includes(seq)) {
        patternScore -= 3;
        feedback.push('Avoid sequential patterns');
        break;
      }
    }

    // Check for common substitutions
    if (/[@3105747]/.test(password)) {
      const substitutionCount = (password.match(/[@3105747]/g) || []).length;
      if (substitutionCount > 2) {
        patternScore -= 5;
        feedback.push('Avoid predictable character substitutions');
      }
    }

    // Check against common passwords
    const lowerPassword = password.toLowerCase();
    if (this.requirements.commonPasswords.some(common => lowerPassword.includes(common))) {
      patternScore -= 10;
      feedback.push('Avoid common words and patterns');
    }

    score += Math.max(0, patternScore);

    // Determine strength level
    let level;
    if (score >= 90) {
      level = 'very_strong';
    } else if (score >= 75) {
      level = 'strong';
    } else if (score >= 60) {
      level = 'good';
    } else if (score >= 40) {
      level = 'fair';
    } else if (score >= 20) {
      level = 'weak';
    } else {
      level = 'very_weak';
    }

    return {
      score: Math.min(100, Math.max(0, score)),
      level,
      entropy,
      feedback: feedback.length > 0 ? feedback : ['Password meets security requirements']
    };
  }

  /**
   * Comprehensive password validation
   * @param {string} password - The password to validate
   * @param {object} options - Additional validation options
   * @returns {object} - Validation result
   */
  validate(password, options = {}) {
    const requirements = { ...this.requirements, ...options };

    // Basic validation first
    if (!password || typeof password !== 'string') {
      return {
        valid: false,
        error: 'Password is required',
        strength: this.calculateStrengthScore(password)
      };
    }

    // Length validation
    if (password.length < requirements.minLength) {
      return {
        valid: false,
        error: `Password must be at least ${requirements.minLength} characters long`,
        strength: this.calculateStrengthScore(password)
      };
    }

    if (password.length > requirements.maxLength) {
      return {
        valid: false,
        error: `Password must not exceed ${requirements.maxLength} characters`,
        strength: this.calculateStrengthScore(password)
      };
    }

    // Character requirements
    const missingRequirements = [];
    
    if (requirements.requireUppercase && !/[A-Z]/.test(password)) {
      missingRequirements.push('uppercase letter');
    }
    
    if (requirements.requireLowercase && !/[a-z]/.test(password)) {
      missingRequirements.push('lowercase letter');
    }
    
    if (requirements.requireNumbers && !/\d/.test(password)) {
      missingRequirements.push('number');
    }
    
    if (requirements.requireSpecialChars) {
      const specialCharsRegex = new RegExp(`[${requirements.specialChars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`);
      if (!specialCharsRegex.test(password)) {
        missingRequirements.push('special character');
      }
    }

    if (missingRequirements.length > 0) {
      return {
        valid: false,
        error: `Password must contain at least one ${missingRequirements.join(', ')}`,
        strength: this.calculateStrengthScore(password)
      };
    }

    // Entropy validation
    const entropy = this.calculateEntropy(password);
    if (entropy < this.minEntropy) {
      return {
        valid: false,
        error: `Password is too predictable (entropy: ${entropy} bits, minimum: ${this.minEntropy} bits)`,
        strength: this.calculateStrengthScore(password)
      };
    }

    // Common password check
    const lowerPassword = password.toLowerCase();
    if (requirements.commonPasswords.some(common => lowerPassword.includes(common))) {
      return {
        valid: false,
        error: 'Password contains common words or patterns. Please choose a more unique password',
        strength: this.calculateStrengthScore(password)
      };
    }

    // Pattern checks
    if (/(.)\1{2,}/.test(password)) {
      return {
        valid: false,
        error: 'Password cannot contain more than 2 consecutive identical characters',
        strength: this.calculateStrengthScore(password)
      };
    }

    // Contextual validation (if user info provided)
    if (options.userInfo) {
      const contextualError = this.validateContextual(password, options.userInfo);
      if (contextualError) {
        return {
          valid: false,
          error: contextualError,
          strength: this.calculateStrengthScore(password)
        };
      }
    }

    // Calculate final strength
    const strength = this.calculateStrengthScore(password);

    // Require minimum strength level
    const minStrengthLevel = options.minStrengthLevel || 'fair';
    const strengthLevels = ['very_weak', 'weak', 'fair', 'good', 'strong', 'very_strong'];
    const minStrengthIndex = strengthLevels.indexOf(minStrengthLevel);
    const currentStrengthIndex = strengthLevels.indexOf(strength.level);

    if (currentStrengthIndex < minStrengthIndex) {
      return {
        valid: false,
        error: `Password strength is ${strength.level}, but ${minStrengthLevel} or higher is required`,
        strength
      };
    }

    return {
      valid: true,
      strength,
      entropy
    };
  }

  /**
   * Validate password against user context (prevent personal info usage)
   * @param {string} password - The password to validate
   * @param {object} userInfo - User information to check against
   * @returns {string|null} - Error message or null if valid
   */
  validateContextual(password, userInfo) {
    if (!userInfo || typeof userInfo !== 'object') {
      return null;
    }

    const lowerPassword = password.toLowerCase();
    const fieldsToCheck = ['firstName', 'lastName', 'email', 'username', 'company'];

    for (const field of fieldsToCheck) {
      if (userInfo[field] && typeof userInfo[field] === 'string') {
        const value = userInfo[field].toLowerCase();
        
        // Check if password contains the field value
        if (value.length >= 3 && lowerPassword.includes(value)) {
          return `Password cannot contain your ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`;
        }

        // Check for email username part
        if (field === 'email' && value.includes('@')) {
          const emailUsername = value.split('@')[0];
          if (emailUsername.length >= 3 && lowerPassword.includes(emailUsername)) {
            return 'Password cannot contain your email username';
          }
        }
      }
    }

    // Check birth year if provided
    if (userInfo.birthDate) {
      const birthYear = new Date(userInfo.birthDate).getFullYear().toString();
      if (lowerPassword.includes(birthYear)) {
        return 'Password cannot contain your birth year';
      }
    }

    return null;
  }

  /**
   * Generate password suggestions
   * @param {number} length - Desired password length
   * @returns {string[]} - Array of password suggestions
   */
  generateSuggestions(length = 16) {
    const suggestions = [];
    const wordLists = {
      adjectives: ['swift', 'bright', 'calm', 'deep', 'eager', 'fierce', 'gentle', 'happy'],
      nouns: ['ocean', 'mountain', 'river', 'forest', 'storm', 'sunrise', 'journey', 'bridge'],
      verbs: ['explore', 'discover', 'create', 'build', 'achieve', 'inspire', 'protect', 'guide']
    };

    // Generate passphrase-style suggestions
    for (let i = 0; i < 3; i++) {
      const adj = wordLists.adjectives[Math.floor(Math.random() * wordLists.adjectives.length)];
      const noun = wordLists.nouns[Math.floor(Math.random() * wordLists.nouns.length)];
      const verb = wordLists.verbs[Math.floor(Math.random() * wordLists.verbs.length)];
      const num = Math.floor(Math.random() * 100);
      const special = '!@#$%^&*'[Math.floor(Math.random() * 8)];
      
      let suggestion = `${adj}${noun}${verb}${num}${special}`;
      
      // Capitalize first letter of each word
      suggestion = suggestion.replace(/\b\w/g, l => l.toUpperCase());
      
      // Adjust length if needed
      if (suggestion.length < length) {
        const padding = length - suggestion.length;
        suggestion += Math.random().toString(36).substring(2, 2 + padding);
      } else if (suggestion.length > length) {
        suggestion = suggestion.substring(0, length - 1) + special;
      }
      
      suggestions.push(suggestion);
    }

    return suggestions;
  }

  /**
   * Check if password has been compromised (placeholder for future HIBP integration)
   * @param {string} password - The password to check
   * @returns {Promise<boolean>} - Whether password is compromised
   */
  async isCompromised(password) {
    // Placeholder for Have I Been Pwned API integration
    // For now, just check against our common passwords list
    const lowerPassword = password.toLowerCase();
    return this.requirements.commonPasswords.some(common => 
      lowerPassword === common || lowerPassword.includes(common)
    );
  }
}

module.exports = EnhancedPasswordValidator;