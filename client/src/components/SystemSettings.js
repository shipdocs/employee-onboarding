import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useTranslation } from 'react-i18next';
import {
  Settings,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Mail,
  Shield,
  GraduationCap,
  Bell,
  Monitor,
  RotateCcw,
  Languages,
  Link,
  TestTube,
  Eye,
  EyeOff,
  Phone,
  FileText
} from 'lucide-react';
import adminService from '../services/adminService';
import toast from 'react-hot-toast';

const SystemSettings = () => {
  const { t } = useTranslation(['admin', 'common']);
  const [settings, setSettings] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  const [activeCategory, setActiveCategory] = useState('application');
  const [emailProvider, setEmailProvider] = useState('smtp'); // Track email provider selection
  const [translationProvider, setTranslationProvider] = useState('claude'); // Track translation provider selection
  const [integrationProvider, setIntegrationProvider] = useState('none'); // Track integration provider selection
  const [vercelFirewallEnabled, setVercelFirewallEnabled] = useState(false); // Track Vercel Firewall status
  const [testingIntegration, setTestingIntegration] = useState(null);
  const queryClient = useQueryClient();
  
  // Update provider states when category changes
  useEffect(() => {
    if (settings && activeCategory === 'email') {
      const emailSettings = settings.email || {};
      const currentProvider = emailSettings.email_service_provider?.value ||
                             emailSettings.email_provider?.value || 'smtp';
      setEmailProvider(currentProvider);
    }
    if (settings && activeCategory === 'translation') {
      const translationSettings = settings.translation || {};
      const currentProvider = translationSettings.translation_provider?.value || 'claude';
      setTranslationProvider(currentProvider);
    }
    if (settings && activeCategory === 'integrations') {
      const integrationSettings = settings.integrations || {};
      const currentProvider = integrationSettings.incident_response_provider?.value || 'none';
      setIntegrationProvider(currentProvider);
    }
  }, [activeCategory, settings]);

  // Fetch system settings
  const {
    data: settingsData,
    isLoading,
    error,
    refetch
  } = useQuery(
    'system-settings',
    adminService.getSystemSettings,
    {
      retry: 2,
      retryDelay: 1000,
      staleTime: 30000, // Consider data stale after 30 seconds
      cacheTime: 60000, // Keep in cache for 1 minute
      onSuccess: (data) => {
        // Ensure we have a valid data structure
        const validData = data || {};
        setSettings(validData);
        setHasChanges(false);

        // Set initial email provider from settings
        const emailSettings = validData.email || {};
        const currentProvider = emailSettings.email_service_provider?.value ||
                               emailSettings.email_provider?.value || 'smtp';
        setEmailProvider(currentProvider);
        
        // Set initial translation provider from settings
        const translationSettings = validData.translation || {};
        const currentTranslationProvider = translationSettings.translation_provider?.value || 'claude';
        setTranslationProvider(currentTranslationProvider);

        // Set initial integration provider from settings
        const integrationSettings = validData.integrations || {};
        const currentIntegrationProvider = integrationSettings.incident_response_provider?.value || 'none';
        setIntegrationProvider(currentIntegrationProvider);

        // Set initial Vercel Firewall status from settings
        const vercelEnabled = integrationSettings.vercel_firewall_enabled?.value || false;
        setVercelFirewallEnabled(vercelEnabled);
      },
      onError: (error) => {
        toast.error(t('admin:dashboard.messages.loadFailed'));
        console.error('System settings error:', error);
        // Initialize with empty structure on error
        setSettings({});
      }
    }
  );

  // Update settings mutation
  const updateSettingsMutation = useMutation(
    async (settingsToUpdate) => {
      // Process settings to update each changed setting individually
      const updates = [];
      
      Object.entries(settingsToUpdate).forEach(([category, categorySettings]) => {
        if (categorySettings && typeof categorySettings === 'object') {
          Object.entries(categorySettings).forEach(([key, setting]) => {
            if (setting && typeof setting === 'object' && setting.value !== undefined) {
              updates.push({
                category,
                key,
                value: setting.value
              });
            }
          });
        }
      });
      
      // Update all settings
      const results = await Promise.all(
        updates.map(update => 
          adminService.updateSystemSetting(update.category, update.key, update.value)
        )
      );
      
      return results;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('system-settings');
        toast.success(t('api:success.updated'));
        setHasChanges(false);
        // Refetch to ensure state is synchronized
        refetch();
      },
      onError: (error) => {
        const message = error.response?.data?.error || error.message || t('api:errors.general.serverError');
        toast.error(message);
        // Refetch to restore correct state
        refetch();
      }
    }
  );

  // Reset settings mutation
  const resetSettingsMutation = useMutation(
    adminService.resetSystemSettings,
    {
      onSuccess: () => {
        queryClient.invalidateQueries('system-settings');
        toast.success(t('common:success.updated'));
        setHasChanges(false);
      },
      onError: (error) => {
        const message = error.response?.data?.error || t('api:errors.general.serverError');
        toast.error(message);
      }
    }
  );

  // Test integration function
  const testIntegration = async (integrationType) => {
    setTestingIntegration(integrationType);
    try {
      // Flatten settings object for API
      const flattenedSettings = {};
      Object.entries(settings).forEach(([category, categorySettings]) => {
        if (categorySettings && typeof categorySettings === 'object') {
          Object.entries(categorySettings).forEach(([key, setting]) => {
            if (setting && typeof setting === 'object' && setting.value !== undefined) {
              flattenedSettings[`${category}.${key}`] = setting.value;
            }
          });
        }
      });

      const response = await adminService.testIntegration(integrationType, flattenedSettings);
      if (response.success) {
        toast.success(`${integrationType} integration test successful!`);
      } else {
        toast.error(`${integrationType} integration test failed: ${response.error}`);
      }
    } catch (error) {
      console.error('Integration test error:', error);
      toast.error(`${integrationType} integration test failed: ${error.message}`);
    } finally {
      setTestingIntegration(null);
    }
  };

  const categories = [
    { key: 'application', label: t('admin:settings.categories.application'), icon: Monitor, description: t('admin:settings.descriptions.application') },
    { key: 'translation', label: 'Translation Services', icon: Languages, description: 'Configure AI translation providers and API keys' },
    { key: 'email', label: t('admin:settings.categories.email'), icon: Mail, description: t('admin:settings.descriptions.email') },
    { key: 'contact', label: 'Contact Information', icon: Phone, description: 'Configure support contact details and help system settings' },
    { key: 'compliance', label: 'Compliance & Audit', icon: FileText, description: 'Configure compliance settings, audit logging, incident management, and performance monitoring' },
    { key: 'security', label: t('admin:settings.categories.security'), icon: Shield, description: t('admin:settings.descriptions.security') },
    { key: 'training', label: t('admin:settings.categories.training'), icon: GraduationCap, description: t('admin:settings.descriptions.training') },
    { key: 'notifications', label: t('admin:settings.categories.notifications'), icon: Bell, description: t('admin:settings.descriptions.notifications') },
    { key: 'integrations', label: 'External Integrations', icon: Link, description: 'Configure external services like PagerDuty, Slack, and webhooks' }
  ];

  const handleSettingChange = (category, key, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: {
          ...prev[category]?.[key],
          value: value
        }
      }
    }));
    setHasChanges(true);
  };

  // Get current email provider to show relevant fields
  const getCurrentEmailProvider = () => {
    return settings?.email?.email_provider?.value || settings?.email?.email_service_provider?.value || 'smtp';
  };

  // Filter email settings based on selected provider
  const getVisibleEmailSettings = (categorySettings) => {
    if (!categorySettings) return {};

    const provider = getCurrentEmailProvider();
    const filtered = {};

    Object.entries(categorySettings).forEach(([key, setting]) => {
      // Always show general email settings (but hide the provider dropdown since we have custom buttons)
      if (['from_email', 'from_name', 'admin_notifications'].includes(key)) {
        filtered[key] = setting;
      }
      // Show SMTP settings only when SMTP is selected
      else if (key.startsWith('smtp_') && provider === 'smtp') {
        filtered[key] = setting;
      }
      // Show MailerSend settings only when MailerSend is selected
      else if (key.startsWith('mailersend_') && provider === 'mailersend') {
        filtered[key] = setting;
      }
    });

    return filtered;
  };

  // Filter integration settings based on selected providers and features
  const getVisibleIntegrationSettings = (categorySettings) => {
    if (!categorySettings) return {};

    const filtered = {};

    Object.entries(categorySettings).forEach(([key, setting]) => {
      // Always show general integration settings
      if (['incident_response_provider', 'hr_email', 'qhse_email', 'security_email', 'support_email'].includes(key)) {
        filtered[key] = setting;
      }
      // Show PagerDuty settings when PagerDuty is selected
      else if (key.startsWith('pagerduty_') && integrationProvider === 'pagerduty') {
        filtered[key] = setting;
      }
      // Show Slack settings when Slack is enabled
      else if (key.startsWith('slack_') && categorySettings.slack_enabled?.value) {
        filtered[key] = setting;
      }
      // Show webhook settings when webhooks are enabled
      else if (key.startsWith('webhook_') && categorySettings.webhook_enabled?.value) {
        filtered[key] = setting;
      }
      // Show Vercel Firewall settings when enabled
      else if (key.startsWith('vercel_') && vercelFirewallEnabled) {
        filtered[key] = setting;
      }
      // Always show enable/disable toggles
      else if (key.includes('_enabled')) {
        filtered[key] = setting;
      }
    });

    return filtered;
  };

  const handleSave = () => {
    updateSettingsMutation.mutate(settings);
  };

  const handleReset = (category = null) => {
    if (window.confirm(category ? t('admin:settings.messages.reset_confirm', { category }) : t('admin:settings.messages.reset_all_confirm'))) {
      resetSettingsMutation.mutate({ category });
    }
  };

  // Handle email provider change
  const handleEmailProviderChange = (provider) => {
    setEmailProvider(provider);

    // Update the email_service_provider setting
    handleSettingChange('email', 'email_service_provider', provider);
    handleSettingChange('email', 'email_provider', provider); // Fallback for legacy field
  };

  // Handle translation provider change
  const handleTranslationProviderChange = (provider) => {
    setTranslationProvider(provider);
    handleSettingChange('translation', 'translation_provider', provider);
  };

  // Handle integration provider change
  const handleIntegrationProviderChange = (provider) => {
    setIntegrationProvider(provider);
    handleSettingChange('integrations', 'incident_response_provider', provider);
  };

  const handleVercelFirewallToggle = (enabled) => {
    setVercelFirewallEnabled(enabled);
    handleSettingChange('integrations', 'vercel_firewall_enabled', enabled);
  };

  // Filter email settings based on selected provider
  const getFilteredEmailSettings = (emailSettings) => {
    if (!emailSettings) return {};

    const filtered = {};

    Object.entries(emailSettings).forEach(([key, setting]) => {
      // Always show general email settings
      if (['from_email', 'from_name', 'admin_notifications'].includes(key)) {
        filtered[key] = setting;
      }
      // Show SMTP settings only when SMTP is selected
      else if (key.startsWith('smtp_') && emailProvider === 'smtp') {
        filtered[key] = setting;
      }
      // Show MailerSend settings only when MailerSend is selected
      else if (key.startsWith('mailersend_') && emailProvider === 'mailersend') {
        filtered[key] = setting;
      }
    });

    return filtered;
  };

  // Filter translation settings based on selected provider
  const getFilteredTranslationSettings = (translationSettings) => {
    if (!translationSettings) return {};

    const filtered = {};

    Object.entries(translationSettings).forEach(([key, setting]) => {
      // Always show general translation settings
      if (['translation_provider', 'default_source_language', 'enabled_languages'].includes(key)) {
        filtered[key] = setting;
      }
      // Show provider-specific API keys
      else if (key.startsWith('anthropic_') && translationProvider === 'claude') {
        filtered[key] = setting;
      }
      else if (key.startsWith('openai_') && translationProvider === 'openai') {
        filtered[key] = setting;
      }
      else if (key.startsWith('microsoft_') && translationProvider === 'microsoft') {
        filtered[key] = setting;
      }
      else if (key.startsWith('google_') && translationProvider === 'google') {
        filtered[key] = setting;
      }
    });

    return filtered;
  };

  const renderSettingInput = (category, key, setting) => {
    const { value, type, description, options } = setting;

    switch (type) {
      case 'boolean':
        return (
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={value === 'true'}
              onChange={(e) => handleSettingChange(category, key, e.target.checked ? 'true' : 'false')}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-600">{description}</span>
          </div>
        );
      case 'number':
        return (
          <div>
            <input
              type="number"
              value={value}
              onChange={(e) => handleSettingChange(category, key, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="mt-1 text-sm text-gray-500">{description}</p>
          </div>
        );
      case 'email':
        return (
          <div>
            <input
              type="email"
              value={value}
              onChange={(e) => handleSettingChange(category, key, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="mt-1 text-sm text-gray-500">{description}</p>
          </div>
        );
      case 'password':
        return (
          <div>
            <div className="flex gap-2">
              <input
                type="password"
                value={value}
                onChange={(e) => handleSettingChange(category, key, e.target.value)}
                placeholder="Enter password/token"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              {category === 'integrations' && (key.includes('webhook_url') || key.includes('slack_webhook_url') || key.includes('pagerduty_integration_key')) && (
                <button
                  onClick={() => testIntegration(key.includes('webhook') ? 'webhook' : key.includes('slack') ? 'slack' : 'pagerduty')}
                  disabled={testingIntegration || !value}
                  className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <TestTube className="w-4 h-4" />
                  {testingIntegration ? 'Testing...' : 'Test'}
                </button>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-500">{description}</p>
            {key.includes('smtp') && (
              <p className="mt-1 text-xs text-amber-600">
                🔒 This credential is stored securely in the database
              </p>
            )}
            {key.includes('mailersend') && (
              <p className="mt-1 text-xs text-green-600">
                🔑 MailerSend API credentials are encrypted and secure
              </p>
            )}
            {category === 'integrations' && (
              <p className="mt-1 text-xs text-blue-600">
                🔐 Integration credentials are encrypted and secure
              </p>
            )}
          </div>
        );
      case 'select':
        return (
          <div>
            <select
              value={value}
              onChange={(e) => handleSettingChange(category, key, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              {options && Array.isArray(options) && options.map(option => (
                <option key={option} value={option}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </option>
              ))}
            </select>
            <p className="mt-1 text-sm text-gray-500">{description}</p>
            {options && !Array.isArray(options) && (
              <p className="mt-1 text-xs text-red-500">
                Warning: Invalid options format for this setting
              </p>
            )}
          </div>
        );
      case 'url':
        return (
          <div>
            <input
              type="url"
              value={value}
              onChange={(e) => handleSettingChange(category, key, e.target.value)}
              placeholder="https://example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="mt-1 text-sm text-gray-500">{description}</p>
          </div>
        );
      case 'json':
        return (
          <div>
            <textarea
              value={Array.isArray(value) ? JSON.stringify(value, null, 2) : value}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  handleSettingChange(category, key, parsed);
                } catch (error) {
                  // Allow invalid JSON while typing
                  handleSettingChange(category, key, e.target.value);
                }
              }}
              placeholder='["option1", "option2"] or {"key": "value"}'
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
            />
            <p className="mt-1 text-sm text-gray-500">{description}</p>
            <p className="mt-1 text-xs text-blue-600">
              💡 Enter valid JSON format (arrays or objects)
            </p>
          </div>
        );
      default:
        return (
          <div>
            <input
              type="text"
              value={value}
              onChange={(e) => handleSettingChange(category, key, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="mt-1 text-sm text-gray-500">{description}</p>
          </div>
        );
    }
  };

  const formatSettingKey = (key) => {
    return key
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">{t('admin:settings.messages.loading')}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-red-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              {t('admin:settings.messages.load_failed')}
            </h3>
            <div className="mt-2">
              <button
                onClick={() => refetch()}
                className="text-sm bg-red-100 text-red-800 px-3 py-1 rounded hover:bg-red-200"
              >
                {t('admin:settings.messages.try_again')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentCategory = categories.find(cat => cat.key === activeCategory);

  // Get category settings with provider filtering
  const getCategorySettings = () => {
    // Ensure settings is an object before accessing
    if (!settings || typeof settings !== 'object') {
      return {};
    }

    const rawSettings = settings[activeCategory] || {};

    if (activeCategory === 'email') {
      return getFilteredEmailSettings(rawSettings);
    }

    if (activeCategory === 'translation') {
      return getFilteredTranslationSettings(rawSettings);
    }

    if (activeCategory === 'integrations') {
      return getVisibleIntegrationSettings(rawSettings);
    }

    return rawSettings;
  };

  const categorySettings = getCategorySettings();

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
      {/* Header */}
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              {t('admin:settings.title')}
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              {t('admin:settings.description')}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            {hasChanges && (
              <div className="flex items-center justify-center text-amber-600 text-sm py-2 sm:py-0">
                <AlertTriangle className="w-4 h-4 mr-1" />
                {t('admin:settings.actions.unsaved_changes')}
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => refetch()}
                className="flex-1 sm:flex-none inline-flex items-center justify-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 min-touch-target"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">{t('admin:settings.actions.refresh')}</span>
                <span className="sm:hidden">Refresh</span>
              </button>
              <button
                onClick={handleSave}
                disabled={!hasChanges || updateSettingsMutation.isLoading}
                className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed min-touch-target"
              >
                {updateSettingsMutation.isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    <span className="hidden sm:inline">{t('admin:settings.actions.saving')}</span>
                    <span className="sm:hidden">Saving</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {t('admin:settings.actions.save')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row">
        {/* Mobile Category Dropdown */}
        <div className="sm:hidden border-b border-gray-200 p-4">
          <label htmlFor="category-select" className="block text-sm font-medium text-gray-700 mb-2">
            Settings Category
          </label>
          <select
            id="category-select"
            value={activeCategory}
            onChange={(e) => {
              const newCategory = e.target.value;
              setActiveCategory(newCategory);
              // Force update of provider states when switching categories
              if (newCategory === 'email' && settings?.email) {
                const emailSettings = settings.email;
                const provider = emailSettings.email_service_provider?.value ||
                               emailSettings.email_provider?.value || 'smtp';
                setEmailProvider(provider);
              } else if (newCategory === 'translation' && settings?.translation) {
                const translationSettings = settings.translation;
                const provider = translationSettings.translation_provider?.value || 'claude';
                setTranslationProvider(provider);
              } else if (newCategory === 'integrations' && settings?.integrations) {
                const integrationSettings = settings.integrations;
                const provider = integrationSettings.incident_response_provider?.value || 'none';
                setIntegrationProvider(provider);
                const vercelEnabled = integrationSettings.vercel_firewall_enabled?.value || false;
                setVercelFirewallEnabled(vercelEnabled);
              }
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            {categories.map((category) => (
              <option key={category.key} value={category.key}>
                {category.label}
              </option>
            ))}
          </select>
        </div>

        {/* Desktop Category Sidebar */}
        <div className="hidden sm:block w-64 bg-gray-50 border-r border-gray-200">
          <nav className="p-4 space-y-2">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <button
                  key={category.key}
                  onClick={() => setActiveCategory(category.key)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeCategory === category.key
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center">
                    <Icon className="w-4 h-4 mr-3" />
                    <div>
                      <div className="font-medium">{category.label}</div>
                      <div className="text-xs text-gray-500 hidden lg:block">{category.description}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Settings Content */}
        <div className="flex-1 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
            <div>
              <h4 className="text-lg font-medium text-gray-900 flex items-center">
                {currentCategory && <currentCategory.icon className="w-5 h-5 mr-2" />}
                <span className="hidden sm:inline">{currentCategory?.label} Settings</span>
                <span className="sm:hidden">{currentCategory?.label}</span>
              </h4>
              <p className="text-sm text-gray-500 mt-1 hidden sm:block">{currentCategory?.description}</p>
            </div>
            <button
              onClick={() => handleReset(activeCategory)}
              disabled={resetSettingsMutation.isLoading}
              className="inline-flex items-center justify-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 min-touch-target"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              {t('admin:settings.actions.reset')}
            </button>
          </div>

          {/* Email Provider Selection */}
          {activeCategory === 'email' && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
              <h5 className="text-sm font-medium text-gray-900 mb-3">{t('admin:settings.email.provider_title')}</h5>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => handleEmailProviderChange('smtp')}
                  className={`flex-1 px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                    emailProvider === 'smtp'
                      ? 'bg-blue-600 text-white border-2 border-blue-600'
                      : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-blue-300'
                  }`}
                >
                  <div className="text-center">
                    <div className="font-semibold">{t('admin:settings.email.smtp_title')}</div>
                    <div className="text-xs opacity-75">{t('admin:settings.email.smtp_description')}</div>
                  </div>
                </button>
                <button
                  onClick={() => handleEmailProviderChange('mailersend')}
                  className={`flex-1 px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                    emailProvider === 'mailersend'
                      ? 'bg-blue-600 text-white border-2 border-blue-600'
                      : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-blue-300'
                  }`}
                >
                  <div className="text-center">
                    <div className="font-semibold">{t('admin:settings.email.mailersend_title')}</div>
                    <div className="text-xs opacity-75">{t('admin:settings.email.mailersend_description')}</div>
                  </div>
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-600">
                {t('admin:settings.email.provider_description')}
              </p>
            </div>
          )}

          {/* Translation Provider Selection */}
          {activeCategory === 'translation' && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
              <h5 className="text-sm font-medium text-gray-900 mb-3">Translation Provider</h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => handleTranslationProviderChange('claude')}
                  className={`px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                    translationProvider === 'claude'
                      ? 'bg-orange-600 text-white border-2 border-orange-600'
                      : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-orange-300'
                  }`}
                >
                  <div className="text-center">
                    <div className="font-semibold">🤖 Claude</div>
                    <div className="text-xs opacity-75">Best for maritime content</div>
                  </div>
                </button>
                <button
                  onClick={() => handleTranslationProviderChange('openai')}
                  className={`px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                    translationProvider === 'openai'
                      ? 'bg-green-600 text-white border-2 border-green-600'
                      : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-green-300'
                  }`}
                >
                  <div className="text-center">
                    <div className="font-semibold">🧠 OpenAI</div>
                    <div className="text-xs opacity-75">GPT-3.5 translations</div>
                  </div>
                </button>
                <button
                  onClick={() => handleTranslationProviderChange('microsoft')}
                  className={`px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                    translationProvider === 'microsoft'
                      ? 'bg-blue-600 text-white border-2 border-blue-600'
                      : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-blue-300'
                  }`}
                >
                  <div className="text-center">
                    <div className="font-semibold">🔷 Microsoft</div>
                    <div className="text-xs opacity-75">2M chars/month free</div>
                  </div>
                </button>
                <button
                  onClick={() => handleTranslationProviderChange('google')}
                  className={`px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                    translationProvider === 'google'
                      ? 'bg-red-600 text-white border-2 border-red-600'
                      : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-red-300'
                  }`}
                >
                  <div className="text-center">
                    <div className="font-semibold">🌐 Google</div>
                    <div className="text-xs opacity-75">500K chars/month free</div>
                  </div>
                </button>
              </div>
              <div className="mt-3 p-3 bg-blue-50 rounded-md">
                <p className="text-xs text-blue-800">
                  <strong>📝 Setup Guide:</strong> Choose your preferred provider and enter the API key below.
                  Claude offers the best maritime terminology understanding, while Microsoft and Google provide generous free tiers.
                </p>
              </div>
            </div>
          )}

          {/* Integration Provider Selection */}
          {activeCategory === 'integrations' && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
              <h5 className="text-sm font-medium text-gray-900 mb-3">Incident Response Provider</h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <button
                  onClick={() => handleIntegrationProviderChange('none')}
                  className={`px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                    integrationProvider === 'none'
                      ? 'bg-gray-600 text-white border-2 border-gray-600'
                      : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="text-center">
                    <div className="font-semibold">🚫 None</div>
                    <div className="text-xs opacity-75">No external alerts</div>
                  </div>
                </button>
                <button
                  onClick={() => handleIntegrationProviderChange('pagerduty')}
                  className={`px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                    integrationProvider === 'pagerduty'
                      ? 'bg-green-600 text-white border-2 border-green-600'
                      : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-green-300'
                  }`}
                >
                  <div className="text-center">
                    <div className="font-semibold">📟 PagerDuty</div>
                    <div className="text-xs opacity-75">Professional alerting</div>
                  </div>
                </button>
                <button
                  onClick={() => handleIntegrationProviderChange('slack')}
                  className={`px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                    integrationProvider === 'slack'
                      ? 'bg-purple-600 text-white border-2 border-purple-600'
                      : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-purple-300'
                  }`}
                >
                  <div className="text-center">
                    <div className="font-semibold">💬 Slack</div>
                    <div className="text-xs opacity-75">Team notifications</div>
                  </div>
                </button>
                <button
                  onClick={() => handleIntegrationProviderChange('webhook')}
                  className={`px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                    integrationProvider === 'webhook'
                      ? 'bg-blue-600 text-white border-2 border-blue-600'
                      : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-blue-300'
                  }`}
                >
                  <div className="text-center">
                    <div className="font-semibold">🔗 Webhook</div>
                    <div className="text-xs opacity-75">Custom endpoint</div>
                  </div>
                </button>
              </div>
              <div className="mt-3 p-3 bg-blue-50 rounded-md">
                <p className="text-xs text-blue-800">
                  <strong>🚨 Incident Response:</strong> Configure external services to receive critical incident notifications.
                  PagerDuty for professional on-call management, Slack for team alerts, or custom webhooks for integration.
                </p>
              </div>
            </div>
          )}

          {/* Vercel Firewall Toggle */}
          {activeCategory === 'integrations' && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
              <h5 className="text-sm font-medium text-gray-900 mb-3">🛡️ Vercel Firewall Integration</h5>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm text-gray-700">
                    Enable automatic IP blocking at the edge level based on failed login attempts
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Requires Vercel Pro plan and proper API credentials
                  </p>
                </div>
                <button
                  onClick={() => handleVercelFirewallToggle(!vercelFirewallEnabled)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    vercelFirewallEnabled ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      vercelFirewallEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
              {vercelFirewallEnabled && (
                <div className="mt-3 p-3 bg-amber-50 rounded-md">
                  <p className="text-xs text-amber-800">
                    <strong>⚠️ Configuration Required:</strong> Make sure to configure your Vercel access token, project ID, and block thresholds below.
                    Test the connection in the Vercel Firewall tab to verify the integration is working.
                  </p>
                </div>
              )}
            </div>
          )}

          <div key={`${activeCategory}-${emailProvider}-${translationProvider}-${integrationProvider}-${vercelFirewallEnabled}`} className="space-y-4 sm:space-y-6">
            {Object.entries(categorySettings).map(([key, setting]) => (
              <div key={`${activeCategory}-${key}`} className="border-b border-gray-200 pb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {formatSettingKey(key)}
                </label>
                {renderSettingInput(activeCategory, key, setting)}
              </div>
            ))}

            {Object.keys(categorySettings).length === 0 && (
              <div className="text-center py-12">
                <Settings className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">{t('admin:settings.empty.title')}</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {t('admin:settings.empty.message')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;
