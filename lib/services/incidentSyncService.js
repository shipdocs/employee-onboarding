/**
 * Incident Sync Service
 * Handles bidirectional synchronization between local incidents and external systems (PagerDuty)
 */

const { supabase } = require('../supabase');
const { externalIntegrationService } = require('./externalIntegrationService');
const settingsService = require('../settingsService');

class IncidentSyncService {
  constructor() {
    this.syncInterval = 5 * 60 * 1000; // 5 minutes
    this.isRunning = false;
  }

  /**
   * Start the sync service
   */
  start() {
    if (this.isRunning) {
      console.log('Incident sync service is already running');
      return;
    }

    this.isRunning = true;
    console.log('Starting incident sync service...');
    
    // Run initial sync
    this.performSync();
    
    // Schedule periodic sync
    this.syncTimer = setInterval(() => {
      this.performSync();
    }, this.syncInterval);
  }

  /**
   * Stop the sync service
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    console.log('Incident sync service stopped');
  }

  /**
   * Perform bidirectional sync
   */
  async performSync() {
    try {
      console.log('Performing incident sync...');
      
      // Sync local incidents to external systems
      await this.syncLocalToExternal();
      
      // Sync external incidents to local system
      await this.syncExternalToLocal();
      
      console.log('Incident sync completed successfully');
    } catch (error) {
      console.error('Error during incident sync:', error);
    }
  }

  /**
   * Sync local incidents to external systems
   */
  async syncLocalToExternal() {
    // Get incidents that need to be sent to external systems
    const { data: incidents } = await supabase
      .from('incidents')
      .select('*')
      .is('external_incident_id', null)
      .in('source_system', ['security_monitor', 'manual'])
      .in('severity', ['critical', 'high'])
      .order('created_at', { ascending: false })
      .limit(50);

    if (!incidents || incidents.length === 0) {
      return;
    }

    for (const incident of incidents) {
      try {
        await this.sendIncidentToExternal(incident);
      } catch (error) {
        console.error(`Failed to sync incident ${incident.incident_id} to external:`, error);
      }
    }
  }

  /**
   * Send incident to external system (PagerDuty)
   */
  async sendIncidentToExternal(incident) {
    // Send to PagerDuty
    const result = await externalIntegrationService.sendPagerDutyNotification(incident);
    
    if (result.success) {
      // Update incident with external reference
      const externalId = this.extractPagerDutyIncidentId(result);
      
      if (externalId) {
        await supabase
          .from('incidents')
          .update({
            external_incident_id: externalId,
            updated_at: new Date().toISOString(),
            metadata: {
              ...incident.metadata,
              pagerduty_sync: {
                synced_at: new Date().toISOString(),
                external_id: externalId
              }
            }
          })
          .eq('incident_id', incident.incident_id);

        console.log(`Synced incident ${incident.incident_id} to PagerDuty with ID ${externalId}`);
      }
    }
  }

  /**
   * Extract PagerDuty incident ID from response
   */
  extractPagerDutyIncidentId(result) {
    // PagerDuty returns dedup_key which we can use as external ID
    return result.payload?.dedup_key || null;
  }

  /**
   * Sync external incidents to local system
   */
  async syncExternalToLocal() {
    // This would typically involve calling PagerDuty API to get recent incidents
    // For now, we rely on webhooks for this direction
    // In a full implementation, you would:
    // 1. Call PagerDuty API to get recent incidents
    // 2. Check which ones don't exist locally
    // 3. Create local incidents for missing ones
    
    console.log('External to local sync relies on webhooks');
  }

  /**
   * Sync incident status changes
   */
  async syncIncidentStatusChange(incidentId, newStatus, externalReference = null) {
    try {
      // Get incident
      const { data: incident } = await supabase
        .from('incidents')
        .select('*')
        .eq('incident_id', incidentId)
        .single();

      if (!incident) {
        throw new Error(`Incident ${incidentId} not found`);
      }

      // Update local incident
      await supabase
        .from('incidents')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
          metadata: {
            ...incident.metadata,
            status_sync: {
              synced_at: new Date().toISOString(),
              external_reference: externalReference
            }
          }
        })
        .eq('incident_id', incidentId);

      // If incident has external ID, sync status to external system
      if (incident.external_incident_id && !externalReference) {
        await this.syncStatusToExternal(incident, newStatus);
      }

      console.log(`Synced status change for incident ${incidentId} to ${newStatus}`);
    } catch (error) {
      console.error(`Failed to sync status change for incident ${incidentId}:`, error);
      throw error;
    }
  }

  /**
   * Sync status to external system
   */
  async syncStatusToExternal(incident, newStatus) {
    // Map local status to PagerDuty action
    const actionMapping = {
      'investigating': 'acknowledge',
      'resolved': 'resolve',
      'closed': 'resolve'
    };

    const action = actionMapping[newStatus];
    if (!action) {
      return; // No action needed for this status
    }

    // Get PagerDuty integration settings
    const settings = await settingsService.getSettings();
    const integrationKey = settings.integrations?.pagerduty_integration_key || process.env.PAGERDUTY_INTEGRATION_KEY;

    if (!integrationKey) {
      console.warn(`PagerDuty integration key not configured - skipping status update for incident ${incident.incident_id}`);
      return;
    }

    // Send status update to PagerDuty (sanitized payload for logging)
    const payload = {
      routing_key: integrationKey,
      event_action: action,
      dedup_key: incident.external_incident_id
    };

    // Create sanitized payload for logging (without sensitive keys)
    const sanitizedPayload = {
      event_action: action,
      dedup_key: incident.external_incident_id,
      routing_key: '[REDACTED]'
    };

    try {
      await externalIntegrationService.sendNotification({
        type: 'pagerduty',
        endpoint: 'https://events.pagerduty.com/v2/enqueue',
        payload,
        incident_id: incident.incident_id
      });

      console.log(`Sent ${action} to PagerDuty for incident ${incident.incident_id}`, {
        payload: sanitizedPayload,
        incident_id: incident.incident_id
      });
    } catch (error) {
      const errorMessage = `Failed to send status update to PagerDuty for incident ${incident.incident_id}`;
      // Log error with sanitized payload
      console.error(errorMessage);
      console.error('Error details:', error.message);
      console.error('Payload:', sanitizedPayload);
    }
  }

  /**
   * Force sync specific incident
   */
  async forceSyncIncident(incidentId) {
    try {
      const { data: incident } = await supabase
        .from('incidents')
        .select('*')
        .eq('incident_id', incidentId)
        .single();

      if (!incident) {
        throw new Error(`Incident ${incidentId} not found`);
      }

      if (!incident.external_incident_id) {
        // Send to external system
        await this.sendIncidentToExternal(incident);
      } else {
        // Sync status
        await this.syncStatusToExternal(incident, incident.status);
      }

      return { success: true, message: 'Incident synced successfully' };
    } catch (error) {
      console.error(`Failed to force sync incident ${incidentId}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get sync status for incident
   */
  async getSyncStatus(incidentId) {
    const { data: incident } = await supabase
      .from('incidents')
      .select('external_incident_id, metadata, external_notifications')
      .eq('incident_id', incidentId)
      .single();

    if (!incident) {
      return { synced: false, error: 'Incident not found' };
    }

    return {
      synced: !!incident.external_incident_id,
      external_incident_id: incident.external_incident_id,
      last_sync: incident.metadata?.pagerduty_sync?.synced_at,
      notifications_sent: incident.external_notifications?.length || 0
    };
  }
}

// Create singleton instance
const incidentSyncService = new IncidentSyncService();

module.exports = { IncidentSyncService, incidentSyncService };
