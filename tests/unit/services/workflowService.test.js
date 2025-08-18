// Workflow service tests
describe('Workflow Service', () => {
  describe('Workflow Data Validation', () => {
    it('should validate required workflow fields', () => {
      const validateWorkflow = (workflow) => {
        const errors = [];
        
        if (!workflow.name || workflow.name.trim() === '') {
          errors.push('Name is required');
        }
        
        if (!workflow.slug || !/^[a-z0-9-]+$/.test(workflow.slug)) {
          errors.push('Slug must contain only lowercase letters, numbers, and hyphens');
        }
        
        if (!workflow.type) {
          errors.push('Type is required');
        }
        
        return { valid: errors.length === 0, errors };
      };

      // Valid workflow
      const validWorkflow = {
        name: 'Test Workflow',
        slug: 'test-workflow',
        type: 'onboarding'
      };
      
      const validResult = validateWorkflow(validWorkflow);
      expect(validResult.valid).toBe(true);
      expect(validResult.errors).toHaveLength(0);

      // Invalid workflow - missing name
      const invalidWorkflow = {
        slug: 'test-workflow',
        type: 'onboarding'
      };
      
      const invalidResult = validateWorkflow(invalidWorkflow);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors).toContain('Name is required');
    });

    it('should validate slug format', () => {
      const isValidSlug = (slug) => /^[a-z0-9-]+$/.test(slug);
      
      const validSlugs = [
        'test-workflow',
        'workflow-123',
        'simple',
        'multi-word-slug'
      ];
      
      const invalidSlugs = [
        'Test-Workflow', // uppercase
        'workflow_123',  // underscore
        'workflow 123',  // space
        'workflow@123',  // special char
        '',              // empty
      ];
      
      validSlugs.forEach(slug => {
        expect(isValidSlug(slug)).toBe(true);
      });
      
      invalidSlugs.forEach(slug => {
        expect(isValidSlug(slug)).toBe(false);
      });
    });
  });

  describe('User ID Handling', () => {
    it('should handle both userId and id fields', () => {
      const getUserId = (user) => user.userId || user.id;
      
      const userWithUserId = { userId: 123, email: 'test@example.com' };
      const userWithId = { id: 456, email: 'test@example.com' };
      const userWithBoth = { userId: 789, id: 456, email: 'test@example.com' };
      
      expect(getUserId(userWithUserId)).toBe(123);
      expect(getUserId(userWithId)).toBe(456);
      expect(getUserId(userWithBoth)).toBe(789); // userId takes precedence
    });

    it('should validate user ID is positive integer', () => {
      const isValidUserId = (userId) => {
        return !!(userId && Number.isInteger(userId) && userId > 0);
      };
      
      expect(isValidUserId(123)).toBe(true);
      expect(isValidUserId(0)).toBe(false);
      expect(isValidUserId(-1)).toBe(false);
      expect(isValidUserId(null)).toBe(false);
      expect(isValidUserId('123')).toBe(false);
      expect(isValidUserId(12.5)).toBe(false);
    });
  });

  describe('Workflow Phase Management', () => {
    it('should handle temporary phase IDs', () => {
      const phases = [
        { id: 'temp-1', name: 'Phase 1', phase_number: 1 },
        { id: 'temp-2', name: 'Phase 2', phase_number: 2 },
        { id: '123e4567-e89b-12d3-a456-426614174000', name: 'Phase 3', phase_number: 3 }
      ];
      
      const newPhases = phases.filter(p => p.id.toString().startsWith('temp-'));
      const existingPhases = phases.filter(p => !p.id.toString().startsWith('temp-'));
      
      expect(newPhases).toHaveLength(2);
      expect(existingPhases).toHaveLength(1);
      expect(newPhases[0].id).toBe('temp-1');
      expect(existingPhases[0].id).toBe('123e4567-e89b-12d3-a456-426614174000');
    });

    it('should validate phase numbers are sequential', () => {
      const validatePhaseNumbers = (phases) => {
        const sortedPhases = phases.sort((a, b) => a.phase_number - b.phase_number);
        
        for (let i = 0; i < sortedPhases.length; i++) {
          if (sortedPhases[i].phase_number !== i + 1) {
            return false;
          }
        }
        
        return true;
      };
      
      const validPhases = [
        { phase_number: 1 },
        { phase_number: 2 },
        { phase_number: 3 }
      ];
      
      const invalidPhases = [
        { phase_number: 1 },
        { phase_number: 3 }, // Missing phase 2
        { phase_number: 4 }
      ];
      
      expect(validatePhaseNumbers(validPhases)).toBe(true);
      expect(validatePhaseNumbers(invalidPhases)).toBe(false);
    });
  });

  describe('Workflow Status Management', () => {
    it('should validate status transitions', () => {
      const validTransitions = {
        'draft': ['active', 'archived'],
        'active': ['draft', 'archived'],
        'archived': ['draft']
      };
      
      const canTransition = (fromStatus, toStatus) => {
        return validTransitions[fromStatus]?.includes(toStatus) || false;
      };
      
      expect(canTransition('draft', 'active')).toBe(true);
      expect(canTransition('active', 'archived')).toBe(true);
      expect(canTransition('archived', 'active')).toBe(false);
      expect(canTransition('draft', 'completed')).toBe(false);
    });
  });

  describe('Translation Field Filtering', () => {
    it('should filter out translation-related fields', () => {
      const workflowData = {
        name: 'Test Workflow',
        slug: 'test-workflow',
        type: 'onboarding',
        translations: { en: {}, nl: {} },
        titleTranslations: { en: 'Test', nl: 'Test' },
        descriptionTranslations: { en: 'Desc', nl: 'Desc' },
        adaptedTitle: 'Adapted',
        adaptedDescription: 'Adapted Desc',
        workflowId: '123',
        phaseCount: 3,
        phases: [],
        workflow_phases: []
      };
      
      const fieldsToFilter = [
        'translations',
        'titleTranslations',
        'descriptionTranslations',
        'adaptedTitle',
        'adaptedDescription',
        'workflowId',
        'phaseCount',
        'phases',
        'workflow_phases'
      ];
      
      const cleanData = Object.keys(workflowData)
        .filter(key => !fieldsToFilter.includes(key))
        .reduce((obj, key) => {
          obj[key] = workflowData[key];
          return obj;
        }, {});
      
      expect(cleanData).toEqual({
        name: 'Test Workflow',
        slug: 'test-workflow',
        type: 'onboarding'
      });
      
      expect(cleanData).not.toHaveProperty('translations');
      expect(cleanData).not.toHaveProperty('workflow_phases');
    });
  });
});