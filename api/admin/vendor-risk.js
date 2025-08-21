/**
 * Vendor Risk Assessment API
 * Provides vendor risk data and assessment information for NIS2 compliance
 */

const db = require('../../lib/database-direct');
const { authenticateRequest } = require('../../lib/auth');
const { applyApiSecurityHeaders } = require('../../lib/securityHeaders');
const { adminRateLimit } = require('../../lib/rateLimit');

module.exports = async function handler(req, res) {
  // Apply security headers
  applyApiSecurityHeaders(res);

  // Apply rate limiting
  const rateLimitResult = await adminRateLimit(req, res);
  if (!rateLimitResult.success) {
    return res.status(429).json({
      error: 'Too many requests',
      retryAfter: rateLimitResult.retryAfter
    });
  }

  try {
    // Authenticate user and check admin role
    const user = await authenticateRequest(req);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (req.method === 'GET') {
      return await getVendorRiskData(req, res, user);
    } else if (req.method === 'POST') {
      return await updateVendorRisk(req, res, user);
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Vendor risk API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get vendor risk assessment data
 */
async function getVendorRiskData(req, res, user) {
  try {
    // Get vendor risk assessments from database
    const { data: vendorRisks, error: vendorError } = await supabase
      .from('vendor_risk_assessments')
      .select('*')
      .order('last_assessment', { ascending: false });

    // If table doesn't exist, return mock data for now
    if (vendorError && vendorError.code === '42P01') {
      return res.status(200).json(getMockVendorData());
    }

    if (vendorError) {
      console.error('Error fetching vendor risks:', vendorError);
      return res.status(500).json({ error: 'Failed to fetch vendor risk data' });
    }

    // Calculate summary statistics
    const summary = calculateRiskSummary(vendorRisks || []);

    // Log audit event
    await supabase
      .from('audit_log')
      .insert({
        user_id: user.id,
        action: 'view_vendor_risk_dashboard',
        resource_type: 'vendor_risk',
        details: { vendorCount: vendorRisks?.length || 0 },
        ip_address: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        user_agent: req.headers['user-agent']
      });

    res.status(200).json({
      success: true,
      summary,
      vendors: vendorRisks || [],
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in getVendorRiskData:', error);
    res.status(500).json({ error: 'Failed to fetch vendor risk data' });
  }
}

/**
 * Update vendor risk assessment
 */
async function updateVendorRisk(req, res, user) {
  try {
    const { vendorId, riskScore, riskLevel, notes, nextReview } = req.body;

    if (!vendorId || !riskScore || !riskLevel) {
      return res.status(400).json({
        error: 'Missing required fields: vendorId, riskScore, riskLevel'
      });
    }

    // Update vendor risk assessment
    const { data: updatedVendor, error: updateError } = await supabase
      .from('vendor_risk_assessments')
      .update({
        risk_score: riskScore,
        risk_level: riskLevel,
        notes,
        next_review: nextReview,
        last_assessment: new Date().toISOString(),
        updated_by: user.id
      })
      .eq('vendor_id', vendorId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating vendor risk:', updateError);
      return res.status(500).json({ error: 'Failed to update vendor risk assessment' });
    }

    // Log audit event
    await supabase
      .from('audit_log')
      .insert({
        user_id: user.id,
        action: 'update_vendor_risk_assessment',
        resource_type: 'vendor_risk',
        resource_id: vendorId,
        details: {
          vendorId,
          oldRiskLevel: req.body.oldRiskLevel,
          newRiskLevel: riskLevel,
          riskScore
        },
        ip_address: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        user_agent: req.headers['user-agent']
      });

    res.status(200).json({
      success: true,
      vendor: updatedVendor,
      message: 'Vendor risk assessment updated successfully'
    });

  } catch (error) {
    console.error('Error in updateVendorRisk:', error);
    res.status(500).json({ error: 'Failed to update vendor risk assessment' });
  }
}

/**
 * Calculate risk summary statistics
 */
function calculateRiskSummary(vendors) {
  const summary = {
    totalVendors: vendors.length,
    criticalRisk: 0,
    highRisk: 0,
    mediumRisk: 0,
    lowRisk: 0,
    lastAssessment: null,
    complianceScore: 0
  };

  if (vendors.length === 0) {
    return summary;
  }

  // Count risk levels
  vendors.forEach(vendor => {
    switch (vendor.risk_level) {
      case 'CRITICAL':
        summary.criticalRisk++;
        break;
      case 'HIGH':
        summary.highRisk++;
        break;
      case 'MEDIUM':
        summary.mediumRisk++;
        break;
      case 'LOW':
        summary.lowRisk++;
        break;
    }
  });

  // Find most recent assessment
  summary.lastAssessment = vendors.reduce((latest, vendor) => {
    const assessmentDate = new Date(vendor.last_assessment);
    return assessmentDate > new Date(latest) ? vendor.last_assessment : latest;
  }, vendors[0].last_assessment);

  // Calculate compliance score (simplified)
  const compliantVendors = vendors.filter(v =>
    v.compliance_status &&
    v.compliance_status.soc2 === 'valid' &&
    v.compliance_status.gdpr === 'valid'
  ).length;

  summary.complianceScore = Math.round((compliantVendors / vendors.length) * 100);

  return summary;
}

/**
 * Mock vendor data for development/demo
 */
function getMockVendorData() {
  return {
    success: true,
    summary: {
      totalVendors: 4,
      criticalRisk: 0,
      highRisk: 1,
      mediumRisk: 1,
      lowRisk: 2,
      lastAssessment: new Date().toISOString(),
      complianceScore: 94
    },
    vendors: [
      {
        id: 'supabase',
        vendor_id: 'supabase',
        name: 'Supabase Inc.',
        service: 'Database & Storage',
        tier: 1,
        risk_score: 8.0,
        risk_level: 'HIGH',
        status: 'active',
        last_assessment: new Date().toISOString(),
        next_review: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        data_access: 'All user data, PII',
        criticality: 'CRITICAL',
        compliance_status: {
          soc2: { status: 'valid', expires: '2025-03-15' },
          gdpr: { status: 'valid', expires: null },
          iso27001: { status: 'valid', expires: '2025-06-30' }
        },
        performance_metrics: {
          availability: 99.9,
          response_time: 45,
          incidents: 0,
          sla_compliance: 98.5
        }
      },
      {
        id: 'vercel',
        vendor_id: 'vercel',
        name: 'Vercel Inc.',
        service: 'Application Hosting',
        tier: 1,
        risk_score: 5.7,
        risk_level: 'MEDIUM',
        status: 'active',
        last_assessment: new Date().toISOString(),
        next_review: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
        data_access: 'Application code, logs',
        criticality: 'CRITICAL',
        compliance_status: {
          soc2: { status: 'valid', expires: '2025-12-31' },
          gdpr: { status: 'valid', expires: null },
          iso27001: { status: 'valid', expires: '2025-08-15' }
        },
        performance_metrics: {
          availability: 99.99,
          response_time: 120,
          incidents: 0,
          sla_compliance: 99.8
        }
      },
      {
        id: 'cloudflare',
        vendor_id: 'cloudflare',
        name: 'Cloudflare Inc.',
        service: 'CDN & Security',
        tier: 1,
        risk_score: 3.3,
        risk_level: 'LOW',
        status: 'active',
        last_assessment: new Date().toISOString(),
        next_review: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
        data_access: 'Traffic metadata',
        criticality: 'HIGH',
        compliance_status: {
          soc2: { status: 'valid', expires: '2025-09-30' },
          gdpr: { status: 'valid', expires: null },
          iso27001: { status: 'valid', expires: '2025-11-15' }
        },
        performance_metrics: {
          availability: 100,
          response_time: 15,
          incidents: 0,
          sla_compliance: 100
        }
      },
      {
        id: 'mailersend',
        vendor_id: 'mailersend',
        name: 'MailerSend',
        service: 'Email Delivery',
        tier: 1,
        risk_score: 3.3,
        risk_level: 'LOW',
        status: 'active',
        last_assessment: new Date().toISOString(),
        next_review: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
        data_access: 'Email addresses',
        criticality: 'MEDIUM',
        compliance_status: {
          soc2: { status: 'pending', expires: null },
          gdpr: { status: 'valid', expires: null },
          iso27001: { status: 'not_required', expires: null }
        },
        performance_metrics: {
          availability: 99.8,
          response_time: 250,
          incidents: 1,
          sla_compliance: 97.2
        }
      }
    ],
    lastUpdated: new Date().toISOString()
  };
}
