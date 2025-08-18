import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from 'react-query';
import {
  Users,
  Settings,
  FileText,
  Shield,
  BarChart3,
  Plus,
  Edit,
  Trash2,
  Eye,
  UserCheck,
  UserX,
  Mail,
  MailPlus,
  Loader2,
  AlertTriangle,
  Flag,
  Download,
  TrendingUp
} from 'lucide-react';
import toast from 'react-hot-toast';
import adminService from '../services/adminService';
import { templateService } from '../services/api'; // templateService not yet migrated
// Lazy load heavy admin components for better performance
const AddManagerModal = lazy(() => import('../components/AddManagerModal'));
const EditManagerModal = lazy(() => import('../components/EditManagerModal'));
const AuditLogViewer = lazy(() => import('../components/AuditLogViewer'));
// Lazy load admin components for better performance
const SystemSettings = lazy(() => import('../components/SystemSettings'));
const FeatureFlagsManager = lazy(() => import('../components/admin/FeatureFlagsManager'));
const DataExportManager = lazy(() => import('../components/admin/DataExportManager'));
const ComplianceReportsManager = lazy(() => import('../components/admin/ComplianceReportsManager'));
const IncidentManagementCenter = lazy(() => import('../components/admin/IncidentManagementCenter'));
const PerformanceDashboard = lazy(() => import('../components/admin/PerformanceDashboard'));
const SecurityMonitoringDashboard = lazy(() => import('../components/admin/SecurityMonitoringDashboard'));
const VercelFirewallManager = lazy(() => import('../components/admin/VercelFirewallManager'));
const VendorRiskDashboard = lazy(() => import('../components/admin/VendorRiskDashboard'));

const AdminDashboard = () => {
  const { user } = useAuth();
  const { t } = useTranslation(['admin', 'common']);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [managers, setManagers] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [systemStats, setSystemStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [showAddManagerModal, setShowAddManagerModal] = useState(false);
  const [showEditManagerModal, setShowEditManagerModal] = useState(false);
  const [editingManagerId, setEditingManagerId] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  const [loadingStartTime, setLoadingStartTime] = useState(null);

  // Helper function to manage loading states for actions
  const setButtonLoading = (actionKey, isLoading) => {
    setActionLoading(prev => ({
      ...prev,
      [actionKey]: isLoading
    }));
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setLoadingStartTime(Date.now());

      // Add minimum loading time to prevent flash of loading state
      const minLoadingTime = new Promise(resolve => setTimeout(resolve, 500));

      // Load all data in parallel to improve performance
      const [managersResponse, statsResponse, templatesResponse] = await Promise.all([
        adminService.getManagers(),
        adminService.getSystemStats(),
        templateService.getTemplates(),
        minLoadingTime // Ensure minimum loading time
      ]);

      // Set the data
      setManagers(managersResponse.managers || []);
      setSystemStats(statsResponse || {});
      setTemplates(templatesResponse.templates || []);

    } catch (error) {
      // Only show error toast if loading took more than 1 second (indicates real error, not just fast loading)
      const loadingDuration = Date.now() - loadingStartTime;
      if (loadingDuration > 1000) {
        console.error('Failed to load dashboard data:', error);
        toast.error(t('admin:dashboard.messages.loadFailed'), {
          duration: 4000,
          style: {
            background: '#dc2626',
            color: '#fff',
          }
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleManagerToggle = async (managerId, isActive, managerName) => {
    const actionKey = `toggle-${managerId}`;
    try {
      setButtonLoading(actionKey, true);
      await adminService.updateManager(managerId, { is_active: !isActive });

      const messageKey = !isActive ? 'managerActivated' : 'managerDeactivated';
      toast.success(t(`admin:dashboard.messages.${messageKey}`, { name: managerName }));
      loadDashboardData();
    } catch (error) {
      // console.error('Failed to toggle manager status:', error);
      toast.error(t('admin:dashboard.messages.statusUpdateFailed'));
    } finally {
      setButtonLoading(actionKey, false);
    }
  };

  const handleEditManager = (managerId) => {
    setEditingManagerId(managerId);
    setShowEditManagerModal(true);
  };

  const handleSendMagicLink = async (managerId, managerName) => {
    const actionKey = `magic-${managerId}`;
    try {
      setButtonLoading(actionKey, true);
      await adminService.sendManagerMagicLink(managerId);
      toast.success(t('admin:dashboard.messages.magicLinkSent', { name: managerName }));
    } catch (error) {
      // console.error('Failed to send magic link:', error);
      const message = error.response?.data?.error || t('admin:dashboard.messages.magicLinkFailed');
      toast.error(message);
    } finally {
      setButtonLoading(actionKey, false);
    }
  };

  const handleResendWelcomeEmail = async (managerId, managerName) => {
    const actionKey = `welcome-${managerId}`;
    try {
      setButtonLoading(actionKey, true);
      await adminService.resendManagerWelcomeEmail(managerId);
      toast.success(t('admin:dashboard.messages.welcomeEmailResent', { name: managerName }));
      // Invalidate the specific manager query to force reload
      queryClient.invalidateQueries(['manager', managerId]);
      // Also reload dashboard data to ensure list is fresh
      loadDashboardData();
    } catch (error) {
      // console.error('Failed to resend welcome email:', error);
      const message = error.response?.data?.error || t('admin:dashboard.messages.welcomeEmailFailed');
      toast.error(message);
    } finally {
      setButtonLoading(actionKey, false);
    }
  };

  const handleDeleteManager = async (managerId, managerName) => {
    if (window.confirm(t('admin:dashboard.messages.deleteConfirm', { name: managerName }))) {
      const actionKey = `delete-${managerId}`;
      try {
        setButtonLoading(actionKey, true);
        await adminService.deleteManager(managerId);
        toast.success(t('admin:dashboard.messages.managerDeleted'));
        loadDashboardData();
      } catch (error) {
        // console.error('Failed to delete manager:', error);
        toast.error(t('admin:dashboard.messages.deleteFailed'));
      } finally {
        setButtonLoading(actionKey, false);
      }
    }
  };

  const handleDeleteTemplate = async (templateId, templateName) => {
    if (window.confirm(t('admin:dashboard.messages.templateDeleteConfirm', { name: templateName }))) {
      const actionKey = `template-delete-${templateId}`;
      try {
        setButtonLoading(actionKey, true);
        await templateService.deleteTemplate(templateId);
        toast.success(t('admin:dashboard.messages.templateDeleted'));
        loadDashboardData();
      } catch (error) {
        // console.error('Failed to delete template:', error);
        toast.error(t('admin:dashboard.messages.templateDeleteFailed'));
      } finally {
        setButtonLoading(actionKey, false);
      }
    }
  };

  const handlePreviewTemplate = async (templateId, templateName) => {
    const actionKey = `template-preview-${templateId}`;
    try {
      setActionLoading(prev => ({ ...prev, [actionKey]: true }));

      // First, get the template data
      const template = await templateService.getTemplate(templateId);

      // Prepare data for preview API
      const previewData = {
        template: template,
        sampleData: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          position: 'Deck Officer',
          vesselAssignment: 'MV Ocean Explorer',
          startDate: '2024-01-15',
          completionDate: new Date().toISOString().split('T')[0],
          certificateNumber: 'CERT-2024-001',
          trainingScore: 95,
          companyLogo: '/logo.png'
        }
      };

      // Generate and open PDF preview
      const pdfBlob = await templateService.previewTemplate(previewData);
      const url = URL.createObjectURL(pdfBlob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      toast.success(t('admin:dashboard.messages.templatePreviewGenerated', { name: templateName }));
    } catch (error) {
      console.error('Failed to preview template:', error);
      toast.error(t('admin:dashboard.messages.templatePreviewFailed', { name: templateName }));
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  const tabs = [
    { id: 'overview', name: t('admin:dashboard.tabs.overview'), icon: BarChart3 },
    { id: 'managers', name: t('admin:dashboard.tabs.managers'), icon: Users },
    { id: 'templates', name: t('admin:dashboard.tabs.templates'), icon: FileText },
    { id: 'performance', name: t('admin:dashboard.tabs.performance'), icon: BarChart3 },
    { id: 'security', name: t('admin:dashboard.tabs.security'), icon: Shield },
    { id: 'vendor-risk', name: 'Vendor Risk Assessment', icon: TrendingUp },
    { id: 'vercel-firewall', name: 'Vercel Firewall', icon: Shield },
    { id: 'incidents', name: 'Incident Management', icon: AlertTriangle },
    { id: 'feature-flags', name: 'Feature Flags', icon: Flag },
    { id: 'data-export', name: 'Data Export/GDPR', icon: Download },
    { id: 'compliance', name: 'Compliance Reports', icon: FileText },
    { id: 'content', name: t('admin:dashboard.tabs.content'), icon: Edit },
    { id: 'settings', name: t('admin:dashboard.tabs.settings'), icon: Settings },
    { id: 'audit', name: t('admin:dashboard.tabs.audit'), icon: Eye }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">{t('admin:dashboard.loading')}</p>
          <p className="text-sm text-gray-400 mt-2">{t('admin:dashboard.loadingDetails')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {t('admin:dashboard.title')}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {t('common:welcome_back', { name: `${user?.firstName} ${user?.lastName}` })}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <Shield className="w-3 h-3 mr-1" />
                {t('common:roles.admin')}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation - Mobile Optimized */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-2 px-3 sm:px-1 border-b-2 font-medium text-sm flex items-center flex-shrink-0`}
                >
                  <Icon className="w-4 h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">{tab.name}</span>
                  <span className="sm:hidden">{tab.name.split(' ')[0]}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
            <div
              className="bg-white overflow-hidden shadow rounded-lg cursor-pointer hover:shadow-lg transition-shadow duration-200 hover:bg-gray-50"
              onClick={() => setActiveTab('managers')}
            >
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Users className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        {t('admin:dashboard.stats.managers')}
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {systemStats.totalManagers || 0}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Users className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        {t('admin:dashboard.stats.crew')}
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {systemStats.totalCrew || 0}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div
              className="bg-white overflow-hidden shadow rounded-lg cursor-pointer hover:shadow-lg transition-shadow duration-200 hover:bg-gray-50"
              onClick={() => setActiveTab('templates')}
            >
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <FileText className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        {t('admin:dashboard.tabs.templates')}
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {templates.length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {activeTab === 'managers' && (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="px-4 py-5 sm:px-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    {t('admin:dashboard.sections.managers.title')}
                  </h3>
                  <p className="mt-1 max-w-2xl text-sm text-gray-500">
                    {t('admin:dashboard.sections.managers.description')}
                  </p>
                </div>
                <button
                  onClick={() => setShowAddManagerModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 w-full sm:w-auto justify-center"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {t('admin:dashboard.sections.managers.add')}
                </button>
              </div>
            </div>
            <ul className="divide-y divide-gray-200">
              {managers.map((manager) => (
                <li key={manager.id} className="px-4 py-4 sm:px-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <Users className="h-5 w-5 text-gray-600" />
                        </div>
                      </div>
                      <div className="ml-4 flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900">
                          {manager.first_name} {manager.last_name}
                        </div>
                        <div className="text-sm text-gray-500 truncate">
                          <span className="block sm:inline">{manager.email}</span>
                          <span className="hidden sm:inline"> • </span>
                          <span className="block sm:inline">{manager.position}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-14 sm:ml-0">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        manager.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {manager.is_active ? t('admin:dashboard.sections.managers.active') : t('admin:dashboard.sections.managers.inactive')}
                      </span>
                      <div className="flex items-center">
                        <button
                          onClick={() => handleManagerToggle(manager.id, manager.is_active, `${manager.first_name} ${manager.last_name}`)}
                          className={`p-2 sm:p-1 rounded-full ${
                            manager.is_active
                              ? 'text-red-600 hover:bg-red-100'
                              : 'text-green-600 hover:bg-green-100'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                          title={manager.is_active
                            ? t('admin:dashboard.tooltips.deactivateManager')
                            : t('admin:dashboard.tooltips.activateManager')
                          }
                          disabled={actionLoading[`toggle-${manager.id}`]}
                        >
                          {actionLoading[`toggle-${manager.id}`] ? (
                            <Loader2 className="w-5 h-5 sm:w-4 sm:h-4 animate-spin" />
                          ) : (
                            manager.is_active ? <UserX className="w-5 h-5 sm:w-4 sm:h-4" /> : <UserCheck className="w-5 h-5 sm:w-4 sm:h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleSendMagicLink(manager.id, `${manager.first_name} ${manager.last_name}`)}
                          className="p-2 sm:p-1 rounded-full text-purple-600 hover:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed"
                          title={t('admin:dashboard.tooltips.sendMagicLink')}
                          disabled={!manager.is_active || actionLoading[`magic-${manager.id}`]}
                        >
                          {actionLoading[`magic-${manager.id}`] ? (
                            <Loader2 className="w-5 h-5 sm:w-4 sm:h-4 animate-spin" />
                          ) : (
                            <Mail className="w-5 h-5 sm:w-4 sm:h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleResendWelcomeEmail(manager.id, `${manager.first_name} ${manager.last_name}`)}
                          className="p-2 sm:p-1 rounded-full text-green-600 hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed"
                          title={t('admin:dashboard.tooltips.resendWelcomeEmail')}
                          disabled={!manager.is_active || actionLoading[`welcome-${manager.id}`]}
                        >
                          {actionLoading[`welcome-${manager.id}`] ? (
                            <Loader2 className="w-5 h-5 sm:w-4 sm:h-4 animate-spin" />
                          ) : (
                            <MailPlus className="w-5 h-5 sm:w-4 sm:h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleEditManager(manager.id)}
                          className="p-2 sm:p-1 rounded-full text-blue-600 hover:bg-blue-100"
                          title={t('admin:dashboard.tooltips.editManager')}
                        >
                          <Edit className="w-5 h-5 sm:w-4 sm:h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteManager(manager.id, `${manager.first_name} ${manager.last_name}`)}
                          className="p-2 sm:p-1 rounded-full text-red-600 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                          title={t('admin:dashboard.tooltips.deleteManager')}
                          disabled={actionLoading[`delete-${manager.id}`]}
                        >
                          {actionLoading[`delete-${manager.id}`] ? (
                            <Loader2 className="w-5 h-5 sm:w-4 sm:h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-5 h-5 sm:w-4 sm:h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {activeTab === 'templates' && (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="px-4 py-5 sm:px-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    {t('admin:dashboard.sections.templates.title')}
                  </h3>
                  <p className="mt-1 max-w-2xl text-sm text-gray-500">
                    {t('admin:dashboard.sections.templates.description')}
                  </p>
                </div>
                <button
                  onClick={() => navigate('/templates/new')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 w-full sm:w-auto justify-center"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {t('admin:dashboard.sections.templates.create')}
                </button>
              </div>
            </div>
            {templates.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {templates.map((template) => (
                  <li key={template.id} className="px-4 py-4 sm:px-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {template.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          <span className="block sm:inline truncate">{template.description}</span>
                          <span className="hidden sm:inline"> • </span>
                          <span className="block sm:inline">Created {new Date(template.createdAt || template.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-0 sm:ml-4">
                        <button
                          onClick={() => handlePreviewTemplate(template.id, template.name)}
                          disabled={actionLoading[`template-preview-${template.id}`]}
                          className="p-2 sm:p-1 rounded-full text-blue-600 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                          title={t('common:actions.preview')}
                        >
                          {actionLoading[`template-preview-${template.id}`] ? (
                            <Loader2 className="w-5 h-5 sm:w-4 sm:h-4 animate-spin" />
                          ) : (
                            <Eye className="w-5 h-5 sm:w-4 sm:h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => navigate(`/templates/edit/${template.id}`)}
                          className="p-2 sm:p-1 rounded-full text-blue-600 hover:bg-blue-100"
                          title={t('common:actions.edit')}
                        >
                          <Edit className="w-5 h-5 sm:w-4 sm:h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTemplate(template.id, template.name)}
                          className="p-2 sm:p-1 rounded-full text-red-600 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                          title={t('common:actions.delete')}
                          disabled={actionLoading[`template-delete-${template.id}`]}
                        >
                          {actionLoading[`template-delete-${template.id}`] ? (
                            <Loader2 className="w-5 h-5 sm:w-4 sm:h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-5 h-5 sm:w-4 sm:h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-4 py-8 text-center">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">{t('admin:dashboard.sections.templates.empty')}</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {t('admin:dashboard.sections.templates.emptyDescription')}
                </p>
                <div className="mt-6">
                  <button
                    onClick={() => navigate('/templates/new')}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {t('admin:dashboard.sections.templates.create')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'performance' && (
          <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>}>
            <PerformanceDashboard />
          </Suspense>
        )}

        {activeTab === 'security' && (
          <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>}>
            <SecurityMonitoringDashboard />
          </Suspense>
        )}

        {activeTab === 'vendor-risk' && (
          <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>}>
            <VendorRiskDashboard />
          </Suspense>
        )}

        {activeTab === 'vercel-firewall' && (
          <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>}>
            <VercelFirewallManager />
          </Suspense>
        )}

        {activeTab === 'incidents' && (
          <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>}>
            <IncidentManagementCenter />
          </Suspense>
        )}

        {activeTab === 'feature-flags' && (
          <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>}>
            <FeatureFlagsManager />
          </Suspense>
        )}

        {activeTab === 'data-export' && (
          <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>}>
            <DataExportManager />
          </Suspense>
        )}

        {activeTab === 'compliance' && (
          <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>}>
            <ComplianceReportsManager />
          </Suspense>
        )}

        {activeTab === 'audit' && (
          <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>}>
            <AuditLogViewer />
          </Suspense>
        )}

        {activeTab === 'settings' && (
          <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>}>
            <SystemSettings />
          </Suspense>
        )}

        {activeTab === 'content' && (
          <div className="text-center py-8">
            <p className="text-gray-500">{t('admin:dashboard.sections.content.redirecting')}</p>
            {(() => {
              navigate('/content');
              return null;
            })()}
          </div>
        )}
      </div>

      {/* Add Manager Modal */}
      {showAddManagerModal && (
        <Suspense fallback={<div />}>
          <AddManagerModal
            isOpen={showAddManagerModal}
            onClose={() => setShowAddManagerModal(false)}
            onSuccess={loadDashboardData}
          />
        </Suspense>
      )}

      {/* Edit Manager Modal */}
      {showEditManagerModal && (
        <Suspense fallback={<div />}>
          <EditManagerModal
            isOpen={showEditManagerModal}
            onClose={() => {
              setShowEditManagerModal(false);
              setEditingManagerId(null);
            }}
            onSuccess={loadDashboardData}
            managerId={editingManagerId}
          />
        </Suspense>
      )}
    </div>
  );
};

export default AdminDashboard;
