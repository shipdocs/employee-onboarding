#!/usr/bin/env node

/**
 * Script to manage crew assignments
 * Usage:
 *   node scripts/manage-crew-assignments.js list [--manager-id=<id>]
 *   node scripts/manage-crew-assignments.js assign <manager-id> <crew-id> [--reason="<reason>"]
 *   node scripts/manage-crew-assignments.js unassign <manager-id> <crew-id>
 *   node scripts/manage-crew-assignments.js bulk-assign <manager-id> --crew-ids=1,2,3
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];

// Helper to parse options
function parseOptions(args) {
  const options = {};
  args.forEach(arg => {
    if (arg.startsWith('--')) {
      const [key, value] = arg.substring(2).split('=');
      options[key] = value || true;
    }
  });
  return options;
}

// List assignments
async function listAssignments(managerId = null) {
  console.log('\n📋 Fetching crew assignments...\n');
  
  let query = supabase
    .from('crew_assignments')
    .select(`
      *,
      manager:users!crew_assignments_manager_id_fkey(id, email, first_name, last_name),
      crew_member:users!crew_assignments_crew_member_id_fkey(id, email, first_name, last_name, position, vessel_assignment)
    `)
    .eq('is_active', true)
    .order('assigned_at', { ascending: false });
  
  if (managerId) {
    query = query.eq('manager_id', managerId);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('❌ Error fetching assignments:', error.message);
    return;
  }
  
  if (!data || data.length === 0) {
    console.log('No active assignments found.');
    return;
  }
  
  console.log(`Found ${data.length} active assignment(s):\n`);
  
  // Group by manager
  const groupedByManager = {};
  data.forEach(assignment => {
    const managerKey = `${assignment.manager.first_name} ${assignment.manager.last_name} (${assignment.manager.email})`;
    if (!groupedByManager[managerKey]) {
      groupedByManager[managerKey] = [];
    }
    groupedByManager[managerKey].push(assignment);
  });
  
  // Display grouped assignments
  Object.entries(groupedByManager).forEach(([managerName, assignments]) => {
    console.log(`\n👔 Manager: ${managerName}`);
    console.log('   Crew Members:');
    assignments.forEach(assignment => {
      const crew = assignment.crew_member;
      console.log(`   - ${crew.first_name} ${crew.last_name} (${crew.email})`);
      console.log(`     Position: ${crew.position || 'Not specified'}`);
      console.log(`     Vessel: ${assignment.vessel_assignment || crew.vessel_assignment || 'Not assigned'}`);
      console.log(`     Assigned: ${new Date(assignment.assigned_at).toLocaleDateString()}`);
      if (assignment.assignment_reason) {
        console.log(`     Reason: ${assignment.assignment_reason}`);
      }
    });
  });
}

// Assign crew member to manager
async function assignCrewToManager(managerId, crewId, reason = 'Manual assignment via script') {
  console.log('\n🔗 Creating crew assignment...\n');
  
  // Verify manager exists and has correct role
  const { data: manager, error: managerError } = await supabase
    .from('users')
    .select('id, email, first_name, last_name, role')
    .eq('id', managerId)
    .eq('role', 'manager')
    .single();
  
  if (managerError || !manager) {
    console.error('❌ Manager not found or invalid role');
    return;
  }
  
  // Verify crew member exists and has correct role
  const { data: crew, error: crewError } = await supabase
    .from('users')
    .select('id, email, first_name, last_name, role, vessel_assignment')
    .eq('id', crewId)
    .eq('role', 'crew')
    .single();
  
  if (crewError || !crew) {
    console.error('❌ Crew member not found or invalid role');
    return;
  }
  
  // Check if assignment already exists
  const { data: existing } = await supabase
    .from('crew_assignments')
    .select('id')
    .eq('manager_id', managerId)
    .eq('crew_member_id', crewId)
    .eq('is_active', true)
    .single();
  
  if (existing) {
    console.error('❌ Assignment already exists');
    return;
  }
  
  // Create assignment
  const { data, error } = await supabase
    .from('crew_assignments')
    .insert({
      manager_id: managerId,
      crew_member_id: crewId,
      assignment_reason: reason,
      vessel_assignment: crew.vessel_assignment,
      is_active: true
    })
    .select()
    .single();
  
  if (error) {
    console.error('❌ Error creating assignment:', error.message);
    return;
  }
  
  console.log('✅ Assignment created successfully!');
  console.log(`   Manager: ${manager.first_name} ${manager.last_name} (${manager.email})`);
  console.log(`   Crew: ${crew.first_name} ${crew.last_name} (${crew.email})`);
  console.log(`   Reason: ${reason}`);
}

// Unassign crew member from manager
async function unassignCrewFromManager(managerId, crewId) {
  console.log('\n🔓 Removing crew assignment...\n');
  
  // Find active assignment
  const { data: assignment, error: findError } = await supabase
    .from('crew_assignments')
    .select('*')
    .eq('manager_id', managerId)
    .eq('crew_member_id', crewId)
    .eq('is_active', true)
    .single();
  
  if (findError || !assignment) {
    console.error('❌ Active assignment not found');
    return;
  }
  
  // Deactivate assignment
  const { error } = await supabase
    .from('crew_assignments')
    .update({
      is_active: false,
      unassigned_at: new Date().toISOString()
    })
    .eq('id', assignment.id);
  
  if (error) {
    console.error('❌ Error removing assignment:', error.message);
    return;
  }
  
  console.log('✅ Assignment removed successfully!');
}

// Bulk assign multiple crew members
async function bulkAssignCrew(managerId, crewIds, reason = 'Bulk assignment via script') {
  console.log('\n📦 Processing bulk assignments...\n');
  
  const crewIdArray = crewIds.split(',').map(id => parseInt(id.trim()));
  let successCount = 0;
  let failCount = 0;
  
  for (const crewId of crewIdArray) {
    console.log(`\nAssigning crew member ID ${crewId}...`);
    try {
      await assignCrewToManager(managerId, crewId, reason);
      successCount++;
    } catch (error) {
      console.error(`Failed to assign crew member ${crewId}`);
      failCount++;
    }
  }
  
  console.log(`\n📊 Bulk assignment complete:`);
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
}

// Main execution
async function main() {
  const options = parseOptions(args);
  
  switch (command) {
    case 'list':
      await listAssignments(options['manager-id']);
      break;
      
    case 'assign':
      if (args.length < 3) {
        console.error('Usage: assign <manager-id> <crew-id> [--reason="<reason>"]');
        process.exit(1);
      }
      await assignCrewToManager(
        parseInt(args[1]), 
        parseInt(args[2]), 
        options.reason || undefined
      );
      break;
      
    case 'unassign':
      if (args.length < 3) {
        console.error('Usage: unassign <manager-id> <crew-id>');
        process.exit(1);
      }
      await unassignCrewFromManager(parseInt(args[1]), parseInt(args[2]));
      break;
      
    case 'bulk-assign':
      if (args.length < 2 || !options['crew-ids']) {
        console.error('Usage: bulk-assign <manager-id> --crew-ids=1,2,3 [--reason="<reason>"]');
        process.exit(1);
      }
      await bulkAssignCrew(
        parseInt(args[1]), 
        options['crew-ids'],
        options.reason || undefined
      );
      break;
      
    default:
      console.log('Crew Assignment Management Tool');
      console.log('\nUsage:');
      console.log('  list [--manager-id=<id>]                    List all assignments');
      console.log('  assign <manager-id> <crew-id> [--reason]    Assign crew to manager');
      console.log('  unassign <manager-id> <crew-id>            Remove assignment');
      console.log('  bulk-assign <manager-id> --crew-ids=1,2,3  Assign multiple crew');
      process.exit(1);
  }
  
  process.exit(0);
}

// Run the script
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});