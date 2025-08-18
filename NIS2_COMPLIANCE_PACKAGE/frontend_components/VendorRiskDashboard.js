/**
 * Vendor Risk Dashboard
 * Monitors and displays vendor risk assessments and security status
 */

import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { useTranslation } from 'react-i18next';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  FileText,
  Calendar,
  Activity,
  Database,
  Globe,
  Mail,
  Server
} from 'lucide-react';

const VendorRiskDashboard = () => {
  const { t } = useTranslation(['admin', 'common']);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [timeRange, setTimeRange] = useState('30d');

  // Fetch vendor risk data from API
  const { data: vendorData, isLoading, error, refetch } = useQuery(
    ['vendor-risk', timeRange],
    () => fetch('/api/admin/vendor-risk', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    }).then(res => res.json()),
    {
      refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
      staleTime: 2 * 60 * 1000 // Consider data stale after 2 minutes
    }
  );

  // Fallback mock data for development
  const fallbackData = {
    summary: {
      totalVendors: 7,
      criticalRisk: 1,
      highRisk: 1,
      mediumRisk: 2,
      lowRisk: 3,
      lastAssessment: '2025-01-18T10:00:00Z',
      complianceScore: 94
    },
    vendors: [
      {
        id: 'supabase',
        name: 'Supabase Inc.',
        service: 'Database & Storage',
        tier: 1,
        riskScore: 8.0,
        riskLevel: 'HIGH',
        status: 'active',
        lastAssessment: '2025-01-18T10:00:00Z',
        nextReview: '2025-04-18T10:00:00Z',
        dataAccess: 'All user data, PII',
        criticality: 'CRITICAL',
        compliance: {
          soc2: { status: 'valid', expires: '2025-03-15' },
          gdpr: { status: 'valid', expires: null },
          iso27001: { status: 'valid', expires: '2025-06-30' }
        },
        metrics: {
          availability: 99.9,
          responseTime: 45,
          incidents: 0,
          slaCompliance: 98.5
        },
        icon: Database
      },
      {
        id: 'vercel',
        name: 'Vercel Inc.',
        service: 'Application Hosting',
        tier: 1,
        riskScore: 5.7,
        riskLevel: 'MEDIUM',
        status: 'active',
        lastAssessment: '2025-01-18T10:00:00Z',
        nextReview: '2025-07-18T10:00:00Z',
        dataAccess: 'Application code, logs',
        criticality: 'CRITICAL',
        compliance: {
          soc2: { status: 'valid', expires: '2025-12-31' },
          gdpr: { status: 'valid', expires: null },
          iso27001: { status: 'valid', expires: '2025-08-15' }
        },
        metrics: {
          availability: 99.99,
          responseTime: 120,
          incidents: 0,
          slaCompliance: 99.8
        },
        icon: Server
      },
      {
        id: 'cloudflare',
        name: 'Cloudflare Inc.',
        service: 'CDN & Security',
        tier: 1,
        riskScore: 3.3,
        riskLevel: 'LOW',
        status: 'active',
        lastAssessment: '2025-01-18T10:00:00Z',
        nextReview: '2025-07-18T10:00:00Z',
        dataAccess: 'Traffic metadata',
        criticality: 'HIGH',
        compliance: {
          soc2: { status: 'valid', expires: '2025-09-30' },
          gdpr: { status: 'valid', expires: null },
          iso27001: { status: 'valid', expires: '2025-11-15' }
        },
        metrics: {
          availability: 100,
          responseTime: 15,
          incidents: 0,
          slaCompliance: 100
        },
        icon: Globe
      },
      {
        id: 'mailersend',
        name: 'MailerSend',
        service: 'Email Delivery',
        tier: 1,
        riskScore: 3.3,
        riskLevel: 'LOW',
        status: 'active',
        lastAssessment: '2025-01-18T10:00:00Z',
        nextReview: '2025-07-18T10:00:00Z',
        dataAccess: 'Email addresses',
        criticality: 'MEDIUM',
        compliance: {
          soc2: { status: 'pending', expires: null },
          gdpr: { status: 'valid', expires: null },
          iso27001: { status: 'not_required', expires: null }
        },
        metrics: {
          availability: 99.8,
          responseTime: 250,
          incidents: 1,
          slaCompliance: 97.2
        },
        icon: Mail
      }
    ]
  };

  // Use API data if available, otherwise fallback to mock data
  const displayData = vendorData || fallbackData;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
          <span className="text-red-800">Failed to load vendor risk data. Using fallback data.</span>
        </div>
      </div>
    );
  }

  const getRiskColor = (level) => {
    switch (level) {
      case 'CRITICAL':
        return 'text-red-600 bg-red-100';
      case 'HIGH':
        return 'text-orange-600 bg-orange-100';
      case 'MEDIUM':
        return 'text-yellow-600 bg-yellow-100';
      case 'LOW':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getComplianceIcon = (status) => {
    switch (status) {
      case 'valid':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'expired':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'not_required':
        return <span className="w-4 h-4 text-gray-400">N/A</span>;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Vendor Risk Dashboard
          </h1>
          <p className="text-gray-600">
            Monitor vendor security posture and compliance status
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          <button
            onClick={() => refetch()}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Refresh Data
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <Shield className="w-8 h-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Vendors</p>
              <p className="text-2xl font-bold text-gray-900">{displayData.summary.totalVendors}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <AlertTriangle className="w-8 h-8 text-red-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">High Risk</p>
              <p className="text-2xl font-bold text-gray-900">
                {displayData.summary.criticalRisk + displayData.summary.highRisk}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Compliance Score</p>
              <p className="text-2xl font-bold text-gray-900">{displayData.summary.complianceScore}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <Calendar className="w-8 h-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Last Assessment</p>
              <p className="text-sm font-bold text-gray-900">
                {new Date(displayData.summary.lastAssessment).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Vendor List */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Vendor Risk Assessment</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vendor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Risk Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Compliance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Performance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Next Review
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {displayData.vendors.map((vendor) => {
                const Icon = vendor.icon;
                return (
                  <tr key={vendor.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Icon className="w-6 h-6 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {vendor.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {vendor.service}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRiskColor(vendor.riskLevel)}`}>
                          {vendor.riskLevel}
                        </span>
                        <span className="ml-2 text-sm text-gray-600">
                          {vendor.riskScore}/25
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center">
                          {getComplianceIcon(vendor.compliance.soc2.status)}
                          <span className="ml-1 text-xs text-gray-600">SOC2</span>
                        </div>
                        <div className="flex items-center">
                          {getComplianceIcon(vendor.compliance.gdpr.status)}
                          <span className="ml-1 text-xs text-gray-600">GDPR</span>
                        </div>
                        <div className="flex items-center">
                          {getComplianceIcon(vendor.compliance.iso27001.status)}
                          <span className="ml-1 text-xs text-gray-600">ISO</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {vendor.metrics.availability}% uptime
                      </div>
                      <div className="text-sm text-gray-500">
                        {vendor.metrics.responseTime}ms avg
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(vendor.nextReview).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => setSelectedVendor(vendor)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        View Details
                      </button>
                      <button className="text-gray-600 hover:text-gray-900">
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Risk Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Distribution</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Critical Risk</span>
              <div className="flex items-center">
                <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                  <div 
                    className="bg-red-600 h-2 rounded-full" 
                    style={{ width: `${(displayData.summary.criticalRisk / displayData.summary.totalVendors) * 100}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium">{displayData.summary.criticalRisk}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">High Risk</span>
              <div className="flex items-center">
                <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                  <div 
                    className="bg-orange-600 h-2 rounded-full" 
                    style={{ width: `${(displayData.summary.highRisk / displayData.summary.totalVendors) * 100}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium">{displayData.summary.highRisk}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Medium Risk</span>
              <div className="flex items-center">
                <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                  <div 
                    className="bg-yellow-600 h-2 rounded-full" 
                    style={{ width: `${(displayData.summary.mediumRisk / displayData.summary.totalVendors) * 100}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium">{displayData.summary.mediumRisk}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Low Risk</span>
              <div className="flex items-center">
                <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                  <div 
                    className="bg-green-600 h-2 rounded-full" 
                    style={{ width: `${(displayData.summary.lowRisk / displayData.summary.totalVendors) * 100}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium">{displayData.summary.lowRisk}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Reviews</h3>
          <div className="space-y-3">
            {displayData.vendors
              .sort((a, b) => new Date(a.nextReview || a.next_review) - new Date(b.nextReview || b.next_review))
              .slice(0, 4)
              .map((vendor) => (
                <div key={vendor.id} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <vendor.icon className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-900">{vendor.name}</span>
                  </div>
                  <span className="text-sm text-gray-600">
                    {new Date(vendor.nextReview || vendor.next_review).toLocaleDateString()}
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Vendor Detail Modal */}
      {selectedVendor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-screen overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  {selectedVendor.name} - Risk Assessment
                </h2>
                <button
                  onClick={() => setSelectedVendor(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Risk Assessment</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Risk Score:</span>
                      <span className="text-sm font-medium">{selectedVendor.riskScore}/25</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Risk Level:</span>
                      <span className={`text-sm font-medium px-2 py-1 rounded ${getRiskColor(selectedVendor.riskLevel)}`}>
                        {selectedVendor.riskLevel}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Data Access:</span>
                      <span className="text-sm font-medium">{selectedVendor.dataAccess}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Criticality:</span>
                      <span className="text-sm font-medium">{selectedVendor.criticality}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Performance Metrics</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Availability:</span>
                      <span className="text-sm font-medium">{selectedVendor.metrics.availability}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Response Time:</span>
                      <span className="text-sm font-medium">{selectedVendor.metrics.responseTime}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Incidents:</span>
                      <span className="text-sm font-medium">{selectedVendor.metrics.incidents}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">SLA Compliance:</span>
                      <span className="text-sm font-medium">{selectedVendor.metrics.slaCompliance}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorRiskDashboard;
