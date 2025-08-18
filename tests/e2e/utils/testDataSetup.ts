/**
 * Test Data Setup Utility
 * Manages test data creation and cleanup for E2E tests
 */

import { Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { testUsers, testCompanies, generateRandomEmail, generateCompanyName } from '../fixtures/testData';

// Initialize Supabase client for test data management
const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || 'test-service-key';
const supabase = createClient(supabaseUrl, supabaseKey);

export class TestDataSetup {
  private createdCompanies: string[] = [];
  private createdUsers: string[] = [];
  private createdWorkflows: string[] = [];
  private createdDocuments: string[] = [];

  /**
   * Create test company
   */
  async createTestCompany(overrides?: Partial<typeof testCompanies.default>) {
    const company = {
      ...testCompanies.default,
      name: generateCompanyName(),
      ...overrides
    };

    try {
      const { data, error } = await supabase
        .from('companies')
        .insert(company)
        .select()
        .single();

      if (error) throw error;

      this.createdCompanies.push(data.id);
      return data;
    } catch (error) {
      console.error('Failed to create test company:', error);
      return null;
    }
  }

  /**
   * Create test user (admin, manager, or crew)
   */
  async createTestUser(role: 'admin' | 'manager' | 'crew', companyId?: string) {
    const email = generateRandomEmail();
    const user = {
      email,
      name: `Test ${role} ${Date.now()}`,
      role,
      company_id: companyId || null,
      password_hash: 'hashed_password', // In real tests, use proper hashing
      created_at: new Date().toISOString()
    };

    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert(user)
        .select()
        .single();

      if (error) throw error;

      this.createdUsers.push(data.id);
      return data;
    } catch (error) {
      console.error('Failed to create test user:', error);
      return null;
    }
  }

  /**
   * Create test workflow
   */
  async createTestWorkflow(companyId: string, overrides?: any) {
    const workflow = {
      name: `Test Workflow ${Date.now()}`,
      description: 'Automated test workflow',
      company_id: companyId,
      steps: JSON.stringify([
        { name: 'Personal Info', order: 1 },
        { name: 'Documents', order: 2 },
        { name: 'Training', order: 3 },
        { name: 'Quiz', order: 4 }
      ]),
      is_active: true,
      ...overrides
    };

    try {
      const { data, error } = await supabase
        .from('workflows')
        .insert(workflow)
        .select()
        .single();

      if (error) throw error;

      this.createdWorkflows.push(data.id);
      return data;
    } catch (error) {
      console.error('Failed to create test workflow:', error);
      return null;
    }
  }

  /**
   * Create test crew member with invitation
   */
  async createTestCrewMember(managerId: string, workflowId: string) {
    const crewMember = {
      email: generateRandomEmail(),
      name: `Test Crew ${Date.now()}`,
      position: 'Test Position',
      invited_by: managerId,
      workflow_id: workflowId,
      status: 'invited',
      invite_token: `test-token-${Date.now()}`,
      created_at: new Date().toISOString()
    };

    try {
      const { data, error } = await supabase
        .from('crew_members')
        .insert(crewMember)
        .select()
        .single();

      if (error) throw error;

      this.createdUsers.push(data.id);
      return data;
    } catch (error) {
      console.error('Failed to create test crew member:', error);
      return null;
    }
  }

  /**
   * Create test training progress
   */
  async createTestTrainingProgress(crewMemberId: string, workflowId: string) {
    const progress = {
      crew_member_id: crewMemberId,
      workflow_id: workflowId,
      personal_info_completed: true,
      documents_completed: true,
      training_progress: 75,
      quiz_score: null,
      overall_progress: 50,
      updated_at: new Date().toISOString()
    };

    try {
      const { data, error } = await supabase
        .from('training_progress')
        .insert(progress)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Failed to create test training progress:', error);
      return null;
    }
  }

  /**
   * Create complete test environment
   */
  async setupCompleteTestEnvironment() {
    try {
      // Create test company
      const company = await this.createTestCompany();
      if (!company) throw new Error('Failed to create company');

      // Create admin user
      const admin = await this.createTestUser('admin');
      
      // Create manager for the company
      const manager = await this.createTestUser('manager', company.id);
      if (!manager) throw new Error('Failed to create manager');

      // Create workflow for the company
      const workflow = await this.createTestWorkflow(company.id);
      if (!workflow) throw new Error('Failed to create workflow');

      // Create crew members
      const crewMembers = await Promise.all([
        this.createTestCrewMember(manager.id, workflow.id),
        this.createTestCrewMember(manager.id, workflow.id),
        this.createTestCrewMember(manager.id, workflow.id)
      ]);

      // Create training progress for some crew members
      if (crewMembers[0]) {
        await this.createTestTrainingProgress(crewMembers[0].id, workflow.id);
      }

      return {
        company,
        admin,
        manager,
        workflow,
        crewMembers: crewMembers.filter(Boolean)
      };
    } catch (error) {
      console.error('Failed to setup test environment:', error);
      throw error;
    }
  }

  /**
   * Cleanup all created test data
   */
  async cleanup() {
    try {
      // Delete in reverse order of dependencies
      
      // Delete training progress
      if (this.createdUsers.length > 0) {
        await supabase
          .from('training_progress')
          .delete()
          .in('crew_member_id', this.createdUsers);
      }

      // Delete documents
      if (this.createdDocuments.length > 0) {
        await supabase
          .from('documents')
          .delete()
          .in('id', this.createdDocuments);
      }

      // Delete crew members and users
      if (this.createdUsers.length > 0) {
        await supabase
          .from('crew_members')
          .delete()
          .in('id', this.createdUsers);

        await supabase
          .from('profiles')
          .delete()
          .in('id', this.createdUsers);
      }

      // Delete workflows
      if (this.createdWorkflows.length > 0) {
        await supabase
          .from('workflows')
          .delete()
          .in('id', this.createdWorkflows);
      }

      // Delete companies
      if (this.createdCompanies.length > 0) {
        await supabase
          .from('companies')
          .delete()
          .in('id', this.createdCompanies);
      }

      // Clear arrays
      this.createdCompanies = [];
      this.createdUsers = [];
      this.createdWorkflows = [];
      this.createdDocuments = [];

    } catch (error) {
      console.error('Failed to cleanup test data:', error);
    }
  }

  /**
   * Reset database to clean state (use with caution!)
   */
  async resetDatabase() {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('Database reset is only allowed in test environment');
    }

    try {
      // Truncate tables in correct order
      const tables = [
        'audit_logs',
        'certificates',
        'quiz_attempts',
        'training_progress',
        'documents',
        'crew_members',
        'workflows',
        'profiles',
        'companies'
      ];

      for (const table of tables) {
        await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      }

      console.log('Database reset completed');
    } catch (error) {
      console.error('Failed to reset database:', error);
      throw error;
    }
  }

  /**
   * Seed database with sample data
   */
  async seedDatabase() {
    try {
      // Create multiple companies
      const companies = await Promise.all([
        this.createTestCompany({ name: 'Global Shipping Co' }),
        this.createTestCompany({ name: 'Maritime Logistics Ltd' }),
        this.createTestCompany({ name: 'Ocean Carriers Inc' })
      ]);

      // Create managers for each company
      for (const company of companies) {
        if (!company) continue;

        const manager = await this.createTestUser('manager', company.id);
        if (!manager) continue;

        // Create workflows
        const basicWorkflow = await this.createTestWorkflow(company.id, {
          name: 'Basic Onboarding',
          description: 'Standard onboarding for all crew'
        });

        const advancedWorkflow = await this.createTestWorkflow(company.id, {
          name: 'Officer Training',
          description: 'Advanced training for officers'
        });

        // Create crew members with different statuses
        if (basicWorkflow) {
          // Invited crew
          await this.createTestCrewMember(manager.id, basicWorkflow.id);
          
          // Active crew
          const activeCrew = await this.createTestCrewMember(manager.id, basicWorkflow.id);
          if (activeCrew) {
            await supabase
              .from('crew_members')
              .update({ status: 'active' })
              .eq('id', activeCrew.id);
            
            await this.createTestTrainingProgress(activeCrew.id, basicWorkflow.id);
          }

          // Completed crew
          const completedCrew = await this.createTestCrewMember(manager.id, basicWorkflow.id);
          if (completedCrew) {
            await supabase
              .from('crew_members')
              .update({ status: 'completed' })
              .eq('id', completedCrew.id);
            
            await supabase
              .from('training_progress')
              .insert({
                crew_member_id: completedCrew.id,
                workflow_id: basicWorkflow.id,
                personal_info_completed: true,
                documents_completed: true,
                training_progress: 100,
                quiz_score: 85,
                overall_progress: 100
              });
          }
        }
      }

      console.log('Database seeded successfully');
    } catch (error) {
      console.error('Failed to seed database:', error);
      throw error;
    }
  }

  /**
   * Wait for data to be available
   */
  async waitForData(table: string, condition: any, timeout: number = 10000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const { data } = await supabase
        .from(table)
        .select('*')
        .match(condition)
        .single();
      
      if (data) return data;
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    throw new Error(`Timeout waiting for data in ${table}`);
  }

  /**
   * Get test data statistics
   */
  async getTestDataStats() {
    const stats = {
      companies: 0,
      users: 0,
      workflows: 0,
      crewMembers: 0
    };

    try {
      const { count: companyCount } = await supabase
        .from('companies')
        .select('*', { count: 'exact', head: true });
      stats.companies = companyCount || 0;

      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      stats.users = userCount || 0;

      const { count: workflowCount } = await supabase
        .from('workflows')
        .select('*', { count: 'exact', head: true });
      stats.workflows = workflowCount || 0;

      const { count: crewCount } = await supabase
        .from('crew_members')
        .select('*', { count: 'exact', head: true });
      stats.crewMembers = crewCount || 0;

      return stats;
    } catch (error) {
      console.error('Failed to get test data stats:', error);
      return stats;
    }
  }
}

// Export singleton instance
export const testDataSetup = new TestDataSetup();