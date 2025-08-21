/**
 * Compliance Status API Tests
 * 
 * Tests for the new compliance status endpoint to ensure it provides
 * accurate compliance information for enterprise customers.
 */

const request = require('supertest');
const app = require('../server');

describe('Compliance Status API', () => {
  let adminToken;
  let managerToken;

  beforeAll(async () => {
    // Set up test tokens (in a real test, you'd authenticate properly)
    adminToken = 'test-admin-token';
    managerToken = 'test-manager-token';
  });

  describe('GET /api/compliance/status', () => {
    it('should return compliance status for admin users', async () => {
      const response = await request(app)
        .get('/api/compliance/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('compliance_framework');
      expect(response.body.data.compliance_framework).toHaveProperty('iso27001');
      expect(response.body.data.compliance_framework).toHaveProperty('nis2');
      expect(response.body.data.compliance_framework).toHaveProperty('gdpr');
    });

    it('should return compliance status for manager users', async () => {
      const response = await request(app)
        .get('/api/compliance/status')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.security_metrics).toHaveProperty('critical_vulnerabilities');
      expect(response.body.data.security_metrics.critical_vulnerabilities).toBe(0);
    });

    it('should include all required compliance standards', async () => {
      const response = await request(app)
        .get('/api/compliance/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const { compliance_framework } = response.body.data;
      
      // ISO 27001 compliance
      expect(compliance_framework.iso27001.status).toBe('COMPLIANT');
      expect(compliance_framework.iso27001.controls_implemented).toContain('A.14.2 - Security in development and support processes');
      
      // NIS2 compliance
      expect(compliance_framework.nis2.status).toBe('COMPLIANT');
      expect(compliance_framework.nis2.article_21_compliance).toBe(true);
      expect(compliance_framework.nis2.incident_response_ready).toBe(true);
      
      // GDPR compliance
      expect(compliance_framework.gdpr.status).toBe('COMPLIANT');
      expect(compliance_framework.gdpr.privacy_by_design).toBe(true);
      expect(compliance_framework.gdpr.breach_notification_ready).toBe(true);
    });

    it('should include security metrics', async () => {
      const response = await request(app)
        .get('/api/compliance/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const { security_metrics } = response.body.data;
      
      expect(security_metrics).toHaveProperty('critical_vulnerabilities');
      expect(security_metrics).toHaveProperty('high_vulnerabilities');
      expect(security_metrics).toHaveProperty('security_scan_frequency');
      expect(security_metrics).toHaveProperty('incident_response_sla');
      
      expect(security_metrics.security_scan_frequency).toBe('DAILY');
      expect(security_metrics.incident_response_sla).toBe('24_HOURS');
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/compliance/status')
        .expect(401);
    });
  });

  describe('GET /api/compliance/reports', () => {
    it('should return compliance reports for admin users', async () => {
      const response = await request(app)
        .get('/api/compliance/reports')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('quarterly_reports');
      expect(response.body.data).toHaveProperty('security_assessments');
      expect(response.body.data).toHaveProperty('incident_records');
      expect(response.body.data).toHaveProperty('audit_evidence');
    });

    it('should include quarterly report information', async () => {
      const response = await request(app)
        .get('/api/compliance/reports')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const { quarterly_reports } = response.body.data;
      
      expect(Array.isArray(quarterly_reports)).toBe(true);
      if (quarterly_reports.length > 0) {
        const report = quarterly_reports[0];
        expect(report).toHaveProperty('period');
        expect(report).toHaveProperty('standards');
        expect(report.standards).toContain('ISO27001');
        expect(report.standards).toContain('NIS2');
        expect(report.standards).toContain('GDPR');
      }
    });

    it('should require admin role', async () => {
      await request(app)
        .get('/api/compliance/reports')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(403);
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/compliance/reports')
        .expect(401);
    });
  });
});

describe('Compliance Framework Integration', () => {
  it('should demonstrate enterprise readiness', async () => {
    const response = await request(app)
      .get('/api/compliance/status')
      .set('Authorization', `Bearer test-admin-token`)
      .expect(200);

    const { data } = response.body;
    
    // Verify enterprise compliance features
    expect(data.audit_readiness.documentation_complete).toBe(true);
    expect(data.audit_readiness.evidence_collection).toBe('AUTOMATED');
    expect(data.audit_readiness.audit_trail_retention).toBe('7_YEARS');
    expect(data.audit_readiness.compliance_reports_available).toBe(true);
    
    // Verify security posture
    expect(data.security_metrics.critical_vulnerabilities).toBe(0);
    expect(data.security_metrics.security_scan_frequency).toBe('DAILY');
    
    // Verify regulatory compliance
    expect(data.compliance_framework.iso27001.status).toBe('COMPLIANT');
    expect(data.compliance_framework.nis2.status).toBe('COMPLIANT');
    expect(data.compliance_framework.gdpr.status).toBe('COMPLIANT');
  });
});
