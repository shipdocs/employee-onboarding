#!/usr/bin/env node

/**
 * Start Sprint S01 for Milestone M01
 */

const SimoneStateManager = require('./simone-state');

const stateManager = new SimoneStateManager();

// Update state to reflect sprint start
const updatedState = stateManager.setState({
  current_state: 'sprint_active',
  current_milestone: 'M01_System_Stabilization',
  current_sprint: 'S01_M01_Critical_Bug_Fixes',
  current_task: null,
  context: {
    sprint_started: new Date().toISOString(),
    sprint_id: 'S01_M01_Critical_Bug_Fixes',
    sprint_goal: 'Critical Bug Fixes & System Stabilization',
    sprint_duration: '2 weeks',
    sprint_end_date: '2025-06-24',
    phase: 'Phase 1: Critical Bug Fixes'
  }
});

console.log('✅ Sprint S01 started successfully:');
console.log(JSON.stringify(updatedState, null, 2));
