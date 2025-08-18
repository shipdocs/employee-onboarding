const { apiRateLimit } = require('../../lib/rateLimit');

/**
 * Test PagerDuty Webhook Integration
 * Simulates PagerDuty webhook calls to test incident sync
 */

module.exports = apiRateLimit(async (req, res) => {
  try {
    const { method } = req;

    if (method !== 'POST') {
      res.setHeader('Allow', ['POST']);
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { action = 'create' } = req.query;

    switch (action) {
      case 'create':
        return await simulateIncidentCreation(req, res);
      case 'acknowledge':
        return await simulateIncidentAcknowledge(req, res);
      case 'resolve':
        return await simulateIncidentResolve(req, res);
      default:
        return res.status(400).json({ error: 'Invalid action. Use: create, acknowledge, resolve' });
    }

  } catch (error) {
    console.error('Test webhook error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

async function simulateIncidentCreation(req, res) {
  const testWebhookData = {
    event_type: 'incident.triggered',
    incident_id: 'local-incident-id',
    external_reference: `PD-TEST-${Date.now()}`,
    source_system: 'pagerduty',
    title: 'Test PagerDuty Incident',
    description: 'This is a test incident created via webhook simulation',
    severity: 'high',
    status: 'triggered',
    metadata: {
      test: true,
      created_at: new Date().toISOString()
    }
  };

  // Forward to actual webhook handler using trusted base URL
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.BASE_URL || 'http://localhost:3000';

  const webhookResponse = await fetch(`${baseUrl}/api/incidents/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(testWebhookData)
  });

  if (webhookResponse.ok) {
    return res.status(200).json({
      success: true,
      message: 'Test incident created successfully',
      webhook_data: testWebhookData
    });
  } else {
    const error = await webhookResponse.text();
    return res.status(500).json({
      success: false,
      message: 'Failed to create test incident',
      error
    });
  }
}

async function simulateIncidentAcknowledge(req, res) {
  const { incident_id } = req.body;
  
  if (!incident_id) {
    return res.status(400).json({ error: 'incident_id is required' });
  }

  const testWebhookData = {
    event_type: 'incident.acknowledged',
    incident_id,
    assigned_to: 'test-user@example.com',
    external_reference: `PD-ACK-${Date.now()}`
  };

  // Forward to actual webhook handler using trusted base URL
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.BASE_URL || 'http://localhost:3000';

  const webhookResponse = await fetch(`${baseUrl}/api/incidents/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(testWebhookData)
  });

  if (webhookResponse.ok) {
    return res.status(200).json({
      success: true,
      message: 'Test incident acknowledged successfully',
      webhook_data: testWebhookData
    });
  } else {
    const error = await webhookResponse.text();
    return res.status(500).json({
      success: false,
      message: 'Failed to acknowledge test incident',
      error
    });
  }
}

async function simulateIncidentResolve(req, res) {
  const { incident_id } = req.body;
  
  if (!incident_id) {
    return res.status(400).json({ error: 'incident_id is required' });
  }

  const testWebhookData = {
    event_type: 'incident.resolved',
    incident_id,
    resolution_notes: 'Test incident resolved via webhook simulation',
    external_reference: `PD-RESOLVE-${Date.now()}`
  };

  // Forward to actual webhook handler using trusted base URL
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.BASE_URL || 'http://localhost:3000';

  const webhookResponse = await fetch(`${baseUrl}/api/incidents/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(testWebhookData)
  });

  if (webhookResponse.ok) {
    return res.status(200).json({
      success: true,
      message: 'Test incident resolved successfully',
      webhook_data: testWebhookData
    });
  } else {
    const error = await webhookResponse.text();
    return res.status(500).json({
      success: false,
      message: 'Failed to resolve test incident',
      error
    });
  }
}
