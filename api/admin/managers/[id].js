// Vercel API Route: /api/admin/managers/[id].js - Admin individual manager management
const { supabase } = require('../../../lib/supabase');
const { authenticateRequest } = require('../../../lib/auth');
const { generateMagicToken } = require('../../../lib/auth');
const bcrypt = require('bcrypt');
const { adminRateLimit } = require('../../../lib/rateLimit');

async function handler(req, res) {
  // Verify admin authentication with proper blacklist checking
  const user = await authenticateRequest(req);
  if (!user) {
    return res.status(401).json({ error: 'Access token required' });
  }

  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  // Assign user to req.user for use in other functions
  req.user = user;

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Manager ID is required' });
  }

  if (req.method === 'GET') {
    return await getManager(req, res, id);
  } else if (req.method === 'PATCH') {
    return await updateManager(req, res, id);
  } else if (req.method === 'DELETE') {
    return await deleteManager(req, res, id);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function getManager(req, res, id) {
  try {
    const { data: manager, error } = await supabase
      .from('users')
      .select(`
        id,
        email,
        first_name,
        last_name,
        position,
        preferred_language,
        status,
        is_active,
        created_at,
        updated_at
      `)
      .eq('id', id)
      .eq('role', 'manager')
      .single();

    if (error || !manager) {
      return res.status(404).json({ error: 'Manager not found' });
    }

    // Get manager permissions
    const { data: permissions, error: permError } = await supabase
      .from('manager_permissions')
      .select('*')
      .eq('manager_id', id);

    if (permError) {
      // console.error('Error fetching permissions:', permError);
    }

    // Log admin action
    await supabase
      .from('audit_log')
      .insert({
        user_id: req.user.userId,
        action: 'view_manager',
        resource_type: 'manager_management',
        resource_id: id,
        details: { manager_email: manager.email }
      });

    // Extract permission keys for the frontend
    const permissionKeys = permissions ? permissions.map(p => p.permission_key) : [];

    res.json({
      manager: {
        ...manager
      },
      permissions: permissionKeys
    });
  } catch (_error) {
    // console.error('Get manager error:', _error);
    res.status(500).json({ error: 'Failed to fetch manager' });
  }
}

async function updateManager(req, res, id) {
  try {
    const {
      firstName,
      lastName,
      position,
      preferredLanguage,
      status,
      is_active,
      password,
      permissions
    } = req.body;

    // Check if manager exists
    const { data: existingManager, error: checkError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name')
      .eq('id', id)
      .eq('role', 'manager')
      .single();

    if (checkError || !existingManager) {
      return res.status(404).json({ error: 'Manager not found' });
    }

    // Prepare update data
    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (firstName !== undefined) updateData.first_name = firstName;
    if (lastName !== undefined) updateData.last_name = lastName;
    if (position !== undefined) updateData.position = position;
    if (preferredLanguage !== undefined) updateData.preferred_language = preferredLanguage;
    if (status !== undefined) updateData.status = status;
    if (is_active !== undefined) updateData.is_active = is_active;

    // Handle password update
    if (password) {
      // Enhanced password validation
      const EnhancedPasswordValidator = require('../../../lib/security/EnhancedPasswordValidator');
      const PasswordHistoryService = require('../../../lib/security/PasswordHistoryService');

      const passwordValidator = new EnhancedPasswordValidator();
      const userInfo = {
        firstName: existingManager.first_name,
        lastName: existingManager.last_name,
        email: existingManager.email,
        username: existingManager.email.split('@')[0]
      };

      const passwordValidation = passwordValidator.validate(password, {
        userInfo,
        minStrengthLevel: 'good' // Require good or higher strength for managers
      });

      if (!passwordValidation.valid) {
        return res.status(400).json({
          error: passwordValidation.error,
          strength: passwordValidation.strength,
          entropy: passwordValidation.entropy
        });
      }

      // Check password history to prevent reuse
      const passwordHistoryService = new PasswordHistoryService();
      const historyValidation = await passwordHistoryService.validatePasswordHistory(
        id,
        password,
        { checkLastN: 12 } // Check last 12 passwords
      );

      if (!historyValidation.valid) {
        return res.status(400).json({
          error: historyValidation.error,
          lastUsed: historyValidation.lastUsed
        });
      }

      const saltRounds = 12;
      updateData.password_hash = await bcrypt.hash(password, saltRounds);

      // Store password for history tracking after successful update
      updateData._passwordForHistory = password;
    }

    // Update manager
    const { data: updatedManager, error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      // console.error('Error updating manager:', updateError);
      return res.status(500).json({ error: 'Failed to update manager' });
    }

    // Add password to history if password was updated
    if (password && updateData._passwordForHistory) {
      const PasswordHistoryService = require('../../../lib/security/PasswordHistoryService');
      const passwordHistoryService = new PasswordHistoryService();
      const historyResult = await passwordHistoryService.addPasswordToHistory(
        id,
        updateData._passwordForHistory,
        req
      );

      if (!historyResult.success) {
        console.error('Failed to add password to history:', historyResult.error);
        // Don't fail the update, just log the error
      }

      // Clean up the temporary field
      delete updateData._passwordForHistory;
    }

    // Update permissions if provided
    if (permissions && Array.isArray(permissions)) {
      // Delete existing permissions
      await supabase
        .from('manager_permissions')
        .delete()
        .eq('manager_id', id);

      // Insert new permissions
      if (permissions.length > 0) {
        const permissionInserts = permissions.map(permission => ({
          manager_id: id,
          permission_key: permission,
          permission_value: true,
          granted_by: req.user.userId
        }));

        const { error: permError } = await supabase
          .from('manager_permissions')
          .insert(permissionInserts);

        if (permError) {
          // console.error('Error updating permissions:', permError);
        }
      }
    }

    // Log admin action
    await supabase
      .from('audit_log')
      .insert({
        user_id: req.user.userId,
        action: 'update_manager',
        resource_type: 'manager_management',
        resource_id: id,
        details: {
          manager_email: existingManager.email,
          changes: updateData,
          permissions_updated: !!permissions
        }
      });

    res.json({
      manager: {
        id: updatedManager.id,
        email: updatedManager.email,
        first_name: updatedManager.first_name,
        last_name: updatedManager.last_name,
        position: updatedManager.position,
        status: updatedManager.status,
        is_active: updatedManager.is_active,
        updated_at: updatedManager.updated_at
      },
      message: 'Manager updated successfully'
    });
  } catch (_error) {
    // console.error('Update manager error:', _error);
    res.status(500).json({ error: 'Failed to update manager' });
  }
}

async function deleteManager(req, res, id) {
  try {
    // Check if manager exists
    const { data: existingManager, error: checkError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name')
      .eq('id', id)
      .eq('role', 'manager')
      .single();

    if (checkError || !existingManager) {
      return res.status(404).json({ error: 'Manager not found' });
    }

    // Check if manager has any active crew members or pending reviews
    const { data: activeCrew, error: crewError } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'crew')
      .in('status', ['active', 'pending']);

    if (crewError) {
      // console.error('Error checking crew members:', crewError);
    }

    // For now, allow deletion but log it as a warning
    if (activeCrew && activeCrew.length > 0) {

    }

    // Delete manager permissions first (due to foreign key constraint)
    await supabase
      .from('manager_permissions')
      .delete()
      .eq('manager_id', id);

    // Delete manager
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (deleteError) {
      // console.error('Error deleting manager:', deleteError);
      return res.status(500).json({ error: 'Failed to delete manager' });
    }

    // Log admin action
    await supabase
      .from('audit_log')
      .insert({
        user_id: req.user.userId,
        action: 'delete_manager',
        resource_type: 'manager_management',
        resource_id: id,
        details: {
          manager_email: existingManager.email,
          manager_name: `${existingManager.first_name} ${existingManager.last_name}`
        }
      });

    res.json({
      message: 'Manager deleted successfully'
    });
  } catch (_error) {
    // console.error('Delete manager error:', _error);
    res.status(500).json({ error: 'Failed to delete manager' });
  }
}

module.exports = adminRateLimit(handler);
