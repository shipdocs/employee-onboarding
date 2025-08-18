#!/usr/bin/env node

/**
 * Security Incident Response CLI
 * 
 * Command-line interface for security incident management.
 */

const { program } = require('commander');
const { getSecurityIncidentResponse } = require('../lib/security/SecurityIncidentResponse');

program
  .name('security-incident')
  .description('Security incident response CLI tool')
  .version('1.0.0');

program
  .command('list')
  .description('List security incidents')
  .option('-s, --status <status>', 'Filter by status (open, closed)')
  .option('--severity <severity>', 'Filter by severity (critical, high, medium, low)')
  .option('-t, --type <type>', 'Filter by incident type')
  .option('-l, --limit <number>', 'Limit number of results', '20')
  .action(async (options) => {
    const securityIncidentResponse = getSecurityIncidentResponse();
    
    const filters = {};
    if (options.status) filters.status = options.status;
    if (options.severity) filters.severity = options.severity;
    if (options.type) filters.type = options.type;
    
    const incidents = securityIncidentResponse.getIncidents(filters);
    const limitedIncidents = incidents.slice(0, parseInt(options.limit));
    
    console.log(`\n🚨 Security Incidents (${limitedIncidents.length}/${incidents.length})`);
    console.log('='.repeat(60));
    
    if (limitedIncidents.length === 0) {
      console.log('No incidents found matching the criteria.');
      return;
    }
    
    limitedIncidents.forEach((incident, index) => {
      const status = incident.status === 'open' ? '🔴' : '✅';
      const severity = {
        critical: '🔥',
        high: '🟠',
        medium: '🟡',
        low: '🟢'
      }[incident.severity] || '⚪';
      
      console.log(`\n${index + 1}. ${status} ${severity} ${incident.title}`);
      console.log(`   ID: ${incident.id}`);
      console.log(`   Type: ${incident.type}`);
      console.log(`   Severity: ${incident.severity}`);
      console.log(`   Status: ${incident.status}`);
      console.log(`   Created: ${incident.createdAt.toLocaleString()}`);
      
      if (incident.assignees.length > 0) {
        console.log(`   Assigned: ${incident.assignees.join(', ')}`);
      }
      
      if (incident.autoActionsExecuted.length > 0) {
        console.log(`   Auto Actions: ${incident.autoActionsExecuted.length} executed`);
      }
    });
  });

program
  .command('show <incidentId>')
  .description('Show detailed incident information')
  .action(async (incidentId) => {
    const securityIncidentResponse = getSecurityIncidentResponse();
    const incident = securityIncidentResponse.getIncident(incidentId);
    
    if (!incident) {
      console.error(`❌ Incident not found: ${incidentId}`);
      process.exit(1);
    }
    
    const status = incident.status === 'open' ? '🔴 OPEN' : '✅ CLOSED';
    const severity = {
      critical: '🔥 CRITICAL',
      high: '🟠 HIGH',
      medium: '🟡 MEDIUM',
      low: '🟢 LOW'
    }[incident.severity] || '⚪ UNKNOWN';
    
    console.log(`\n🚨 Security Incident Details`);
    console.log('='.repeat(50));
    console.log(`ID: ${incident.id}`);
    console.log(`Title: ${incident.title}`);
    console.log(`Type: ${incident.type}`);
    console.log(`Severity: ${severity}`);
    console.log(`Status: ${status}`);
    console.log(`Created: ${incident.createdAt.toLocaleString()}`);
    console.log(`Updated: ${incident.updatedAt.toLocaleString()}`);
    
    if (incident.closedAt) {
      console.log(`Closed: ${incident.closedAt.toLocaleString()}`);
      console.log(`Closed By: ${incident.closedBy}`);
      console.log(`Resolution: ${incident.resolution}`);
    }
    
    if (incident.assignees.length > 0) {
      console.log(`Assigned To: ${incident.assignees.join(', ')}`);
    }
    
    console.log(`Escalation Level: ${incident.escalationLevel}`);
    
    if (incident.tags.length > 0) {
      console.log(`Tags: ${incident.tags.join(', ')}`);
    }
    
    console.log(`\nDescription:`);
    console.log(incident.description);
    
    // Show metadata
    if (Object.keys(incident.metadata).length > 0) {
      console.log(`\n📋 Metadata:`);
      Object.entries(incident.metadata).forEach(([key, value]) => {
        console.log(`  ${key}: ${JSON.stringify(value)}`);
      });
    }
    
    // Show auto actions
    if (incident.autoActionsExecuted.length > 0) {
      console.log(`\n🤖 Automatic Actions Executed:`);
      incident.autoActionsExecuted.forEach((action, index) => {
        const statusIcon = action.status === 'success' ? '✅' : '❌';
        console.log(`  ${index + 1}. ${statusIcon} ${action.action} (${action.timestamp.toLocaleString()})`);
        if (action.error) {
          console.log(`     Error: ${action.error}`);
        }
      });
    }
    
    // Show forensic data
    if (Object.keys(incident.forensicData).length > 0) {
      console.log(`\n🔍 Forensic Data Collected:`);
      Object.entries(incident.forensicData).forEach(([collector, data]) => {
        console.log(`  ${collector}: ${data.collector} (${data.collectedAt.toLocaleString()})`);
        if (data.error) {
          console.log(`    Error: ${data.error}`);
        }
      });
    }
    
    // Show timeline
    console.log(`\n📅 Timeline:`);
    incident.timeline.forEach((entry, index) => {
      console.log(`  ${index + 1}. ${entry.timestamp.toLocaleString()} - ${entry.action}`);
      console.log(`     ${entry.description} (by ${entry.actor})`);
    });
  });

program
  .command('create')
  .description('Create a new security incident')
  .option('-t, --type <type>', 'Incident type', 'manual-incident')
  .option('-d, --description <description>', 'Incident description')
  .option('--ip <ipAddress>', 'Source IP address')
  .option('--user <userId>', 'Affected user ID')
  .action(async (options) => {
    const securityIncidentResponse = getSecurityIncidentResponse();
    
    const eventData = {
      type: options.type,
      description: options.description || 'Manually created security incident',
      metadata: {}
    };
    
    if (options.ip) {
      eventData.metadata.ipAddress = options.ip;
    }
    
    if (options.user) {
      eventData.metadata.userId = options.user;
    }
    
    try {
      const incident = await securityIncidentResponse.createIncident(eventData);
      
      console.log(`✅ Security incident created successfully`);
      console.log(`ID: ${incident.id}`);
      console.log(`Type: ${incident.type}`);
      console.log(`Severity: ${incident.severity}`);
      console.log(`Title: ${incident.title}`);
      
    } catch (error) {
      console.error(`❌ Failed to create incident: ${error.message}`);
      process.exit(1);
    }
  });

program
  .command('update <incidentId>')
  .description('Update an existing incident')
  .option('-s, --status <status>', 'Update status')
  .option('--assign <assignee>', 'Assign to team member')
  .option('--tag <tag>', 'Add tag')
  .action(async (incidentId, options) => {
    const securityIncidentResponse = getSecurityIncidentResponse();
    
    const updates = {};
    
    if (options.status) {
      updates.status = options.status;
    }
    
    if (options.assign) {
      updates.assignees = [options.assign];
    }
    
    if (options.tag) {
      const incident = securityIncidentResponse.getIncident(incidentId);
      if (incident) {
        updates.tags = [...(incident.tags || []), options.tag];
      }
    }
    
    if (Object.keys(updates).length === 0) {
      console.error('❌ No updates specified');
      process.exit(1);
    }
    
    try {
      const incident = securityIncidentResponse.updateIncident(incidentId, updates);
      
      console.log(`✅ Incident updated successfully`);
      console.log(`ID: ${incident.id}`);
      console.log(`Status: ${incident.status}`);
      
    } catch (error) {
      console.error(`❌ Failed to update incident: ${error.message}`);
      process.exit(1);
    }
  });

program
  .command('close <incidentId>')
  .description('Close an incident')
  .option('-r, --resolution <resolution>', 'Resolution description', 'Resolved')
  .action(async (incidentId, options) => {
    const securityIncidentResponse = getSecurityIncidentResponse();
    
    try {
      const incident = securityIncidentResponse.closeIncident(
        incidentId, 
        options.resolution,
        'cli-user'
      );
      
      console.log(`✅ Incident closed successfully`);
      console.log(`ID: ${incident.id}`);
      console.log(`Resolution: ${incident.resolution}`);
      console.log(`Closed At: ${incident.closedAt.toLocaleString()}`);
      
    } catch (error) {
      console.error(`❌ Failed to close incident: ${error.message}`);
      process.exit(1);
    }
  });

program
  .command('escalate <incidentId>')
  .description('Escalate an incident')
  .action(async (incidentId) => {
    const securityIncidentResponse = getSecurityIncidentResponse();
    
    const incident = securityIncidentResponse.getIncident(incidentId);
    if (!incident) {
      console.error(`❌ Incident not found: ${incidentId}`);
      process.exit(1);
    }
    
    try {
      await securityIncidentResponse.escalateIncident(incident);
      
      console.log(`📈 Incident escalated successfully`);
      console.log(`ID: ${incident.id}`);
      console.log(`Escalation Level: ${incident.escalationLevel}`);
      
    } catch (error) {
      console.error(`❌ Failed to escalate incident: ${error.message}`);
      process.exit(1);
    }
  });

program
  .command('report')
  .description('Generate incident report')
  .option('-t, --time-range <range>', 'Time range (1h, 24h, 7d, 30d)', '24h')
  .action(async (options) => {
    const securityIncidentResponse = getSecurityIncidentResponse();
    const report = securityIncidentResponse.generateIncidentReport(options.timeRange);
    
    console.log(`\n📊 Security Incident Report (${options.timeRange})`);
    console.log('='.repeat(50));
    console.log(`Time Range: ${report.startTime} to ${report.endTime}`);
    console.log(`\n📈 Statistics:`);
    console.log(`  Total Incidents: ${report.statistics.total}`);
    console.log(`  Open: ${report.statistics.open}`);
    console.log(`  Closed: ${report.statistics.closed}`);
    console.log(`  Critical: ${report.statistics.critical}`);
    console.log(`  High: ${report.statistics.high}`);
    console.log(`  Medium: ${report.statistics.medium}`);
    console.log(`  Low: ${report.statistics.low}`);
    
    if (report.averageResolutionTime > 0) {
      console.log(`  Average Resolution Time: ${report.averageResolutionTime} minutes`);
    }
    
    console.log(`  Trend: ${report.trends}`);
    
    if (Object.keys(report.incidentsByType).length > 0) {
      console.log(`\n📋 Incidents by Type:`);
      Object.entries(report.incidentsByType)
        .sort(([,a], [,b]) => b - a)
        .forEach(([type, count]) => {
          console.log(`  ${type}: ${count}`);
        });
    }
    
    if (report.recentIncidents.length > 0) {
      console.log(`\n🕒 Recent Incidents:`);
      report.recentIncidents.slice(0, 5).forEach((incident, index) => {
        const status = incident.status === 'open' ? '🔴' : '✅';
        console.log(`  ${index + 1}. ${status} ${incident.title} (${incident.severity})`);
      });
    }
  });

program
  .command('playbooks')
  .description('List available response playbooks')
  .action(async () => {
    const securityIncidentResponse = getSecurityIncidentResponse();
    const playbooks = Array.from(securityIncidentResponse.responsePlaybooks.entries());
    
    console.log(`\n📖 Security Response Playbooks`);
    console.log('='.repeat(40));
    
    playbooks.forEach(([id, playbook], index) => {
      const severity = {
        critical: '🔥',
        high: '🟠',
        medium: '🟡',
        low: '🟢'
      }[playbook.severity] || '⚪';
      
      console.log(`\n${index + 1}. ${severity} ${playbook.name}`);
      console.log(`   ID: ${id}`);
      console.log(`   Severity: ${playbook.severity}`);
      console.log(`   Estimated Time: ${playbook.estimatedTime}`);
      console.log(`   Auto Actions: ${playbook.autoActions.join(', ')}`);
      console.log(`   Steps:`);
      playbook.steps.forEach((step, stepIndex) => {
        console.log(`     ${stepIndex + 1}. ${step}`);
      });
    });
  });

program
  .command('test')
  .description('Create a test incident for validation')
  .option('-t, --type <type>', 'Test incident type', 'test-incident')
  .action(async (options) => {
    const securityIncidentResponse = getSecurityIncidentResponse();
    
    try {
      const incident = await securityIncidentResponse.createIncident({
        type: options.type,
        description: 'Test security incident created via CLI',
        metadata: {
          test: true,
          source: 'cli'
        },
        tags: ['test', 'cli']
      });
      
      console.log(`✅ Test incident created successfully`);
      console.log(`ID: ${incident.id}`);
      console.log(`Type: ${incident.type}`);
      console.log(`Severity: ${incident.severity}`);
      
      // Wait a moment then show the incident details
      setTimeout(() => {
        console.log(`\nUse 'security-incident show ${incident.id}' to view details`);
      }, 1000);
      
    } catch (error) {
      console.error(`❌ Failed to create test incident: ${error.message}`);
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse();

// If no command provided, show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
}