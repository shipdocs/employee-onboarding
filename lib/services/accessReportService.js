/**
 * Access Report Service
 * Generates detailed access reports for GDPR compliance
 * Provides insights into who has accessed specific user data
 */

const { supabase } = require('../supabase');

class AccessReportService {
  /**
   * Generate comprehensive access report for a specific user
   * @param {string} targetUserId - The user whose data access to report on
   * @param {Date} startDate - Start of reporting period
   * @param {Date} endDate - End of reporting period
   * @param {string} requestedBy - User ID requesting the report
   */
  async generateUserAccessReport(targetUserId, startDate, endDate, requestedBy) {
    try {
      // Validate dates
      if (!startDate || !endDate) {
        const now = new Date();
        endDate = endDate || now;
        startDate = startDate || new Date(now.setMonth(now.getMonth() - 1));
      }

      // Get user information
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, role, created_at')
        .eq('id', targetUserId)
        .single();

      if (userError || !userData) {
        throw new Error('User not found');
      }

      // Get all audit log entries related to this user
      const { data: accessLogs, error: auditError } = await supabase
        .from('audit_log')
        .select(`
          *,
          users!audit_log_user_id_fkey (
            id,
            email,
            first_name,
            last_name,
            role
          )
        `)
        .or(`resource_id.eq.${targetUserId},details->user_id.eq.${targetUserId}`)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });

      if (auditError) {
        throw new Error(`Failed to fetch audit logs: ${auditError.message}`);
      }

      // Categorize access by type
      const accessByType = {
        profile_views: [],
        data_exports: [],
        training_access: [],
        quiz_results_access: [],
        certificate_access: [],
        modifications: [],
        authentication: [],
        other: []
      };

      // Process each log entry
      accessLogs.forEach(log => {
        const accessEntry = {
          timestamp: log.created_at,
          accessed_by: log.users || { email: 'System', role: 'system' },
          action: log.action,
          resource_type: log.resource_type,
          ip_address: log.ip_address,
          user_agent: log.user_agent,
          details: log.details
        };

        // Categorize by action type
        switch (log.action) {
          case 'view_profile':
          case 'list_users':
          case 'view_user':
            accessByType.profile_views.push(accessEntry);
            break;

          case 'export_data':
          case 'bulk_export':
          case 'download_data':
            accessByType.data_exports.push(accessEntry);
            break;

          case 'view_training':
          case 'access_training_session':
          case 'view_progress':
            accessByType.training_access.push(accessEntry);
            break;

          case 'view_quiz_results':
          case 'access_quiz_data':
            accessByType.quiz_results_access.push(accessEntry);
            break;

          case 'view_certificate':
          case 'download_certificate':
          case 'generate_certificate':
            accessByType.certificate_access.push(accessEntry);
            break;

          case 'update_user':
          case 'update_profile':
          case 'change_role':
          case 'reset_password':
            accessByType.modifications.push(accessEntry);
            break;

          case 'login':
          case 'logout':
          case 'verify_mfa':
            accessByType.authentication.push(accessEntry);
            break;

          default:
            accessByType.other.push(accessEntry);
        }
      });

      // Get unique accessors
      const uniqueAccessors = new Map();
      accessLogs.forEach(log => {
        if (log.user_id && log.users) {
          uniqueAccessors.set(log.user_id, {
            id: log.user_id,
            email: log.users.email,
            name: `${log.users.first_name} ${log.users.last_name}`,
            role: log.users.role,
            access_count: (uniqueAccessors.get(log.user_id)?.access_count || 0) + 1
          });
        }
      });

      // Generate report summary
      const report = {
        report_id: `AR-${Date.now()}-${targetUserId.substring(0, 8)}`,
        generated_at: new Date().toISOString(),
        generated_by: requestedBy,
        report_period: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        },
        subject: {
          user_id: userData.id,
          email: userData.email,
          name: `${userData.first_name} ${userData.last_name}`,
          role: userData.role,
          account_created: userData.created_at
        },
        access_summary: {
          total_accesses: accessLogs.length,
          unique_accessors: uniqueAccessors.size,
          profile_views: accessByType.profile_views.length,
          data_exports: accessByType.data_exports.length,
          modifications: accessByType.modifications.length
        },
        accessors_list: Array.from(uniqueAccessors.values()),
        detailed_access: accessByType,
        compliance_info: {
          gdpr_article_15: 'Right of access by the data subject',
          retention_period: '1 year for audit logs',
          data_categories: [
            'Personal identification data',
            'Professional data (role, position)',
            'Training and certification data',
            'System access logs'
          ]
        }
      };

      // Log the report generation
      await this.logReportGeneration(targetUserId, requestedBy, report.report_id);

      return {
        success: true,
        report
      };

    } catch (error) {
      console.error('Access report generation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate data access report for all users in a company
   * @param {string} companyId - Company ID
   * @param {Date} startDate - Start of reporting period
   * @param {Date} endDate - End of reporting period
   * @param {string} requestedBy - User ID requesting the report
   */
  async generateCompanyAccessReport(companyId, startDate, endDate, requestedBy) {
    try {
      // Get all users in the company
      const { data: companyUsers, error: usersError } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, role')
        .eq('company_id', companyId);

      if (usersError) {
        throw new Error('Failed to fetch company users');
      }

      const userIds = companyUsers.map(u => u.id);

      // Get all audit logs for company users
      const { data: accessLogs, error: auditError } = await supabase
        .from('audit_log')
        .select(`
          *,
          users!audit_log_user_id_fkey (
            id,
            email,
            first_name,
            last_name,
            role,
            company_id
          )
        `)
        .in('resource_id', userIds)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });

      if (auditError) {
        throw new Error('Failed to fetch audit logs');
      }

      // Generate aggregated statistics
      const accessStats = {
        total_accesses: accessLogs.length,
        accesses_by_role: {},
        accesses_by_action: {},
        external_accesses: 0,
        internal_accesses: 0
      };

      accessLogs.forEach(log => {
        // Count by accessor role
        const role = log.users?.role || 'system';
        accessStats.accesses_by_role[role] = (accessStats.accesses_by_role[role] || 0) + 1;

        // Count by action
        accessStats.accesses_by_action[log.action] = (accessStats.accesses_by_action[log.action] || 0) + 1;

        // Count internal vs external
        if (log.users?.company_id === companyId) {
          accessStats.internal_accesses++;
        } else {
          accessStats.external_accesses++;
        }
      });

      const report = {
        report_id: `CAR-${Date.now()}-${companyId.substring(0, 8)}`,
        generated_at: new Date().toISOString(),
        generated_by: requestedBy,
        company_id: companyId,
        report_period: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        },
        summary: {
          total_users: companyUsers.length,
          total_accesses: accessStats.total_accesses,
          internal_accesses: accessStats.internal_accesses,
          external_accesses: accessStats.external_accesses
        },
        access_breakdown: {
          by_role: accessStats.accesses_by_role,
          by_action: accessStats.accesses_by_action
        },
        users_accessed: companyUsers.map(user => ({
          ...user,
          access_count: accessLogs.filter(log => log.resource_id === user.id).length
        }))
      };

      await this.logReportGeneration('company:' + companyId, requestedBy, report.report_id);

      return {
        success: true,
        report
      };

    } catch (error) {
      console.error('Company access report error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Log report generation for audit trail
   */
  async logReportGeneration(targetId, requestedBy, reportId) {
    try {
      await supabase
        .from('audit_log')
        .insert({
          user_id: requestedBy,
          action: 'generate_access_report',
          resource_type: 'access_report',
          resource_id: targetId,
          details: {
            report_id: reportId,
            report_type: targetId.startsWith('company:') ? 'company' : 'user'
          }
        });
    } catch (error) {
      console.error('Failed to log report generation:', error);
    }
  }

  /**
   * Format report for download
   */
  formatReportForExport(report, format = 'json') {
    if (format === 'json') {
      return JSON.stringify(report, null, 2);
    }

    if (format === 'csv') {
      // CSV format for access logs
      const headers = ['Timestamp', 'Accessed By', 'Role', 'Action', 'IP Address'];
      const rows = [headers];

      Object.values(report.detailed_access || {}).forEach(category => {
        category.forEach(entry => {
          rows.push([
            entry.timestamp,
            entry.accessed_by.email,
            entry.accessed_by.role,
            entry.action,
            entry.ip_address || ''
          ]);
        });
      });

      return rows.map(row => row.join(',')).join('\n');
    }

    return report;
  }
}

module.exports = new AccessReportService();
