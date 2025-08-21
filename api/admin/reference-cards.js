const db = require('../../lib/database');
const { authenticateRequest } = require('../../lib/auth');
const fs = require('fs');
const path = require('path');
const { adminRateLimit } = require('../../lib/rateLimit');

/**
 * Generate reference cards with dynamic contact information
 * GET /api/admin/reference-cards?type=crew|manager
 */
async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify admin authentication with proper blacklist checking
    const user = await authenticateRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Access token required' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const { type = 'crew' } = req.query;

    if (!['crew', 'manager'].includes(type)) {
      return res.status(400).json({ error: 'Invalid card type. Must be "crew" or "manager"' });
    }

    // Fetch contact settings from database
    const { data: settings, error } = await supabase
      .from('system_settings')
      .select('key, value')
      .eq('category', 'contact');

    if (error) {
      console.error('Error fetching contact settings:', error);
      return res.status(500).json({ error: 'Failed to fetch contact settings' });
    }

    // Convert settings to object
    const contactInfo = {};
    settings.forEach(setting => {
      try {
        contactInfo[setting.key] = JSON.parse(setting.value);
      } catch {
        contactInfo[setting.key] = setting.value;
      }
    });

    // Default values if not set
    const defaults = {
      support_email: 'support@company.com',
      admin_email: 'admin@company.com',
      it_phone: '+1-555-0123',
      docs_url: '/help',
      company_name: 'Maritime Onboarding System',
      system_url: 'onboarding.company.com',
      email_response_time: '24 hours'
    };

    const contact = { ...defaults, ...contactInfo };

    // Read the template file with path validation
    const baseDir = path.join(process.cwd(), 'docs', 'reference-cards');
    const templatePath = path.join(baseDir, `${type}-reference-card.html`);

    // Security: Ensure the resolved path is within the expected directory
    const resolvedPath = path.resolve(templatePath);
    const resolvedBaseDir = path.resolve(baseDir);

    if (!resolvedPath.startsWith(resolvedBaseDir)) {
      return res.status(400).json({ error: 'Invalid template path' });
    }

    if (!fs.existsSync(templatePath)) {
      return res.status(404).json({ error: `Template not found for ${type} reference card` });
    }

    let htmlContent = fs.readFileSync(templatePath, 'utf8');

    // Replace placeholders with actual values
    const replacements = {
      '{{SUPPORT_EMAIL}}': contact.support_email,
      '{{ADMIN_EMAIL}}': contact.admin_email,
      '{{IT_PHONE}}': contact.it_phone,
      '{{DOCS_URL}}': contact.docs_url,
      '{{COMPANY_NAME}}': contact.company_name,
      '{{SYSTEM_URL}}': contact.system_url,
      '{{EMAIL_RESPONSE_TIME}}': contact.email_response_time,
      // Legacy replacements for existing hard-coded values
      'support@maritime-onboarding.local': contact.support_email,
      'admin@company.com': contact.admin_email,
      'maritime-onboarding.local': contact.system_url,
      'Maritime Onboarding System v2.0': `${contact.company_name} v2.0`
    };

    // Apply all replacements
    Object.entries(replacements).forEach(([placeholder, value]) => {
      htmlContent = htmlContent.replace(new RegExp(placeholder, 'g'), value);
    });

    // Set appropriate headers for HTML content
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `inline; filename="${type}-reference-card.html"`);

    return res.status(200).send(htmlContent);

  } catch (error) {
    console.error('Error generating reference card:', error);
    return res.status(500).json({ error: 'Failed to generate reference card' });
  }
}

module.exports = adminRateLimit(handler);
