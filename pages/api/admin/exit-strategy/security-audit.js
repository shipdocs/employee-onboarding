/**
 * Exit Strategy Security Audit API Endpoint
 * Runs comprehensive security validation for exit strategy operations
 */

const { exitSecurityAuditService } = require('../../../../lib/services/exitSecurityAuditService');
const { withAudit, logAuditEvent } = require('../../../../lib/middleware/auditMiddleware');
const { requireAdmin } = require('../../../../lib/auth');
const { createAPIHandler, createError } = require('../../../../lib/apiHandler');
const { ACTION_TYPES, RESOURCE_TYPES, SEVERITY_LEVELS } = require('../../../../lib/services/auditService');

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = req.user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const {
      checkAuthentication = true,
      checkAuthorization = true,
      checkDataAccess = true,
      checkAuditTrail = true,
      checkEncryption = true,
      checkAccessLogging = true,
      checkRateLimiting = true,
      checkInputValidation = true,
      checkFileIntegrity = true,
      checkDeletionSecurity = true
    } = req.body;

    // Log security audit start
    await logAuditEvent(
      req,
      ACTION_TYPES.ADMIN_ACTION,
      RESOURCE_TYPES.SYSTEM,
      'security_audit_start',
      {
        action: 'exit_strategy_security_audit_started',
        audit_config: {
          checkAuthentication,
          checkAuthorization,
          checkDataAccess,
          checkAuditTrail,
          checkEncryption,
          checkAccessLogging,
          checkRateLimiting,
          checkInputValidation,
          checkFileIntegrity,
          checkDeletionSecurity
        },
        admin_user: user.email
      }
    );

    // Run security audit
    const auditResults = await exitSecurityAuditService.runSecurityAudit({
      checkAuthentication,
      checkAuthorization,
      checkDataAccess,
      checkAuditTrail,
      checkEncryption,
      checkAccessLogging,
      checkRateLimiting,
      checkInputValidation,
      checkFileIntegrity,
      checkDeletionSecurity
    });

    // Log security audit completion
    await logAuditEvent(
      req,
      ACTION_TYPES.ADMIN_ACTION,
      RESOURCE_TYPES.SYSTEM,
      'security_audit_complete',
      {
        action: 'exit_strategy_security_audit_completed',
        audit_results: {
          duration: auditResults.duration,
          summary: auditResults.summary,
          security_score: auditResults.securityScore,
          checks_count: auditResults.checks.length
        },
        admin_user: user.email
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Security audit completed successfully',
      audit: {
        auditId: auditResults.auditId,
        summary: auditResults.summary,
        securityScore: auditResults.securityScore,
        duration: auditResults.duration,
        checks: auditResults.checks.map(check => ({
          name: check.name,
          category: check.category,
          status: check.status,
          score: check.score,
          duration: check.endTime - check.startTime,
          findings: check.findings.map(finding => ({
            test: finding.test,
            status: finding.status,
            description: finding.description,
            severity: finding.severity
          }))
        })),
        recommendations: this.generateSecurityRecommendations(auditResults),
        complianceStatus: this.assessComplianceStatus(auditResults)
      }
    });

  } catch (error) {
    console.error('Security audit failed:', error);

    // Log security audit failure
    await logAuditEvent(
      req,
      ACTION_TYPES.ADMIN_ACTION,
      RESOURCE_TYPES.SYSTEM,
      'security_audit_failed',
      {
        action: 'exit_strategy_security_audit_failed',
        error: error.message,
        admin_user: req.user?.email
      }
    );

    return res.status(500).json({
      error: 'Internal server error',
      message: 'Security audit failed',
      details: error.message
    });
  }
}

/**
 * Generate security recommendations based on audit results
 */
function generateSecurityRecommendations(auditResults) {
  const recommendations = [];

  auditResults.checks.forEach(check => {
    check.findings.forEach(finding => {
      if (finding.status === 'failed') {
        if (finding.severity === 'critical') {
          recommendations.push({
            type: 'security',
            priority: 'critical',
            category: check.category,
            issue: finding.description,
            recommendation: this.getCriticalSecurityRecommendation(check.category),
            action_required: true
          });
        } else if (finding.severity === 'high') {
          recommendations.push({
            type: 'security',
            priority: 'high',
            category: check.category,
            issue: finding.description,
            recommendation: this.getHighSecurityRecommendation(check.category),
            action_required: true
          });
        }
      } else if (finding.status === 'warning') {
        recommendations.push({
          type: 'improvement',
          priority: 'medium',
          category: check.category,
          issue: finding.description,
          recommendation: this.getImprovementRecommendation(check.category),
          action_required: false
        });
      }
    });
  });

  // Add general recommendations based on security score
  if (auditResults.securityScore < 70) {
    recommendations.push({
      type: 'general',
      priority: 'critical',
      category: 'overall_security',
      issue: `Security score (${auditResults.securityScore}%) below acceptable threshold`,
      recommendation: 'Immediate security review and remediation required before production deployment',
      action_required: true
    });
  } else if (auditResults.securityScore < 85) {
    recommendations.push({
      type: 'general',
      priority: 'high',
      category: 'overall_security',
      issue: `Security score (${auditResults.securityScore}%) needs improvement`,
      recommendation: 'Address identified security issues to improve overall security posture',
      action_required: true
    });
  }

  return recommendations;
}

/**
 * Assess compliance status based on audit results
 */
function assessComplianceStatus(auditResults) {
  const compliance = {
    overall_status: 'compliant',
    gdpr_compliance: 'compliant',
    data_protection: 'compliant',
    audit_requirements: 'compliant',
    access_controls: 'compliant',
    issues: []
  };

  // Check for critical failures that affect compliance
  auditResults.checks.forEach(check => {
    const criticalFindings = check.findings.filter(f => f.severity === 'critical' && f.status === 'failed');

    if (criticalFindings.length > 0) {
      compliance.overall_status = 'non_compliant';

      if (check.category === 'authentication' || check.category === 'authorization') {
        compliance.access_controls = 'non_compliant';
        compliance.issues.push('Access control failures detected');
      }

      if (check.category === 'audit_trail') {
        compliance.audit_requirements = 'non_compliant';
        compliance.issues.push('Audit trail integrity issues detected');
      }

      if (check.category === 'encryption' || check.category === 'data_access') {
        compliance.data_protection = 'non_compliant';
        compliance.gdpr_compliance = 'non_compliant';
        compliance.issues.push('Data protection failures detected');
      }
    }
  });

  // Check security score for overall compliance
  if (auditResults.securityScore < 80) {
    compliance.overall_status = 'non_compliant';
    compliance.issues.push(`Security score (${auditResults.securityScore}%) below compliance threshold`);
  }

  return compliance;
}

/**
 * Get security recommendations by category
 */
function getCriticalSecurityRecommendation(category) {
  const recommendations = {
    authentication: 'Implement multi-factor authentication and strengthen session management',
    authorization: 'Review and fix role-based access control implementation',
    encryption: 'Implement end-to-end encryption for all sensitive data operations',
    audit_trail: 'Fix audit logging system to ensure complete audit trail',
    data_access: 'Implement strict data access controls and monitoring'
  };
  return recommendations[category] || 'Review and fix critical security issue immediately';
}

function getHighSecurityRecommendation(category) {
  const recommendations = {
    rate_limiting: 'Implement rate limiting to prevent abuse of export operations',
    input_validation: 'Strengthen input validation and sanitization',
    file_integrity: 'Implement comprehensive file integrity checking',
    access_logging: 'Enhance access logging with detailed user activity tracking'
  };
  return recommendations[category] || 'Address high-priority security issue';
}

function getImprovementRecommendation(category) {
  const recommendations = {
    rate_limiting: 'Consider implementing more sophisticated rate limiting algorithms',
    monitoring: 'Enhance monitoring and alerting for security events',
    documentation: 'Improve security documentation and procedures'
  };
  return recommendations[category] || 'Consider security improvement measures';
}

// Create the standardized handler with error handling
const apiHandler = createAPIHandler(handler, {
  allowedMethods: ['POST']
});

// Export with authentication and audit logging
module.exports = withAudit(
  requireAdmin(apiHandler),
  {
    action: ACTION_TYPES.ADMIN_ACTION,
    resourceType: RESOURCE_TYPES.SYSTEM,
    auditPath: true,
    severityLevel: SEVERITY_LEVELS.HIGH
  }
);
