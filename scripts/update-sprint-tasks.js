#!/usr/bin/env node

/**
 * Update Sprint S01 with created tasks
 */

const SimoneStateManager = require('./simone-state');

const stateManager = new SimoneStateManager();

// Update state to reflect task creation
const updatedState = stateManager.setState({
  current_state: 'sprint_active_with_tasks',
  current_milestone: 'M01_System_Stabilization',
  current_sprint: 'S01_M01_Critical_Bug_Fixes',
  current_task: null,
  context: {
    sprint_started: '2025-06-10T09:35:00Z',
    tasks_created: new Date().toISOString(),
    sprint_id: 'S01_M01_Critical_Bug_Fixes',
    sprint_goal: 'Critical Bug Fixes & System Stabilization',
    total_tasks: 5,
    tasks_created_list: [
      'T01_S01_Manager_Login_Bug_Verification',
      'T02_S01_Database_Migration_Consolidation', 
      'T03_S01_API_Error_Handling_Standardization',
      'T04_S01_Frontend_Error_Boundaries',
      'T05_S01_Production_Deployment_Validation'
    ],
    estimated_total_hours: 50,
    sprint_end_date: '2025-06-24',
    phase: 'Phase 1: Critical Bug Fixes'
  }
});

console.log('✅ Sprint S01 tasks created successfully:');
console.log(JSON.stringify(updatedState, null, 2));
