/**
 * Feature Flags Management API
 * Admin interface for managing feature flags with real-time toggles and analytics
 */

const db = require('../../lib/database-direct');
const { authenticateRequest } = require('../../lib/auth');
const { adminRateLimit } = require('../../lib/rateLimit');

async function getFeatureFlags(req, res) {
  try {
    // Get all feature flags with usage statistics
    const { data: flags, error: flagsError } = await supabase
      .from('feature_flags')
      .select(`
        id,
        key,
        name,
        description,
        is_enabled,
        is_active,
        rollout_percentage,
        target_users,
        target_roles,
        environments,
        metadata,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false });

    if (flagsError) {
      console.error('Error fetching feature flags:', flagsError);
      return res.status(500).json({ error: 'Failed to fetch feature flags' });
    }

    // Calculate statistics
    const stats = {
      total: flags.length,
      enabled: flags.filter(f => f.is_enabled).length,
      disabled: flags.filter(f => !f.is_enabled).length,
      active: flags.filter(f => f.is_active).length
    };

    // Transform flags data
    const transformedFlags = flags.map(flag => ({
      id: flag.id,
      key: flag.key,
      name: flag.name,
      description: flag.description,
      enabled: flag.is_enabled,
      active: flag.is_active,
      rollout_percentage: flag.rollout_percentage,
      target_users: flag.target_users,
      target_roles: flag.target_roles,
      environments: flag.environments,
      metadata: flag.metadata,
      created_at: flag.created_at,
      updated_at: flag.updated_at
    }));

    return res.json({
      flags: transformedFlags,
      stats
    });
  } catch (error) {
    console.error('Get feature flags error:', error);
    return res.status(500).json({ error: 'Failed to fetch feature flags' });
  }
}

async function createFeatureFlag(req, res, user) {
  try {
    const {
      key,
      name,
      description,
      enabled = false,
      active = true,
      rollout_percentage = 100,
      target_users = [],
      target_roles = [],
      environments = ['production']
    } = req.body;

    if (!key || !name) {
      return res.status(400).json({ error: 'Flag key and name are required' });
    }

    // Check if flag name already exists
    const { data: existingFlag } = await supabase
      .from('feature_flags')
      .select('id')
      .eq('key', key)
      .single();

    if (existingFlag) {
      return res.status(400).json({ error: 'Feature flag with this key already exists' });
    }

    // Create feature flag
    const { data: newFlag, error: createError } = await supabase
      .from('feature_flags')
      .insert({
        key,
        name,
        description,
        is_enabled: enabled,
        is_active: active,
        rollout_percentage,
        target_users,
        target_roles,
        environments,
        metadata: { created_by: user.id }
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating feature flag:', createError);
      return res.status(500).json({ error: 'Failed to create feature flag' });
    }

    // Log the creation
    await supabase
      .from('security_events')
      .insert({
        event_id: require('crypto').randomUUID(),
        type: 'feature_flag_created',
        severity: 'low',
        user_id: user.id,
        ip_address: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        user_agent: req.headers['user-agent'],
        details: {
          flag_name: name,
          flag_key: key,
          enabled,
          environments,
          timestamp: new Date().toISOString()
        },
        threats: []
      });

    return res.status(201).json({
      flag: {
        id: newFlag.id,
        key: newFlag.key,
        name: newFlag.name,
        description: newFlag.description,
        enabled: newFlag.is_enabled,
        active: newFlag.is_active,
        rollout_percentage: newFlag.rollout_percentage,
        target_users: newFlag.target_users,
        target_roles: newFlag.target_roles,
        environments: newFlag.environments,
        metadata: newFlag.metadata,
        created_at: newFlag.created_at,
        updated_at: newFlag.updated_at
      }
    });
  } catch (error) {
    console.error('Create feature flag error:', error);
    return res.status(500).json({ error: 'Failed to create feature flag' });
  }
}

async function updateFeatureFlag(req, res, user) {
  try {
    const {
      id,
      flagId,
      enabled,
      active,
      description,
      rollout_percentage,
      target_users,
      target_roles,
      environments
    } = req.body;

    const targetId = id || flagId;
    if (!targetId) {
      return res.status(400).json({ error: 'Flag ID is required' });
    }

    // Get current flag
    const currentFlagResult = await db.query('SELECT * FROM feature_flags WHERE id = $1', [targetId]);
    const currentFlag = currentFlagResult.rows[0];
    const fetchError = !currentFlag;

    if (fetchError || !currentFlag) {
      return res.status(404).json({ error: 'Feature flag not found' });
    }

    // Update feature flag
    const updateData = {};
    if (typeof enabled === 'boolean') updateData.is_enabled = enabled;
    if (typeof active === 'boolean') updateData.is_active = active;
    if (description !== undefined) updateData.description = description;
    if (rollout_percentage !== undefined) updateData.rollout_percentage = rollout_percentage;
    if (target_users !== undefined) updateData.target_users = target_users;
    if (target_roles !== undefined) updateData.target_roles = target_roles;
    if (environments !== undefined) updateData.environments = environments;
    updateData.updated_at = new Date().toISOString();

    const { data: updatedFlag, error: updateError } = await supabase
      .from('feature_flags')
      .update(updateData)
      .eq('id', targetId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating feature flag:', updateError);
      return res.status(500).json({ error: 'Failed to update feature flag' });
    }

    // Log the update
    await supabase
      .from('security_events')
      .insert({
        event_id: require('crypto').randomUUID(),
        type: 'feature_flag_updated',
        severity: 'low',
        user_id: user.id,
        ip_address: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        user_agent: req.headers['user-agent'],
        details: {
          flag_name: currentFlag.name,
          flag_key: currentFlag.key,
          old_enabled: currentFlag.is_enabled,
          new_enabled: enabled,
          timestamp: new Date().toISOString()
        },
        threats: []
      });

    return res.json({
      flag: {
        id: updatedFlag.id,
        key: updatedFlag.key,
        name: updatedFlag.name,
        description: updatedFlag.description,
        enabled: updatedFlag.is_enabled,
        active: updatedFlag.is_active,
        rollout_percentage: updatedFlag.rollout_percentage,
        target_users: updatedFlag.target_users,
        target_roles: updatedFlag.target_roles,
        environments: updatedFlag.environments,
        metadata: updatedFlag.metadata,
        created_at: updatedFlag.created_at,
        updated_at: updatedFlag.updated_at
      }
    });
  } catch (error) {
    console.error('Update feature flag error:', error);
    return res.status(500).json({ error: 'Failed to update feature flag' });
  }
}

async function deleteFeatureFlag(req, res, user) {
  try {
    const { flagId } = req.query;

    if (!flagId) {
      return res.status(400).json({ error: 'Flag ID is required' });
    }

    // Get flag details before deletion
    const flagResult = await db.query('SELECT * FROM feature_flags WHERE id = $1', [flagId]);
    const flag = flagResult.rows[0];
    const fetchError = !flag;

    if (fetchError || !flag) {
      return res.status(404).json({ error: 'Feature flag not found' });
    }

    // Delete feature flag (this will cascade to usage records)
    const { error: deleteError } = await supabase
      .from('feature_flags')
      .delete()
      .eq('id', flagId);

    if (deleteError) {
      console.error('Error deleting feature flag:', deleteError);
      return res.status(500).json({ error: 'Failed to delete feature flag' });
    }

    // Log the deletion
    await supabase
      .from('security_events')
      .insert({
        event_id: require('crypto').randomUUID(),
        type: 'feature_flag_deleted',
        severity: 'medium',
        user_id: user.id,
        ip_address: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        user_agent: req.headers['user-agent'],
        details: {
          flag_name: flag.name,
          flag_key: flag.key,
          was_enabled: flag.is_enabled,
          timestamp: new Date().toISOString()
        },
        threats: []
      });

    return res.json({ success: true });
  } catch (error) {
    console.error('Delete feature flag error:', error);
    return res.status(500).json({ error: 'Failed to delete feature flag' });
  }
}

async function handler(req, res) {
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
        return await getFeatureFlags(req, res);
      case 'POST':
        return await createFeatureFlag(req, res, user);
      case 'PUT':
        return await updateFeatureFlag(req, res, user);
      case 'DELETE':
        return await deleteFeatureFlag(req, res, user);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Feature flags API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = adminRateLimit(handler);
