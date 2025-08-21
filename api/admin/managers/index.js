// Vercel API Route: /api/admin/managers/index.js - Admin manager management
const db = require('../../../lib/database-direct');
const { authenticateRequest, generateMagicToken } = require('../../../lib/auth');
const { unifiedEmailService } = require('../../../lib/unifiedEmailService');
const bcrypt = require('bcrypt');
const { validators, sanitizers, validateObject } = require('../../../lib/validation');
const { createAPIHandler, createError, createValidationError, createDatabaseError } = require('../../../lib/apiHandler');
const { withBodySizeLimit } = require('../../../lib/middleware/bodySizeLimit');
const { logAdminOperation } = require('../../../lib/securityLogger');
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

  if (req.method === 'GET') {
    return await getManagers(req, res);
  } else if (req.method === 'POST') {
    return await createManager(req, res);
  } else {
    throw createError('VALIDATION_INVALID_METHOD', `Method ${req.method} not allowed`);
  }
}

async function getManagers(req, res) {
  try {
    // Use helpers method for secure database access
    const managers = await supabase.helpers.select('users',
      { role: 'manager' },
      {
        columns: ['id', 'email', 'first_name', 'last_name', 'position', 'preferred_language', 'status', 'is_active', 'created_at', 'updated_at'],
        orderBy: { 'created_at': 'DESC' }
      }
    );

    if (!managers) {
      return res.status(500).json({ error: 'Failed to fetch managers' });
    }

    // Get manager permissions (if there are any managers)
    let permissions = [];
    if (managers.length > 0) {
      const managerIds = managers.map(m => m.id);
      // For now, skip permissions since the table might not exist or be properly set up
      // permissions = await supabase.helpers.select('manager_permissions',
      //   { manager_id: { $in: managerIds } }
      // );
    }

    // Combine managers with their permissions
    const managersWithPermissions = managers.map(manager => ({
      ...manager,
      permissions: permissions?.filter(p => p.manager_id === manager.id) || []
    }));

    // Log admin action (skip for now to avoid compatibility issues)
    // await supabase.helpers.insert('audit_log', {
    //   user_id: req.user.userId,
    //   action: 'view_managers',
    //   resource_type: 'manager_management',
    //   details: JSON.stringify({ count: managers.length })
    // });

    res.json({
      managers: managersWithPermissions,
      total: managers.length
    });
  } catch (_error) {
    // console.error('Get managers error:', _error);
    res.status(500).json({ error: 'Failed to fetch managers' });
  }
}

async function createManager(req, res) {
  try {
    // Validate request body
    const validationSchema = {
      email: {
        required: true,
        type: 'email',
        options: {}
      },
      firstName: {
        required: true,
        type: 'string',
        options: {
          minLength: 1,
          maxLength: 100,
          pattern: /^[a-zA-Z\s\-']+$/,
          patternError: 'First name can only contain letters, spaces, hyphens and apostrophes'
        }
      },
      lastName: {
        required: true,
        type: 'string',
        options: {
          minLength: 1,
          maxLength: 100,
          pattern: /^[a-zA-Z\s\-']+$/,
          patternError: 'Last name can only contain letters, spaces, hyphens and apostrophes'
        }
      },
      position: {
        required: false,
        type: 'string',
        options: {
          minLength: 1,
          maxLength: 100
        }
      },
      password: {
        required: true,
        type: 'password',
        options: {}
      },
      permissions: {
        required: false,
        type: 'custom',
        custom: (value) => {
          if (!Array.isArray(value)) return 'Permissions must be an array';
          const validPermissions = [
            'view_crew_list',
            'manage_crew_members',
            'review_quiz_results',
            'approve_training_completion',
            'view_certificates',
            'regenerate_certificates',
            'view_compliance_reports',
            'export_training_data',
            'manage_workflow_instances',
            'override_deadlines'
          ];
          for (const perm of value) {
            if (!validPermissions.includes(perm)) {
              return `Invalid permission: ${perm}`;
            }
          }
          return true;
        }
      },
      preferredLanguage: {
        required: false,
        type: 'enum',
        options: {
          allowedValues: ['en', 'nl']
        }
      }
    };

    const validationErrors = validateObject(req.body, validationSchema);
    if (validationErrors.length > 0) {
      throw createValidationError('Validation failed', { errors: validationErrors });
    }

    const {
      email,
      firstName,
      lastName,
      position,
      password,
      permissions = [],
      preferredLanguage
    } = req.body;

    // Check if email already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Enhanced password validation
    const EnhancedPasswordValidator = require('../../../lib/security/EnhancedPasswordValidator');
    const PasswordHistoryService = require('../../../lib/security/PasswordHistoryService');

    const passwordValidator = new EnhancedPasswordValidator();
    const userInfo = {
      firstName,
      lastName,
      email,
      username: email.split('@')[0]
    };

    const passwordValidation = passwordValidator.validate(password, {
      userInfo,
      minStrengthLevel: 'good' // Require good or higher strength for managers
    });

    if (!passwordValidation.valid) {
      throw createValidationError(passwordValidation.error, {
        strength: passwordValidation.strength,
        entropy: passwordValidation.entropy
      });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create manager user with sanitized values
    const { data: newManager, error: createError } = await supabase
      .from('users')
      .insert({
        email: email, // Already validated and normalized
        first_name: sanitizers.text(firstName, { maxLength: 100 }),
        last_name: sanitizers.text(lastName, { maxLength: 100 }),
        role: 'manager',
        position: sanitizers.text(position || 'Manager', { maxLength: 100 }),
        status: 'fully_completed',
        is_active: true,
        password_hash: passwordHash,
        preferred_language: preferredLanguage || 'en'
      })
      .select()
      .single();

    if (createError) {
      // console.error('Error creating manager:', createError);
      return res.status(500).json({ error: 'Failed to create manager' });
    }

    // Add initial password to history
    const passwordHistoryService = new PasswordHistoryService();
    const historyResult = await passwordHistoryService.addPasswordToHistory(
      newManager.id,
      password,
      req
    );

    if (!historyResult.success) {
      console.error('Failed to add initial password to history:', historyResult.error);
      // Don't fail the manager creation, just log the error
    }

    // Set default permissions if none provided
    const defaultPermissions = [
      'view_crew_list',
      'manage_crew_members',
      'review_quiz_results',
      'approve_training_completion',
      'view_certificates',
      'regenerate_certificates',
      'view_compliance_reports',
      'export_training_data'
    ];

    const permissionsToSet = permissions.length > 0 ? permissions : defaultPermissions;

    // Insert manager permissions
    const permissionInserts = permissionsToSet.map(permission => ({
      manager_id: newManager.id,
      permission_key: permission,
      permission_value: true,
      granted_by: req.user.userId
    }));

    const { error: permError } = await supabase
      .from('manager_permissions')
      .insert(permissionInserts);

    if (permError) {
      // console.error('Error setting permissions:', permError);
      // Don't fail the request, just log the error
    }

    // Log admin action to audit log
    await supabase
      .from('audit_log')
      .insert({
        user_id: req.user.userId,
        action: 'create_manager',
        resource_type: 'manager_management',
        resource_id: newManager.id.toString(),
        details: {
          manager_email: email,
          manager_name: `${firstName} ${lastName}`,
          permissions: permissionsToSet
        }
      });

    // Log security event for admin operation
    const clientIP = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    await logAdminOperation(
      req.user.userId,
      req.user.email,
      'create_manager',
      newManager.id,
      {
        manager_email: email,
        manager_name: `${firstName} ${lastName}`,
        permissions_granted: permissionsToSet
      },
      clientIP,
      userAgent
    );

    // Generate and store magic link token
    const token = generateMagicToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 3); // 3 hours from now

    // Store magic link in database
    const { error: linkError } = await supabase
      .from('magic_links')
      .insert({
        email: newManager.email,
        token,
        expires_at: expiresAt.toISOString()
      });

    if (linkError) {
      // console.error('Error creating magic link:', linkError);
      // Continue anyway - manager is already created
    }

    // Send welcome email to the new manager
    try {

      await unifiedEmailService.sendManagerWelcomeEmailWithToken(newManager, password, token, newManager.preferred_language);

    } catch (emailError) {
      // console.error('Error sending welcome email to manager:', emailError);
      // Don't fail the manager creation if email fails
    }

    res.status(201).json({
      manager: {
        id: newManager.id,
        email: newManager.email,
        first_name: newManager.first_name,
        last_name: newManager.last_name,
        position: newManager.position,
        status: newManager.status,
        is_active: newManager.is_active,
        created_at: newManager.created_at
      },
      message: 'Manager created successfully'
    });
  } catch (_error) {
    console.error('Create manager error:', _error);
    res.status(500).json({ error: 'Failed to create manager', debug: _error.message });
  }
}

// Create the standardized handler with error handling
const apiHandler = createAPIHandler(handler, {
  allowedMethods: ['GET', 'POST']
});

// Export with body size limit
module.exports = adminRateLimit(withBodySizeLimit(apiHandler, 'api'));
