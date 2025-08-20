#!/usr/bin/env node

/**
 * Create demo users for the Maritime Onboarding System
 * This script creates sample users with proper password hashing
 */

const bcrypt = require('bcrypt');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'employee_onboarding',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres123'
});

async function createDemoUsers() {
  console.log('🚢 Creating demo users for Maritime Onboarding System...\n');

  try {
    // Hash passwords
    const adminPassword = await bcrypt.hash('admin.com', 10);
    const managerPassword = await bcrypt.hash('manager123', 10);
    const crewPassword = await bcrypt.hash('crew123', 10);

    // Start transaction
    await pool.query('BEGIN');

    // Clear existing demo data
    console.log('🧹 Cleaning existing demo data...');
    await pool.query("DELETE FROM quiz_results WHERE user_id LIKE 'demo-%'");
    await pool.query("DELETE FROM training_progress WHERE user_id LIKE 'demo-%'");
    await pool.query("DELETE FROM onboarding_progress WHERE user_id LIKE 'demo-%'");
    await pool.query("DELETE FROM crew_members WHERE id LIKE 'demo-%'");
    await pool.query("DELETE FROM managers WHERE id LIKE 'demo-%'");
    await pool.query("DELETE FROM admin_users WHERE id LIKE 'demo-%'");

    // Create admin user
    console.log('👤 Creating admin user (admin@admin.com / admin.com)...');
    await pool.query(`
      INSERT INTO admin_users (id, email, password_hash, full_name, role, is_active, created_at, permissions)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)
    `, [
      'demo-admin-001',
      'admin@admin.com',
      adminPassword,
      'System Administrator',
      'super_admin',
      true,
      JSON.stringify({
        users: ['create', 'read', 'update', 'delete'],
        settings: ['create', 'read', 'update', 'delete'],
        reports: ['read', 'export'],
        system: ['manage']
      })
    ]);

    // Create manager account
    console.log('👨‍✈️ Creating manager account (captain@maritime.demo / manager123)...');
    await pool.query(`
      INSERT INTO managers (id, email, password_hash, full_name, department, vessel, is_active, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    `, [
      'demo-manager-001',
      'captain@maritime.demo',
      managerPassword,
      'Captain Jack Maritime',
      'Deck Operations',
      'MV Demo Vessel',
      true
    ]);

    // Create crew members in different onboarding stages
    console.log('👥 Creating crew members...');
    
    // New crew member - not started
    await pool.query(`
      INSERT INTO crew_members (id, email, password_hash, full_name, position, vessel, department, manager_id, onboarding_status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
    `, [
      'demo-crew-001',
      'john.deck@maritime.demo',
      crewPassword,
      'John Deck',
      'Deck Officer',
      'MV Demo Vessel',
      'Deck Operations',
      'demo-manager-001',
      'not_started'
    ]);

    // Crew member - in progress
    await pool.query(`
      INSERT INTO crew_members (id, email, password_hash, full_name, position, vessel, department, manager_id, onboarding_status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
    `, [
      'demo-crew-002',
      'sarah.engineer@maritime.demo',
      crewPassword,
      'Sarah Engineer',
      'Chief Engineer',
      'MV Demo Vessel',
      'Engineering',
      'demo-manager-001',
      'in_progress'
    ]);

    // Crew member - completed
    await pool.query(`
      INSERT INTO crew_members (id, email, password_hash, full_name, position, vessel, department, manager_id, onboarding_status, created_at, completed_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW() - INTERVAL '7 days', NOW() - INTERVAL '1 day')
    `, [
      'demo-crew-003',
      'mike.bosun@maritime.demo',
      crewPassword,
      'Mike Bosun',
      'Bosun',
      'MV Demo Vessel',
      'Deck Operations',
      'demo-manager-001',
      'completed'
    ]);

    // Create workflow and phases
    console.log('📋 Creating training workflow and phases...');
    
    await pool.query(`
      INSERT INTO workflows (id, name, description, is_default, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
    `, [
      'demo-workflow-001',
      'Standard Maritime Onboarding',
      'Complete 4-phase onboarding program for new maritime crew members',
      true
    ]);

    // Create training phases
    const phases = [
      { id: 'demo-phase-001', number: 1, name: 'Welcome & Orientation', description: 'Introduction to company policies, vessel familiarization, and team introductions', duration: 2 },
      { id: 'demo-phase-002', number: 2, name: 'Safety Training', description: 'Essential safety procedures, emergency protocols, and SOLAS compliance', duration: 3 },
      { id: 'demo-phase-003', number: 3, name: 'Role-Specific Training', description: 'Department procedures, equipment operation, and job responsibilities', duration: 5 },
      { id: 'demo-phase-004', number: 4, name: 'Practical Assessment', description: 'Hands-on evaluation, skills demonstration, and certification', duration: 2 }
    ];

    for (const phase of phases) {
      await pool.query(`
        INSERT INTO training_phases (id, workflow_id, phase_number, name, description, duration_days, is_mandatory, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
      `, [phase.id, 'demo-workflow-001', phase.number, phase.name, phase.description, phase.duration, true]);
    }

    // Create sample training content
    console.log('📚 Creating training content...');
    
    const contentItems = [
      // Phase 1 content
      { phaseId: 'demo-phase-001', order: 1, title: 'Company Overview Video', type: 'video', duration: 15, url: '/content/company-overview.mp4' },
      { phaseId: 'demo-phase-001', order: 2, title: 'Maritime Code of Conduct', type: 'document', duration: 20, url: '/content/code-of-conduct.pdf' },
      { phaseId: 'demo-phase-001', order: 3, title: 'Virtual Vessel Tour', type: 'interactive', duration: 30, url: '/content/vessel-tour' },
      
      // Phase 2 content
      { phaseId: 'demo-phase-002', order: 1, title: 'Fire Safety Procedures', type: 'video', duration: 20, url: '/content/fire-safety.mp4' },
      { phaseId: 'demo-phase-002', order: 2, title: 'Man Overboard Protocol', type: 'document', duration: 15, url: '/content/mob-protocol.pdf' },
      { phaseId: 'demo-phase-002', order: 3, title: 'Personal Protective Equipment', type: 'checklist', duration: 10, url: '/content/ppe-checklist' },
      { phaseId: 'demo-phase-002', order: 4, title: 'Emergency Muster Drill', type: 'interactive', duration: 25, url: '/content/muster-drill' },
      
      // Phase 3 content
      { phaseId: 'demo-phase-003', order: 1, title: 'Department Procedures Manual', type: 'document', duration: 45, url: '/content/dept-procedures.pdf' },
      { phaseId: 'demo-phase-003', order: 2, title: 'Equipment Operation Guide', type: 'video', duration: 30, url: '/content/equipment-guide.mp4' },
      { phaseId: 'demo-phase-003', order: 3, title: 'Maintenance Schedule Training', type: 'interactive', duration: 20, url: '/content/maintenance-training' },
      
      // Phase 4 content
      { phaseId: 'demo-phase-004', order: 1, title: 'Practical Skills Test', type: 'assessment', duration: 60, url: '/assessment/practical' },
      { phaseId: 'demo-phase-004', order: 2, title: 'Written Examination', type: 'assessment', duration: 45, url: '/assessment/written' }
    ];

    for (let i = 0; i < contentItems.length; i++) {
      const item = contentItems[i];
      await pool.query(`
        INSERT INTO training_content (
          id, phase_id, item_order, title, content_type, 
          duration_minutes, content_url, is_mandatory, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title
      `, [
        `demo-content-${String(i + 1).padStart(3, '0')}`,
        item.phaseId,
        item.order,
        item.title,
        item.type,
        item.duration,
        item.url,
        true
      ]);
    }

    // Create quiz questions
    console.log('❓ Creating quiz questions...');
    
    const questions = [
      // Phase 1 Quiz
      {
        phaseId: 'demo-phase-001',
        question: 'What is the primary mission of our maritime company?',
        options: ['Safe and efficient vessel operations', 'Maximum profit', 'Fastest delivery', 'Minimum crew'],
        correct: 0,
        explanation: 'Safety is always our top priority in maritime operations'
      },
      {
        phaseId: 'demo-phase-001',
        question: 'What is the standard crew rotation period?',
        options: ['30 days', '60 days', '90 days', '120 days'],
        correct: 2,
        explanation: 'Standard rotation is 90 days on, 90 days off'
      },
      
      // Phase 2 Quiz
      {
        phaseId: 'demo-phase-002',
        question: 'What is the first action when discovering a fire?',
        options: ['Fight the fire', 'Sound the alarm', 'Call captain', 'Evacuate'],
        correct: 1,
        explanation: 'Always sound the alarm first to alert all crew'
      },
      {
        phaseId: 'demo-phase-002',
        question: 'What does SOLAS stand for?',
        options: ['Safety of Life at Sea', 'Ship Operations Labor Standards', 'Standard Operating Life Safety', 'Safety Operations at Sea'],
        correct: 0,
        explanation: 'SOLAS - Safety of Life at Sea is the primary maritime safety convention'
      },
      
      // Phase 3 Quiz
      {
        phaseId: 'demo-phase-003',
        question: 'Who is responsible for daily equipment checks?',
        options: ['Chief Engineer only', 'Captain only', 'Department heads', 'Every crew member for assigned equipment'],
        correct: 3,
        explanation: 'Every crew member must check their assigned equipment daily'
      },
      
      // Phase 4 Quiz
      {
        phaseId: 'demo-phase-004',
        question: 'What is the minimum passing score for final assessment?',
        options: ['60%', '70%', '80%', '90%'],
        correct: 2,
        explanation: '80% is required to pass the final assessment'
      }
    ];

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      await pool.query(`
        INSERT INTO quiz_questions (
          id, phase_id, question_number, question, 
          options, correct_answer, explanation, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        ON CONFLICT (id) DO UPDATE SET question = EXCLUDED.question
      `, [
        `demo-question-${String(i + 1).padStart(3, '0')}`,
        q.phaseId,
        i + 1,
        q.question,
        JSON.stringify(q.options),
        q.correct,
        q.explanation
      ]);
    }

    // Add progress for in-progress crew member
    console.log('📊 Creating sample progress data...');
    
    await pool.query(`
      INSERT INTO onboarding_progress (
        id, user_id, workflow_id, current_phase, 
        phases_completed, overall_progress, started_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW() - INTERVAL '3 days')
      ON CONFLICT (id) DO UPDATE SET current_phase = EXCLUDED.current_phase
    `, [
      'demo-progress-001',
      'demo-crew-002',
      'demo-workflow-001',
      2,
      JSON.stringify(['demo-phase-001']),
      25
    ]);

    // Add system settings
    console.log('⚙️ Configuring system settings...');
    
    const settings = [
      { key: 'company_name', value: 'Maritime Demo Shipping Co.', category: 'general' },
      { key: 'support_email', value: 'support@maritime.demo', category: 'general' },
      { key: 'onboarding_deadline_days', value: '14', category: 'onboarding' },
      { key: 'welcome_message', value: 'Welcome aboard! Your maritime journey begins here.', category: 'onboarding' },
      { key: 'enable_notifications', value: 'true', category: 'notifications' }
    ];

    for (const setting of settings) {
      await pool.query(`
        INSERT INTO settings (key, value, category, created_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
      `, [setting.key, setting.value, setting.category]);
    }

    // Commit transaction
    await pool.query('COMMIT');

    console.log('\n✅ Demo data created successfully!\n');
    console.log('📋 Created Users:');
    console.log('================');
    console.log('Admin:');
    console.log('  Email: admin@admin.com');
    console.log('  Password: admin.com\n');
    console.log('Manager:');
    console.log('  Email: captain@maritime.demo');
    console.log('  Password: manager123\n');
    console.log('Crew Members:');
    console.log('  john.deck@maritime.demo (Not Started)');
    console.log('  sarah.engineer@maritime.demo (In Progress)');
    console.log('  mike.bosun@maritime.demo (Completed)');
    console.log('  Password for all: crew123\n');
    console.log('🚀 System is ready for demo!');

  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('❌ Error creating demo users:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the script
createDemoUsers();