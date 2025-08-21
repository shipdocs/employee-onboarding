// api/admin/system-settings.js - System Settings Management API
const db = require('../../lib/database');
const { authenticateRequest } = require('../../lib/auth');
const { applyCors } = require('../../lib/cors');
const { adminRateLimit } = require('../../lib/rateLimit');
const crypto = require('crypto');

/**
 * System Settings API
 *
 * GET: Retrieve all system settings
 * PUT: Update a specific setting
 * POST: Create a new setting
 * DELETE: Remove a setting
 */
async function handler(req, res) {
  // Apply CORS headers
  if (!applyCors(req, res)) {
    return; // Preflight handled
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

    switch (req.method) {
      case 'GET':
        return handleGet(req, res);
      case 'PUT':
        return handlePut(req, res);
      case 'POST':
        return handlePost(req, res);
      case 'DELETE':
        return handleDelete(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    // console.error('System settings API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET: Retrieve all system settings organized by category
 */
async function handleGet(req, res) {
  try {
    // Use helpers method for secure database access
    const settings = await supabase.helpers.select('system_settings',
      {},
      { orderBy: { 'category': 'ASC', 'key': 'ASC' } }
    );

    if (!settings) {
      return res.status(500).json({ error: 'Failed to fetch settings' });
    }

    // Organize by category
    const organized = {};
    settings.forEach(setting => {
      if (!organized[setting.category]) {
        organized[setting.category] = {};
      }

      // Decrypt encrypted values for display
      if (setting.is_encrypted && setting.value) {
        try {
          setting.value = decryptValue(setting.value);
        } catch (e) {
          // If decryption fails, show masked value
          setting.value = '********';
        }
      }

      organized[setting.category][setting.key] = setting;
    });

    return res.status(200).json(organized);
  } catch (error) {
    // console.error('Error in handleGet:', error);
    return res.status(500).json({ error: 'Failed to retrieve settings' });
  }
}

/**
 * PUT: Update an existing setting
 */
async function handlePut(req, res) {
  try {
    const { category, key, value } = req.body;

    if (!category || !key || value === undefined) {
      return res.status(400).json({ error: 'Category, key, and value are required' });
    }

    // Get current setting to check if it needs encryption
    const { data: current, error: fetchError } = await supabase
      .from('system_settings')
      .select('*')
      .eq('category', category)
      .eq('key', key)
      .single();

    if (fetchError || !current) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    // Validate value if regex provided
    if (current.validation_regex && value) {
      const regex = new RegExp(current.validation_regex);
      if (!regex.test(value)) {
        return res.status(400).json({
          error: 'Value does not match required format',
          pattern: current.validation_regex
        });
      }
    }

    // Encrypt if needed
    let finalValue = value;
    if (current.is_encrypted && value && value !== '********') {
      finalValue = encryptValue(value);
    }

    // Update setting
    const { data: updated, error: updateError } = await supabase
      .from('system_settings')
      .update({
        value: finalValue,
        updated_at: new Date().toISOString()
      })
      .eq('category', category)
      .eq('key', key)
      .select()
      .single();

    if (updateError) {
      // console.error('Error updating setting:', updateError);
      return res.status(500).json({ error: 'Failed to update setting' });
    }

    // Log the change

    // Return decrypted value for display
    if (updated.is_encrypted && updated.value) {
      updated.value = '********'; // Mask for security
    }

    return res.status(200).json({
      message: 'Setting updated successfully',
      setting: updated
    });
  } catch (error) {
    // console.error('Error in handlePut:', error);
    return res.status(500).json({ error: 'Failed to update setting' });
  }
}

/**
 * POST: Create a new setting
 */
async function handlePost(req, res) {
  try {
    const {
      category,
      key,
      value,
      description,
      type = 'string',
      options,
      is_encrypted = false,
      is_required = false,
      validation_regex
    } = req.body;

    if (!category || !key || value === undefined) {
      return res.status(400).json({ error: 'Category, key, and value are required' });
    }

    // Validate key format
    if (!/^[a-z0-9_]+$/.test(key)) {
      return res.status(400).json({
        error: 'Key must contain only lowercase letters, numbers, and underscores'
      });
    }

    // Encrypt if needed
    let finalValue = value;
    if (is_encrypted && value) {
      finalValue = encryptValue(value);
    }

    // Create setting
    const { data: created, error: createError } = await supabase
      .from('system_settings')
      .insert({
        category,
        key,
        value: finalValue,
        description,
        type,
        options: options ? JSON.stringify(options) : null,
        is_encrypted,
        is_required,
        validation_regex
      })
      .select()
      .single();

    if (createError) {
      if (createError.code === '23505') {
        return res.status(409).json({
          error: 'Setting already exists for this category and key'
        });
      }
      // console.error('Error creating setting:', createError);
      return res.status(500).json({ error: 'Failed to create setting' });
    }

    // Return masked value if encrypted
    if (created.is_encrypted) {
      created.value = '********';
    }

    return res.status(201).json({
      message: 'Setting created successfully',
      setting: created
    });
  } catch (error) {
    // console.error('Error in handlePost:', error);
    return res.status(500).json({ error: 'Failed to create setting' });
  }
}

/**
 * DELETE: Remove a setting (admin only, be careful!)
 */
async function handleDelete(req, res) {
  try {
    const { category, key } = req.query;

    if (!category || !key) {
      return res.status(400).json({ error: 'Category and key are required' });
    }

    // Check if setting exists and is not required
    const { data: setting, error: fetchError } = await supabase
      .from('system_settings')
      .select('is_required')
      .eq('category', category)
      .eq('key', key)
      .single();

    if (fetchError || !setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    if (setting.is_required) {
      return res.status(403).json({ error: 'Cannot delete required settings' });
    }

    // Delete setting
    const { error: deleteError } = await supabase
      .from('system_settings')
      .delete()
      .eq('category', category)
      .eq('key', key);

    if (deleteError) {
      // console.error('Error deleting setting:', deleteError);
      return res.status(500).json({ error: 'Failed to delete setting' });
    }

    return res.status(200).json({
      message: 'Setting deleted successfully'
    });
  } catch (error) {
    // console.error('Error in handleDelete:', error);
    return res.status(500).json({ error: 'Failed to delete setting' });
  }
}

/**
 * Encrypt sensitive values
 */
function encryptValue(value) {
  const algorithm = 'aes-256-gcm';
  const key = crypto.scryptSync(
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'default-encryption-key',
    'salt',
    32
  );
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);

  let encrypted = cipher.update(value, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return JSON.stringify({
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  });
}

/**
 * Decrypt sensitive values
 */
function decryptValue(encryptedData) {
  try {
    const data = JSON.parse(encryptedData);
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(
      process.env.SUPABASE_SERVICE_ROLE_KEY || 'default-encryption-key',
      'salt',
      32
    );

    const decipher = crypto.createDecipheriv(
      algorithm,
      key,
      Buffer.from(data.iv, 'hex')
    );

    decipher.setAuthTag(Buffer.from(data.authTag, 'hex'));

    let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    // console.error('Decryption error:', error);
    throw error;
  }
}

module.exports = adminRateLimit(handler);
