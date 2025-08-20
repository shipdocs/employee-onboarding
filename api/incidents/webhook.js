/**
 * Incident Webhook Endpoint
 * Receives webhooks from external incident response tools
 */

const { supabase } = require('../../lib/supabase');
const crypto = require('crypto');
const settingsService = require('../../lib/settingsService');
const { apiRateLimit } = require('../../lib/rateLimit');

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const rateLimitMap = new Map();

// Cache for settings to avoid database calls on every request
let settingsCache = null;
let settingsCacheTime = 0;
const SETTINGS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get webhook security settings from database with caching
 */
async function getWebhookSettings() {
  const now = Date.now();

  // Return cached settings if still valid
  if (settingsCache && (now - settingsCacheTime) < SETTINGS_CACHE_TTL) {
    return settingsCache;
  }

  try {
    const settings = await settingsService.getSettings();

    settingsCache = {
      webhookSecret: settings.integrations?.pagerduty_webhook_secret || process.env.PAGERDUTY_WEBHOOK_SECRET,
      sourceIPs: settings.integrations?.pagerduty_source_ips ?
        settings.integrations.pagerduty_source_ips.split(',').map(ip => ip.trim()) :
        (process.env.PAGERDUTY_SOURCE_IPS ? process.env.PAGERDUTY_SOURCE_IPS.split(',').map(ip => ip.trim()) : []),
      rateLimitPerMinute: parseInt(settings.security?.webhook_rate_limit_per_minute) || 100,
      timestampToleranceMs: (parseInt(settings.security?.webhook_timestamp_tolerance_minutes) || 5) * 60 * 1000
    };

    settingsCacheTime = now;
    return settingsCache;
  } catch (error) {
    console.error('Error loading webhook settings:', error);

    // Fallback to environment variables
    return {
      webhookSecret: process.env.PAGERDUTY_WEBHOOK_SECRET,
      sourceIPs: process.env.PAGERDUTY_SOURCE_IPS ? process.env.PAGERDUTY_SOURCE_IPS.split(',').map(ip => ip.trim()) : [],
      rateLimitPerMinute: 100,
      timestampToleranceMs: 5 * 60 * 1000
    };
  }
}

/**
 * Handle incoming webhook from external incident response tools
 */
async function handleWebhook(req, res) {
  try {
    // Verify webhook signature if secret is configured
    const webhookSecret = process.env.INCIDENT_WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature = req.headers['x-incident-signature'];
      if (!signature || !verifyWebhookSignature(req.body, signature, webhookSecret)) {
        return res.status(401).json({ error: 'Invalid webhook signature' });
      }
    }

    const {
      event_type,
      incident_id,
      assigned_to,
      resolution_notes,
      external_reference,
      source_system
    } = req.body;

    // Validate required fields
    if (!event_type || !incident_id) {
      return res.status(400).json({
        error: 'Missing required fields: event_type, incident_id'
      });
    }

    // Log the webhook receipt
    console.log(`Received webhook: ${event_type} for incident ${incident_id} from ${source_system || 'unknown'}`);

    // Handle different event types
    switch (event_type) {
      case 'incident.triggered':
      case 'incident.created':
        await handleIncidentCreated(req.body);
        break;

      case 'incident.acknowledged':
        await handleIncidentAcknowledged(incident_id, assigned_to, external_reference);
        break;

      case 'incident.assigned':
        await handleIncidentAssigned(incident_id, assigned_to, external_reference);
        break;

      case 'incident.resolved':
        await handleIncidentResolved(incident_id, resolution_notes, external_reference);
        break;

      case 'incident.closed':
        await handleIncidentClosed(incident_id, resolution_notes, external_reference);
        break;

      case 'incident.escalated':
        await handleIncidentEscalated(incident_id, assigned_to, external_reference);
        break;

      default:
        console.warn(`Unknown webhook event type: ${event_type}`);
        return res.status(400).json({ error: 'Unknown event type' });
    }

    // Log the webhook processing
    await logWebhookEvent({
      event_type,
      incident_id,
      source_system: source_system || 'unknown',
      payload: req.body,
      processed_at: new Date().toISOString()
    });

    return res.status(200).json({
      message: 'Webhook processed successfully',
      event_type,
      incident_id
    });

  } catch (error) {
    console.error('Error processing webhook:', error);
    return res.status(500).json({ error: 'Failed to process webhook' });
  }
}

/**
 * Handle incident created/triggered event from external systems (like PagerDuty)
 */
async function handleIncidentCreated(webhookData) {
  const {
    incident_id,
    external_reference,
    source_system = 'external',
    title,
    description,
    severity = 'medium',
    status = 'open',
    assigned_to,
    metadata = {}
  } = webhookData;

  // Check if incident already exists (handle no-rows safely)
  const { data: existingIncident, error: existingErr } = await supabase
    .from('incidents')
    .select('incident_id')
    .eq('external_incident_id', external_reference)
    .eq('source_system', source_system) // Scope by source system
    .maybeSingle();

  if (existingErr) {
    console.error('Error checking existing incident:', existingErr);
    throw new Error(`Failed to check existing incident: ${existingErr.message}`);
  }

  if (existingIncident) {
    console.log(`Incident with external ID ${external_reference} from ${source_system} already exists`);
    return;
  }

  // Generate local incident ID
  const localIncidentId = generateIncidentId();

  // Create incident in local system
  const incidentData = {
    incident_id: localIncidentId,
    external_incident_id: external_reference,
    type: 'external.incident',
    severity: mapExternalSeverity(severity),
    status: mapExternalStatus(status),
    title: title || `External Incident ${external_reference}`,
    description: description || 'Incident created from external system',
    source_system,
    source_event_id: incident_id,
    detection_time: new Date().toISOString(),
    metadata: {
      ...metadata,
      external_incident_id: external_reference,
      created_via: 'webhook',
      webhook_received_at: new Date().toISOString()
    },
    external_notifications: []
  };

  const { data: incident, error } = await supabase
    .from('incidents')
    .insert([incidentData])
    .select()
    .single();

  if (error) {
    // Handle unique constraint violation (concurrent creation)
    if (error.code === '23505') { // unique_violation (PostgreSQL)
      console.log(`Concurrent creation detected for ${external_reference} from ${source_system}, skipping duplicate`);
      return;
    }
    throw new Error(`Failed to create incident from webhook: ${error.message}`);
  }

  console.log('Created incident from external system', {
    incident_id: localIncidentId,
    source_system,
    external_incident_id: external_reference,
    severity: mapExternalSeverity(severity),
    status: mapExternalStatus(status)
  });

  // Log webhook event
  await logWebhookEvent({
    event_type: 'incident.created',
    incident_id: localIncidentId,
    source_system,
    payload: webhookData,
    processed_at: new Date().toISOString()
  });
}

/**
 * Generate incident ID
 */
function generateIncidentId() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `INC-${timestamp}-${random}`;
}

/**
 * Map external severity to local severity
 */
function mapExternalSeverity(externalSeverity) {
  const mapping = {
    'critical': 'critical',
    'error': 'high',
    'warning': 'medium',
    'info': 'low',
    'high': 'high',
    'medium': 'medium',
    'low': 'low'
  };
  return mapping[externalSeverity] || 'medium';
}

/**
 * Map external status to local status
 */
function mapExternalStatus(externalStatus) {
  const mapping = {
    'triggered': 'detected',
    'acknowledged': 'investigating',
    'resolved': 'resolved',
    'closed': 'closed',
    'open': 'detected'
  };
  return mapping[externalStatus] || 'detected';
}

/**
 * Handle incident acknowledged event
 */
async function handleIncidentAcknowledged(incidentId, assignedTo, externalReference) {
  const updateData = {
    status: 'acknowledged',
    response_time: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (assignedTo) {
    updateData.assigned_to = assignedTo;
  }

  if (externalReference) {
    // Fetch current metadata to preserve existing data
    const { data: incident } = await supabase
      .from('incidents')
      .select('metadata')
      .eq('incident_id', incidentId)
      .single();

    updateData.metadata = {
      ...(incident?.metadata || {}),
      external_reference: externalReference,
      acknowledged_via: 'webhook',
      acknowledged_at: new Date().toISOString()
    };
  }

  await updateIncident(incidentId, updateData);
}

/**
 * Handle incident assigned event
 */
async function handleIncidentAssigned(incidentId, assignedTo, externalReference) {
  const updateData = {
    assigned_to: assignedTo,
    updated_at: new Date().toISOString()
  };

  if (externalReference) {
    const { data: incident } = await supabase
      .from('incidents')
      .select('metadata')
      .eq('incident_id', incidentId)
      .single();

    updateData.metadata = {
      ...(incident?.metadata || {}),
      external_reference: externalReference,
      assigned_via: 'webhook',
      assigned_at: new Date().toISOString()
    };
  }

  await updateIncident(incidentId, updateData);
}

/**
 * Handle incident resolved event
 */
async function handleIncidentResolved(incidentId, resolutionNotes, externalReference) {
  const { data: incident } = await supabase
    .from('incidents')
    .select('metadata')
    .eq('incident_id', incidentId)
    .single();

  const updateData = {
    status: 'resolved',
    resolution_time: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    metadata: {
      ...(incident?.metadata || {}),
      resolution_notes: resolutionNotes,
      external_reference: externalReference,
      resolved_via: 'webhook',
      resolved_at: new Date().toISOString()
    }
  };

  await updateIncident(incidentId, updateData);
}

/**
 * Handle incident closed event
 */
async function handleIncidentClosed(incidentId, resolutionNotes, externalReference) {
  const { data: incident } = await supabase
    .from('incidents')
    .select('metadata')
    .eq('incident_id', incidentId)
    .single();

  const updateData = {
    status: 'closed',
    resolution_time: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    metadata: {
      ...(incident?.metadata || {}),
      resolution_notes: resolutionNotes,
      external_reference: externalReference,
      closed_via: 'webhook',
      closed_at: new Date().toISOString()
    }
  };

  await updateIncident(incidentId, updateData);
}

/**
 * Handle incident escalated event
 */
async function handleIncidentEscalated(incidentId, assignedTo, externalReference) {
  const { data: incident } = await supabase
    .from('incidents')
    .select('metadata')
    .eq('incident_id', incidentId)
    .single();

  const updateData = {
    assigned_to: assignedTo,
    updated_at: new Date().toISOString(),
    metadata: {
      ...(incident?.metadata || {}),
      external_reference: externalReference,
      escalated_via: 'webhook',
      escalated_at: new Date().toISOString(),
      escalation_count: (incident?.metadata?.escalation_count || 0) + 1
    }
  };

  await updateIncident(incidentId, updateData);
}

/**
 * Update incident in database
 */
async function updateIncident(incidentId, updateData) {
  const { error } = await supabase
    .from('incidents')
    .update(updateData)
    .eq('incident_id', incidentId);

  if (error) {
    console.error(`Error updating incident ${incidentId}:`, error);
    throw error;
  }

  console.log(`Incident ${incidentId} updated successfully via webhook`);
}

/**
 * Log webhook event for audit purposes
 */
async function logWebhookEvent({ event_type, incident_id, source_system, payload, processed_at }) {
  try {
    await supabase
      .from('incident_external_notifications')
      .insert([{
        incident_id,
        notification_type: 'webhook_received',
        endpoint_url: `webhook/${event_type}`,
        payload: {
          event_type,
          source_system,
          original_payload: payload,
          processed_at
        },
        success: true,
        response_code: 200,
        sent_at: processed_at
      }]);
  } catch (error) {
    console.error('Error logging webhook event:', error);
  }
}

/**
 * Verify webhook authentication and authorization
 */
async function verifyWebhookAuth(req) {
  const settings = await getWebhookSettings();
  const clientIP = getClientIP(req);

  // Check rate limiting
  const rateLimitResult = checkRateLimit(clientIP, settings.rateLimitPerMinute);
  if (!rateLimitResult.allowed) {
    return { valid: false, reason: `Rate limit exceeded: ${rateLimitResult.remaining} requests remaining` };
  }

  // Check if webhook secret is configured
  if (!settings.webhookSecret) {
    console.warn('PagerDuty webhook secret not configured - skipping signature verification');
    return { valid: true, reason: 'No secret configured' };
  }

  // Check source IP if configured
  if (settings.sourceIPs.length > 0) {
    if (!settings.sourceIPs.includes(clientIP)) {
      return { valid: false, reason: `Source IP ${clientIP} not allowed` };
    }
  }

  // Check timestamp to prevent replay attacks
  const timestamp = req.headers['x-pagerduty-timestamp'];
  if (timestamp) {
    const requestTime = parseInt(timestamp) * 1000; // Convert to milliseconds
    const currentTime = Date.now();
    if (Math.abs(currentTime - requestTime) > settings.timestampToleranceMs) {
      return { valid: false, reason: 'Request timestamp too old' };
    }
  }

  // Verify signature if present
  const signature = req.headers['x-pagerduty-signature'];
  if (signature) {
    const isValidSignature = verifyWebhookSignature(req.body, signature, settings.webhookSecret);
    if (!isValidSignature) {
      return { valid: false, reason: 'Invalid signature' };
    }
  }

  return { valid: true, reason: 'Authentication successful' };
}

/**
 * Check rate limiting for client IP
 */
function checkRateLimit(clientIP, maxRequests = 100) {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;

  // Get or create rate limit entry for this IP
  if (!rateLimitMap.has(clientIP)) {
    rateLimitMap.set(clientIP, []);
  }

  const requests = rateLimitMap.get(clientIP);

  // Remove old requests outside the window
  const recentRequests = requests.filter(timestamp => timestamp > windowStart);
  rateLimitMap.set(clientIP, recentRequests);

  // Check if limit exceeded
  if (recentRequests.length >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: Math.min(...recentRequests) + RATE_LIMIT_WINDOW_MS
    };
  }

  // Add current request
  recentRequests.push(now);
  rateLimitMap.set(clientIP, recentRequests);

  return {
    allowed: true,
    remaining: maxRequests - recentRequests.length,
    resetTime: now + RATE_LIMIT_WINDOW_MS
  };
}

/**
 * Get client IP address from request
 */
function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         req.ip ||
         'unknown';
}

/**
 * Verify webhook signature for security
 */
function verifyWebhookSignature(payload, signature, secret) {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    const receivedSignature = signature.replace('sha256=', '');

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(receivedSignature, 'hex')
    );
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
}

/**
 * Main handler function
 */
async function handler(req, res) {
  try {
    const { method } = req;

    if (method !== 'POST') {
      res.setHeader('Allow', ['POST']);
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Verify webhook authentication
    const authResult = await verifyWebhookAuth(req);
    if (!authResult.valid) {
      console.warn('Webhook authentication failed:', authResult.reason);
      return res.status(401).json({ error: 'Unauthorized', reason: authResult.reason });
    }

    return await handleWebhook(req, res);
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = apiRateLimit(handler);
