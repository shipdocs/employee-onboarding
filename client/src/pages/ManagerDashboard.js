import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import CertificateList from '../components/CertificateManagement/CertificateList';
import CertificateDetails from '../components/CertificateManagement/CertificateDetails';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useForm } from 'react-hook-form';
import { formatDate } from '../utils/dateUtils';
import {
  Users,
  Plus,
  Mail,
  Calendar,
  Ship,
  CheckCircle,
  Clock,
  AlertCircle,
  X,
  Search,
  Filter,
  Edit,
  Trash2,
  MoreVertical,
  RefreshCw,
  Eye,
  UserCheck,
  UserX,
  FileText,
  Award,
  Globe
} from 'lucide-react';
import toast from 'react-hot-toast';
import managerService from '../services/managerService';
import LoadingSpinner from '../components/LoadingSpinner';
import { useTranslation } from 'react-i18next';

const ManagerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
const { t, i18n } = useTranslation(['manager', 'dashboard', 'common', 'forms', 'api']);

  // Debug translation loading
  React.useEffect(() => {
    // console.log('Translation Debug:', {
    //   currentLanguage: i18n.language,
    //   isInitialized: i18n.isInitialized,
    //   hasResources: i18n.hasResourceBundle(i18n.language, 'manager'),
    //   testTranslation: t('dashboard.title'),
    //   testCommonTranslation: t('common:manager.crew_management')
    // });
  }, [i18n, t]);
  const [activeTab, setActiveTab] = useState('crew');
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedCrewMembers, setSelectedCrewMembers] = useState([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [viewingMember, setViewingMember] = useState(null);
  const queryClient = useQueryClient();

  // Available languages
  const languages = [
    { code: 'en', name: 'English', flag: 'EN' },
    { code: 'nl', name: 'Nederlands', flag: 'NL' }
  ];

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm();

  // Separate form for editing
  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    formState: { errors: errorsEdit },
    reset: resetEdit,
    setValue: setValueEdit
  } = useForm();

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery(
    'dashboard-stats',
    managerService.getDashboardStats
  );

  // Fetch crew members
  const { data: crewMembers, isLoading: crewLoading } = useQuery(
    'crew-members',
    managerService.getCrewMembers
  );

  // Fetch pending quiz reviews
  const { data: pendingQuizReviews, isLoading: quizReviewsLoading } = useQuery(
    'pending-quiz-reviews',
    managerService.getPendingQuizReviews,
    {
      enabled: activeTab === 'quiz-reviews'
    }
  );

  // Fetch onboarding reviews
  const { data: onboardingReviews, isLoading: onboardingReviewsLoading } = useQuery(
    'onboarding-reviews',
    managerService.getOnboardingReviews,
    {
      enabled: activeTab === 'onboarding-reviews'
    }
  );

  // Removed template access for managers - only admins can manage templates

  // Fetch certificates
  const { data: certificates, isLoading: certificatesLoading } = useQuery(
    'certificates',
    managerService.getCertificates,
    {
      enabled: activeTab === 'certificates'
    }
  );

  // Create crew member mutation
  const createCrewMutation = useMutation(
    managerService.createCrewMember,
    {
      onSuccess: () => {
        queryClient.invalidateQueries('crew-members');
        queryClient.invalidateQueries('dashboard-stats');
        toast.success(t('manager:dashboard.messages.crewCreated'));
        setShowCreateForm(false);
        reset();
      },
      onError: (error) => {
        const message = error.response?.data?.error || t('manager:dashboard.messages.crewCreateFailed');
        toast.error(message);
      }
    }
  );

  // Send magic link mutation
  const sendMagicLinkMutation = useMutation(
    managerService.sendMagicLink,
    {
      onSuccess: () => {
        toast.success(t('manager:dashboard.messages.magicLinkSent'));
      },
      onError: (error) => {
        const message = error.response?.data?.error || t('manager:dashboard.messages.magicLinkFailed');
        toast.error(message);
      }
    }
  );

  // Update crew member mutation
  const updateCrewMutation = useMutation(
    ({ id, data }) => managerService.updateCrewMember(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('crew-members');
        queryClient.invalidateQueries('dashboard-stats');
        toast.success(t('manager:dashboard.messages.crewUpdated'));
        setEditingMember(null);
      },
      onError: (error) => {
        const message = error.response?.data?.error || t('manager:dashboard.messages.crewUpdateFailed');
        toast.error(message);
      }
    }
  );

  // Delete crew member mutation
  const deleteCrewMutation = useMutation(
    ({ id, forceDelete }) => managerService.deleteCrewMember(id, forceDelete),
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries('crew-members');
        queryClient.invalidateQueries('dashboard-stats');
        toast.success(data.message);
      },
      onError: (error) => {
        const errorData = error.response?.data;

        // Check if this is a confirmation request
        if (error.response?.status === 409 && errorData?.requiresConfirmation) {
          const { crewMember } = errorData;
          const confirmMessage = `${crewMember.name} has training records.\n\n${errorData.message}\n\nDo you want to proceed?`;

          if (window.confirm(confirmMessage)) {
            // Retry with forceDelete
            const memberId = error.config.url.match(/\/crew\/(\d+)/)?.[1];
            if (memberId) {
              deleteCrewMutation.mutate({ id: memberId, forceDelete: true });
            }
          }
        } else {
          const message = errorData?.error || t('manager:dashboard.messages.crewDeleteFailed');
          toast.error(message);
        }
      }
    }
  );

  // Bulk action mutation
  const bulkActionMutation = useMutation(
    ({ action, userIds }) => managerService.bulkAction(action, userIds),
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries('crew-members');
        queryClient.invalidateQueries('dashboard-stats');
        toast.success(data.message);
        setSelectedCrewMembers([]);
        setShowBulkActions(false);
      },
      onError: (error) => {
        const message = error.response?.data?.error || t('api:errors.general.serverError');
        toast.error(message);
      }
    }
  );

  // Quiz review mutation
  const reviewQuizMutation = useMutation(
    ({ quizId, reviewData }) => managerService.reviewQuiz(quizId, reviewData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('pending-quiz-reviews');
        queryClient.invalidateQueries('onboarding-reviews');
        toast.success(t('manager:dashboard.messages.quizReviewed'));
      },
      onError: (error) => {
        const message = error.response?.data?.error || t('manager:dashboard.messages.quizReviewFailed');
        toast.error(message);
      }
    }
  );

  // Onboarding approval mutation
  const approveOnboardingMutation = useMutation(
    managerService.approveOnboarding,
    {
      onSuccess: () => {
        queryClient.invalidateQueries('onboarding-reviews');
        queryClient.invalidateQueries('crew-members');
        queryClient.invalidateQueries('dashboard-stats');
        toast.success(t('manager:dashboard.messages.onboardingApproved'));
      },
      onError: (error) => {
        const message = error.response?.data?.error || t('manager:dashboard.messages.onboardingApproveFailed');
        toast.error(message);
      }
    }
  );

  const onSubmit = (data) => {
    const crewData = {
      ...data,
      preferredLanguage: data.preferredLanguage || 'en'
    };
    createCrewMutation.mutate(crewData);
  };

  const onEditSubmit = (data) => {
    updateCrewMutation.mutate({ id: editingMember.id, data });
  };

  // Populate edit form when editingMember changes
  React.useEffect(() => {
    if (editingMember) {
      setValueEdit('firstName', editingMember.firstName);
      setValueEdit('lastName', editingMember.lastName);
      setValueEdit('email', editingMember.email);
      setValueEdit('position', editingMember.position);
      setValueEdit('vesselAssignment', editingMember.vesselAssignment);
      setValueEdit('expectedBoardingDate', editingMember.expectedBoardingDate);
      setValueEdit('contactPhone', editingMember.contactPhone || '');
      setValueEdit('emergencyContactName', editingMember.emergencyContactName || '');
      setValueEdit('emergencyContactPhone', editingMember.emergencyContactPhone || '');
      setValueEdit('status', editingMember.status);
      setValueEdit('preferredLanguage', editingMember.preferredLanguage || 'en');
    }
  }, [editingMember, setValueEdit]);

  const handleSendMagicLink = (crewId) => {
    sendMagicLinkMutation.mutate(crewId);
  };

  const handleSendSafetyPDF = async (crewId) => {
    try {
      await managerService.sendSafetyPDF(crewId);
      toast.success(t('manager:dashboard.messages.safetyPdfSent'));
    } catch (error) {
      toast.error(t('manager:dashboard.messages.safetyPdfFailed', { error: error.message }));
    }
  };

  const handleSendOnboardingStart = async (crewId) => {
    try {
      await managerService.sendOnboardingStart(crewId);
      toast.success(t('manager:dashboard.messages.onboardingEmailSent'));
    } catch (error) {
      toast.error(t('manager:dashboard.messages.onboardingEmailFailed', { error: error.message }));
    }
  };

  const handleResendCompletionEmail = async (crewId, crewName) => {
    const comments = prompt(
      `Resend completion email to ${crewName}?\n\nOptional comments for the email:`,
      'Email resent by manager'
    );

    if (comments === null) return; // User cancelled

    try {
      await managerService.resendCompletionEmail(crewId, comments);
      toast.success(`Completion email resent successfully to ${crewName}`);
    } catch (error) {
      toast.error(`Failed to resend completion email: ${error.message}`);
    }
  };

  const handleDeleteMember = (member) => {
    if (window.confirm(t('manager:dashboard.messages.deleteConfirm', { name: `${member.firstName} ${member.lastName}` }))) {
      deleteCrewMutation.mutate({ id: member.id, forceDelete: false });
    }
  };

  const handleSelectAll = () => {
    if (selectedCrewMembers.length === filteredCrewMembers.length) {
      setSelectedCrewMembers([]);
    } else {
      setSelectedCrewMembers(filteredCrewMembers.map(member => member.id));
    }
  };

  const handleSelectMember = (id) => {
    setSelectedCrewMembers(prev =>
      prev.includes(id)
        ? prev.filter(memberId => memberId !== id)
        : [...prev, id]
    );
  };

  const handleBulkAction = (action) => {
    if (selectedCrewMembers.length === 0) {
      toast.error(t('manager:dashboard.bulk.selectFirst'));
      return;
    }

    if (action === 'delete') {
      if (window.confirm(t('manager:dashboard.messages.bulkDeleteConfirm', { count: selectedCrewMembers.length }))) {
        bulkActionMutation.mutate({ action, userIds: selectedCrewMembers });
      }
    } else {
      bulkActionMutation.mutate({ action, userIds: selectedCrewMembers });
    }
  };

  const handleQuizReview = (quizId, approved, comments = '') => {
    const reviewData = {
      action: approved ? 'approve' : 'reject',
      comments: comments
    };
    reviewQuizMutation.mutate({ quizId, reviewData });
  };

  const handleApproveOnboarding = (userId) => {
    if (window.confirm(t('manager:dashboard.messages.approveOnboardingConfirm'))) {
      approveOnboardingMutation.mutate(userId);
    }
  };

  // Template management removed - only admins can manage templates

  // Filter crew members
  const filteredCrewMembers = crewMembers?.filter(member => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      (member.firstName || '').toLowerCase().includes(searchLower) ||
      (member.lastName || '').toLowerCase().includes(searchLower) ||
      (member.email || '').toLowerCase().includes(searchLower) ||
      (member.position || '').toLowerCase().includes(searchLower) ||
      (member.vesselAssignment || '').toLowerCase().includes(searchLower);

    const matchesStatus = statusFilter === 'all' || member.status === statusFilter;

    return matchesSearch && matchesStatus;
  }) || [];

  const getStatusBadge = (status) => {
    const badges = {
      not_started: 'badge badge-warning',
      in_progress: 'badge badge-info',
      forms_completed: 'badge badge-primary',
      training_completed: 'badge badge-accent',
      fully_completed: 'badge badge-success',
      suspended: 'badge badge-secondary'
    };
    return badges[status] || 'badge badge-secondary';
  };

  const getStatusDisplayName = (status) => {
    const names = {
      not_started: t('manager:dashboard.status.notStarted'),
      in_progress: t('manager:dashboard.status.inProgress'),
      forms_completed: t('manager:dashboard.status.formsCompleted'),
      training_completed: t('manager:dashboard.status.trainingCompleted'),
      fully_completed: t('manager:dashboard.status.fullyCompleted'),
      suspended: t('manager:dashboard.status.suspended')
    };
    return names[status] || status;
  };

  if (statsLoading || crewLoading) {
    return <LoadingSpinner message={t('common:loading.default')} />;
  }

  return (
    <div className="space-y-8 max-w-none">
      {/* Header */}
      <div className="glass-card-elevated p-4 sm:p-8 hover-lift">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
<h1 className="text-2xl sm:text-4xl font-bold text-gradient-navy mb-2">{t('dashboard.title')}</h1>
            <p className="text-slate-600 text-base sm:text-lg">{t('dashboard.sections.crew.description')}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <button
              onClick={() => {
                queryClient.invalidateQueries('crew-members');
                queryClient.invalidateQueries('dashboard-stats');
                queryClient.invalidateQueries('pending-quiz-reviews');
                queryClient.invalidateQueries('onboarding-reviews');
                queryClient.invalidateQueries('certificates');
              }}
              className="glass-input px-4 py-2 text-slate-700 hover:text-slate-900 transition-all duration-300 flex items-center justify-center gap-2 rounded-xl min-touch-target"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">{t('common:general.refresh')}</span>
              <span className="sm:hidden">Refresh</span>
            </button>
            {activeTab === 'crew' && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="glass-button text-white px-6 py-2 flex items-center justify-center gap-2 rounded-xl min-touch-target"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">{t('manager:dashboard.sections.crew.add')}</span>
                <span className="sm:hidden">{t('manager:dashboard.sections.crew.add')}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="glass-card p-2">
        <nav className="flex flex-wrap sm:space-x-2 gap-2">
          <button
            onClick={() => setActiveTab('crew')}
            className={`py-2 sm:py-3 px-3 sm:px-6 rounded-xl font-medium text-xs sm:text-sm transition-all duration-300 flex items-center justify-center gap-2 min-touch-target flex-1 sm:flex-none ${
              activeTab === 'crew'
                ? 'glass-button text-white shadow-lg'
                : 'text-slate-600 hover:text-slate-800 hover:bg-white/30'
            }`}
          >
            <Users className="h-4 w-4" />
{t('common:manager.crew_management')}
          </button>
          <button
            onClick={() => setActiveTab('quiz-reviews')}
            className={`py-2 sm:py-3 px-3 sm:px-6 rounded-xl font-medium text-xs sm:text-sm transition-all duration-300 flex items-center justify-center gap-2 min-touch-target flex-1 sm:flex-none ${
              activeTab === 'quiz-reviews'
                ? 'glass-button text-white shadow-lg'
                : 'text-slate-600 hover:text-slate-800 hover:bg-white/30'
            }`}
          >
            <CheckCircle className="h-4 w-4" />
{t('common:manager.quiz_reviews')}
            {pendingQuizReviews?.length > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                {pendingQuizReviews.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('onboarding-reviews')}
            className={`py-2 sm:py-3 px-3 sm:px-6 rounded-xl font-medium text-xs sm:text-sm transition-all duration-300 flex items-center justify-center gap-2 min-touch-target flex-1 sm:flex-none ${
              activeTab === 'onboarding-reviews'
                ? 'glass-button text-white shadow-lg'
                : 'text-slate-600 hover:text-slate-800 hover:bg-white/30'
            }`}
          >
            <AlertCircle className="h-4 w-4" />
{t('common:manager.onboarding_reviews')}
          </button>
          <button
            onClick={() => setActiveTab('compliance')}
            className={`py-3 px-6 rounded-xl font-medium text-sm transition-all duration-300 flex items-center gap-2 ${
              activeTab === 'compliance'
                ? 'glass-button text-white shadow-lg'
                : 'text-slate-600 hover:text-slate-800 hover:bg-white/30'
            }`}
          >
            <FileText className="h-4 w-4" />
{t('common:general.compliance_metrics')}
          </button>
          <button
            onClick={() => setActiveTab('certificates')}
            className={`py-3 px-6 rounded-xl font-medium text-sm transition-all duration-300 flex items-center gap-2 ${
              activeTab === 'certificates'
                ? 'glass-button text-white shadow-lg'
                : 'text-slate-600 hover:text-slate-800 hover:bg-white/30'
            }`}
          >
            <Award className="h-4 w-4" />
{t('common:manager.certificates')}
          </button>
          {user?.permissions?.includes('content_edit') && (
            <button
              onClick={() => navigate('/content')}
              className="py-3 px-6 rounded-xl font-medium text-sm transition-all duration-300 flex items-center gap-2 text-slate-600 hover:text-slate-800 hover:bg-white/30"
            >
              <Edit className="h-4 w-4" />
              {t('dashboard.contentManagement')}
            </button>
          )}
        </nav>
      </div>

      {/* Crew Management Tab */}
      {activeTab === 'crew' && (
        <>
          {/* Search and Filter Bar */}
          <div className="glass-card p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex-1 sm:max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder={t('manager:dashboard.sections.crew.search')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="glass-input pl-10 pr-4 py-3 w-full"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="glass-input px-4 py-3 flex-1 sm:flex-none"
                  >
                    <option value="all">{t('manager:dashboard.filters.allStatus')}</option>
                    <option value="not_started">{t('manager:dashboard.filters.notStarted')}</option>
                    <option value="in_progress">{t('manager:dashboard.filters.inProgress')}</option>
                    <option value="forms_completed">{t('manager:dashboard.filters.formsCompleted')}</option>
                    <option value="training_completed">{t('manager:dashboard.filters.trainingCompleted')}</option>
                    <option value="fully_completed">{t('manager:dashboard.filters.fullyCompleted')}</option>
                    <option value="suspended">{t('manager:dashboard.filters.suspended')}</option>
                  </select>
                </div>

                {selectedCrewMembers.length > 0 && (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <span className="text-sm text-gray-600 text-center sm:text-left">
                      {selectedCrewMembers.length} selected
                    </span>
                    <div className="flex gap-1">
                  <button
                    onClick={() => handleBulkAction('activate')}
                    className="btn btn-sm btn-success"
                    title="Activate selected"
                  >
                    <UserCheck className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => handleBulkAction('deactivate')}
                    className="btn btn-sm btn-secondary"
                    title="Deactivate selected"
                  >
                    <UserX className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => handleBulkAction('send-magic-links')}
                    className="btn btn-sm btn-outline"
                    title="Send magic links"
                  >
                    <Mail className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => handleBulkAction('delete')}
                    className="btn btn-sm btn-danger"
                    title="Delete selected"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div
          className="glass-card p-4 md:p-6 hover-lift cursor-pointer transition-all duration-200 hover:shadow-lg touch-target"
          onClick={() => setActiveTab('crew')}
        >
          <div className="flex items-center">
            <div className="p-2 md:p-3 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 text-white">
              <Users className="h-6 w-6 md:h-8 md:w-8" />
            </div>
            <div className="ml-3 md:ml-4">
<p className="text-xs md:text-sm font-medium text-slate-600">{t('manager:dashboard.stats.total_crew')}</p>
              <p className="text-2xl md:text-3xl font-bold text-gradient-navy">{stats?.totalCrew || 0}</p>
            </div>
          </div>
        </div>

        <div
          className="glass-card p-4 md:p-6 hover-lift cursor-pointer transition-all duration-200 hover:shadow-lg touch-target"
          onClick={() => setActiveTab('quiz-reviews')}
        >
          <div className="flex items-center">
            <div className="p-2 md:p-3 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white">
              <Clock className="h-6 w-6 md:h-8 md:w-8" />
            </div>
            <div className="ml-3 md:ml-4">
<p className="text-xs md:text-sm font-medium text-slate-600">{t('common:general.pending_reviews')}</p>
              <p className="text-2xl md:text-3xl font-bold text-gradient-navy">{(pendingQuizReviews?.length || 0) + (onboardingReviews?.length || 0)}</p>
            </div>
          </div>
        </div>

        <div
          className="glass-card p-4 md:p-6 hover-lift cursor-pointer transition-all duration-200 hover:shadow-lg touch-target"
          onClick={() => setActiveTab('crew')}
        >
          <div className="flex items-center">
            <div className="p-2 md:p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <AlertCircle className="h-6 w-6 md:h-8 md:w-8" />
            </div>
            <div className="ml-3 md:ml-4">
              <p className="text-xs md:text-sm font-medium text-slate-600">{t('dashboard.status.inProgress')}</p>
              <p className="text-2xl md:text-3xl font-bold text-gradient-navy">{stats?.activeTraining || 0}</p>
            </div>
          </div>
        </div>

        <div
          className="glass-card p-4 md:p-6 hover-lift cursor-pointer transition-all duration-200 hover:shadow-lg touch-target"
          onClick={() => setActiveTab('crew')}
        >
          <div className="flex items-center">
            <div className="p-2 md:p-3 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-600 text-white">
              <Clock className="h-6 w-6 md:h-8 md:w-8" />
            </div>
            <div className="ml-3 md:ml-4">
              <p className="text-xs md:text-sm font-medium text-slate-600">{t('dashboard.status.notStarted')}</p>
              <p className="text-2xl md:text-3xl font-bold text-gradient-navy">{stats?.notStarted || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Crew Members Table */}
      <div className="glass-card hover-lift">
        <div className="p-6 border-b border-white/20">
<h2 className="text-2xl font-bold text-gradient-navy">{t('common:manager.crew_management')}</h2>
          <p className="text-slate-600 mt-2">{t('manager:dashboard.sections.crew.description')}</p>
        </div>
        <div className="p-4">
          {/* Mobile Card View */}
          <div className="block md:hidden">
            <div className="space-y-4">
              {filteredCrewMembers?.map((member) => (
                <div key={member.id} className="bg-white/70 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">
                        {member.firstName} {member.lastName}
                      </h3>
                      <p className="text-xs text-gray-500 truncate">{member.email}</p>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedCrewMembers.includes(member.id)}
                        onChange={() => handleSelectMember(member.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div>
                      <span className="text-gray-500">{t('manager:dashboard.table.headers.position')}:</span>
                      <div className="font-medium">{member.position}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">{t('manager:dashboard.table.headers.vessel')}:</span>
                      <div className="font-medium flex items-center">
                        <Ship className="h-3 w-3 text-gray-400 mr-1" />
                        <span className="truncate">{member.vesselAssignment}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">{t('manager:dashboard.table.headers.boardingDate')}:</span>
                      <div className="font-medium flex items-center">
                        <Calendar className="h-3 w-3 text-gray-400 mr-1" />
                        <span>{formatDate(member.expectedBoardingDate)}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">{t('manager:dashboard.table.headers.status')}:</span>
                      <div>
                        <span className={getStatusBadge(member.status)}>
                          {getStatusDisplayName(member.status)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Mobile Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setViewingMember(member)}
                        className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors touch-target"
                        title="View crew member details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleSendMagicLink(member.id)}
                        disabled={sendMagicLinkMutation.isLoading}
                        className="p-2 text-green-600 hover:text-green-900 hover:bg-green-50 rounded-lg transition-colors touch-target"
                        title="Send magic link"
                      >
                        <Mail className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setEditingMember(member)}
                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors touch-target"
                        title="Edit crew member"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleSendSafetyPDF(member.id)}
                        className="p-2 text-orange-600 hover:text-orange-900 hover:bg-orange-50 rounded-lg transition-colors touch-target"
                        title="Send Safety Management PDF"
                      >
                        🛡️
                      </button>
                      <button
                        onClick={() => handleSendOnboardingStart(member.id)}
                        className="p-2 text-emerald-600 hover:text-emerald-900 hover:bg-emerald-50 rounded-lg transition-colors touch-target"
                        title="Send Onboarding Start Email"
                      >
                        🚢
                      </button>
                      {member.status === 'fully_completed' && (
                        <button
                          onClick={() => handleResendCompletionEmail(member.id, `${member.firstName} ${member.lastName}`)}
                          className="p-2 text-purple-600 hover:text-purple-900 hover:bg-purple-50 rounded-lg transition-colors touch-target"
                          title="Resend Completion Email"
                        >
                          📧
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteMember(member)}
                        disabled={deleteCrewMutation.isLoading}
                        className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors touch-target"
                        title="Delete crew member"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full min-w-full">
              <thead className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-t-xl">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider rounded-tl-xl">
                    <input
                      type="checkbox"
                      checked={selectedCrewMembers.length === filteredCrewMembers.length && filteredCrewMembers.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    {t('manager:dashboard.table.headers.name')}
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    {t('manager:dashboard.table.headers.position')}
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    {t('manager:dashboard.table.headers.vessel')}
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    {t('manager:dashboard.table.headers.boardingDate')}
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    {t('manager:dashboard.table.headers.status')}
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider rounded-tr-xl">
                    {t('manager:dashboard.table.headers.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white/50 divide-y divide-slate-200">
                {filteredCrewMembers?.map((member) => (
                  <tr key={member.id} className="hover:bg-white/80 transition-colors duration-200">
                    <td className="px-3 py-3 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedCrewMembers.includes(member.id)}
                        onChange={() => handleSelectMember(member.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {member.firstName} {member.lastName}
                        </div>
                        <div className="text-xs text-gray-500 truncate max-w-32">{member.email}</div>
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">
                      {member.position}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <Ship className="h-3 w-3 text-gray-400 mr-1" />
                        <span className="truncate">{member.vesselAssignment}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <Calendar className="h-3 w-3 text-gray-400 mr-1" />
                        <span className="text-xs">{formatDate(member.expectedBoardingDate)}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className={getStatusBadge(member.status)}>
                        {getStatusDisplayName(member.status)}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => setViewingMember(member)}
                          className="p-1 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded transition-colors"
                          title={t('manager:dashboard.tooltips.viewCrewMember')}
                        >
                          <Eye className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleSendMagicLink(member.id)}
                          disabled={sendMagicLinkMutation.isLoading}
                          className="p-1 text-green-600 hover:text-green-900 hover:bg-green-50 rounded transition-colors"
                          title={t('manager:dashboard.tooltips.sendMagicLink')}
                        >
                          <Mail className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleSendSafetyPDF(member.id)}
                          className="p-1 text-orange-600 hover:text-orange-900 hover:bg-orange-50 rounded transition-colors"
                          title={t('manager:dashboard.tooltips.sendSafetyPDF')}
                        >
                          🛡️
                        </button>
                        <button
                          onClick={() => handleSendOnboardingStart(member.id)}
                          className="p-1 text-emerald-600 hover:text-emerald-900 hover:bg-emerald-50 rounded transition-colors"
                          title={t('manager:dashboard.tooltips.sendOnboardingStart')}
                        >
                          🚢
                        </button>
                        {member.status === 'fully_completed' && (
                          <button
                            onClick={() => handleResendCompletionEmail(member.id, `${member.firstName} ${member.lastName}`)}
                            className="p-1 text-purple-600 hover:text-purple-900 hover:bg-purple-50 rounded transition-colors"
                            title={t('manager:dashboard.tooltips.resendCompletionEmail')}
                          >
                            📧
                          </button>
                        )}
                        <button
                          onClick={() => setEditingMember(member)}
                          className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded transition-colors"
                          title={t('manager:dashboard.tooltips.editCrewMember')}
                        >
                          <Edit className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteMember(member)}
                          disabled={deleteCrewMutation.isLoading}
                          className="p-1 text-red-600 hover:text-red-900 hover:bg-red-50 rounded transition-colors"
                          title={t('manager:dashboard.tooltips.deleteCrewMember')}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
        </>
      )}

      {/* Quiz Reviews Tab */}
      {activeTab === 'quiz-reviews' && (
        <div className="space-y-6">
          {quizReviewsLoading ? (
            <LoadingSpinner message={t('common:loading.quiz')} />
          ) : (
            <div className="glass-card hover-lift">
              <div className="p-8 border-b border-white/20">
                <h2 className="text-2xl font-bold text-gradient-navy">{t('dashboard.sections.quizReviews.title')}</h2>
                <p className="text-slate-600 mt-2">{t('dashboard.sections.quizReviews.description')}</p>
              </div>
              <div className="p-6">
                {pendingQuizReviews?.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">{t('dashboard.sections.quizReviews.empty')}</h3>
                    <p className="text-gray-600">{t('dashboard.sections.quizReviews.emptyDescription')}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-t-xl">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider rounded-tl-xl">
                            Crew Member
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                            Phase
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                            Score
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                            Submitted
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider rounded-tr-xl">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white/50 divide-y divide-slate-200">
                        {pendingQuizReviews?.map((review) => (
                          <tr key={review.id} className="hover:bg-white/80 transition-colors duration-200">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {review.first_name} {review.last_name}
                                </div>
                                <div className="text-sm text-gray-500">{review.email}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="badge badge-info">{t('training.phase')} {review.phase}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {review.score}/{review.total_questions} ({Math.round((review.score / review.total_questions) * 100)}%)
                              </div>
                              <div className={`text-sm ${review.passed ? 'text-green-600' : 'text-red-600'}`}>
                                {review.passed ? 'Passed' : 'Failed'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date(review.completed_at).toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => handleQuizReview(review.id, true)}
                                  disabled={reviewQuizMutation.isLoading}
                                  className="btn btn-sm btn-success"
                                  title="Approve quiz"
                                >
                                  <CheckCircle className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={() => handleQuizReview(review.id, false, 'Quiz requires review')}
                                  disabled={reviewQuizMutation.isLoading}
                                  className="btn btn-sm btn-danger"
                                  title="Reject quiz"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Onboarding Reviews Tab */}
      {activeTab === 'onboarding-reviews' && (
        <div className="space-y-6">
          {onboardingReviewsLoading ? (
            <LoadingSpinner message={t('common:loading.content')} />
          ) : (
            <div className="glass-card hover-lift">
              <div className="p-8 border-b border-white/20">
                <h2 className="text-2xl font-bold text-gradient-navy">{t('dashboard.sections.onboardingReviews.title')}</h2>
                <p className="text-slate-600 mt-2">{t('dashboard.sections.onboardingReviews.description')}</p>
              </div>
              <div className="p-6">
                {onboardingReviews?.length === 0 ? (
                  <div className="text-center py-12">
                    <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">{t('dashboard.sections.quizReviews.empty')}</h3>
                    <p className="text-gray-600">{t('dashboard.sections.onboardingReviews.emptyDescription')}</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {(Array.isArray(onboardingReviews) ? onboardingReviews : []).map((review) => (
                      <div key={review.user.id} className="glass-card p-8 hover-lift">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {review.user.firstName} {review.user.lastName}
                            </h3>
                            <p className="text-gray-600">{review.user.email} • {review.user.position}</p>
                            <p className="text-sm text-gray-500">{t('profile.vessel')}: {review.user.vesselAssignment}</p>
                          </div>
                          <span className={`badge ${getStatusBadge(review.user.status)}`}>
                            {review.user.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          {(Array.isArray(review.phases) ? review.phases : []).map((phase) => (
                            <div key={phase.phase} className="bg-gray-50 rounded-lg p-4">
                              <h4 className="font-medium text-gray-900 mb-2">{t('training.phase')} {phase.phase}</h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span>Training Items:</span>
                                  <span className={phase.completedItems === phase.totalItems ? 'text-green-600' : 'text-yellow-600'}>
                                    {phase.completedItems}/{phase.totalItems}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Quiz:</span>
                                  <span className={
                                    phase.quiz?.reviewStatus === 'approved' ? 'text-green-600' :
                                    phase.quiz?.reviewStatus === 'rejected' ? 'text-red-600' :
                                    'text-yellow-600'
                                  }>
                                    {phase.quiz ? phase.quiz.reviewStatus : 'Not taken'}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span>{t('common.status')}:</span>
                                  <span className={phase.status === 'completed' ? 'text-green-600' : 'text-yellow-600'}>
                                    {phase.status}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="flex justify-end">
                          <button
                            onClick={() => handleApproveOnboarding(review.user.id)}
                            disabled={approveOnboardingMutation.isLoading}
                            className="btn btn-success"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve Complete Onboarding
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Compliance Dashboard Tab */}
      {activeTab === 'compliance' && (
        <div className="space-y-6">
          {/* Compliance Overview */}
          <div className="glass-card p-6">
            <h2 className="text-2xl font-bold text-gradient-navy mb-6">{t('general.compliance_metrics')}</h2>

            {/* Compliance Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="glass-card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">{t('general.overall_completion_rate')}</p>
                    <p className="text-2xl font-bold text-green-600">
                      {stats?.completionRates?.overall || 0}%
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </div>

              <div className="glass-card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">{t('general.pending_reviews')}</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {(pendingQuizReviews?.length || 0) + (onboardingReviews?.length || 0)}
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-orange-500" />
                </div>
              </div>

              <div className="glass-card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">{t('dashboard.certificates.issued')}</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {certificates?.length || 0}
                    </p>
                  </div>
                  <Award className="h-8 w-8 text-blue-500" />
                </div>
              </div>
            </div>

            {/* Training Progress by Position */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">{t('dashboard.sections.compliance.trainingProgress')}</h3>
              <div className="space-y-3">
                {['Deksman', 'Lichtmatroos', 'Matroos', 'Volmatroos', 'Stuurman', 'Kapitein'].map(position => {
                  const positionCrew = filteredCrewMembers.filter(member => member.position === position);
                  const completedCrew = positionCrew.filter(member => member.status === 'fully_completed');
                  const completionRate = positionCrew.length > 0 ? Math.round((completedCrew.length / positionCrew.length) * 100) : 0;

                  return (
                    <div key={position} className="flex items-center justify-between p-3 glass-card">
                      <div className="flex items-center space-x-3">
                        <span className="font-medium text-slate-700">{position}</span>
                        <span className="text-sm text-slate-500">
                          ({completedCrew.length}/{positionCrew.length})
                        </span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${completionRate}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-slate-700 w-12 text-right">
                          {completionRate}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Activity */}
            <div>
              <h3 className="text-lg font-semibold text-slate-800 mb-4">{t('general.recent_activity')}</h3>
              <div className="space-y-3">
                {/* Show recent completions, reviews, etc. */}
                <div className="glass-card p-4">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="text-sm font-medium text-slate-700">
                        {stats?.recentActivity?.completedSessions || 0} training sessions completed this week
                      </p>
                      <p className="text-xs text-slate-500">{t('dashboard.sections.compliance.lastUpdated', { date: new Date().toLocaleDateString() })}</p>
                    </div>
                  </div>
                </div>

                <div className="glass-card p-4">
                  <div className="flex items-center space-x-3">
                    <Clock className="h-5 w-5 text-orange-500" />
                    <div>
                      <p className="text-sm font-medium text-slate-700">
                        {pendingQuizReviews?.length || 0} quiz reviews pending your approval
                      </p>
                      <p className="text-xs text-slate-500">{t('dashboard.sections.compliance.requiresAttention')}</p>
                    </div>
                  </div>
                </div>

                <div className="glass-card p-4">
                  <div className="flex items-center space-x-3">
                    <Award className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="text-sm font-medium text-slate-700">
                        {certificates?.length || 0} certificates issued this month
                      </p>
                      <p className="text-xs text-slate-500">{t('dashboard.sections.compliance.certificatesDistributed')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Certificates Tab */}
      {activeTab === 'certificates' && (
        <div className="space-y-6">
          {certificatesLoading ? (
            <LoadingSpinner message={t('common:loading.content')} />
          ) : (
            <>
              {/* Import the CertificateList component */}
              <CertificateList
                onViewCertificate={(certificate) => setSelectedCertificate(certificate)}
                onRegenerateCertificate={(certificate) => setSelectedCertificate(certificate)}
                onDeleteCertificate={(certificate) => {
                  if (window.confirm('Are you sure you want to delete this certificate? This action cannot be undone.')) {
                    managerService.deleteCertificate(certificate.id)
                      .then(() => {
                        queryClient.invalidateQueries('certificates');
                        toast.success('Certificate deleted successfully');
                      })
                      .catch((error) => {
                        toast.error(`Failed to delete certificate: ${error.message}`);
                      });
                  }
                }}
              />
            </>
          )}
        </div>
      )}

      {/* Create Crew Member Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto modal-mobile">
            <div className="flex justify-between items-center p-4 md:p-6 border-b">
              <h3 className="text-lg font-semibold">{t('forms:addCrewMember.title')}</h3>
              <button
                onClick={() => setShowCreateForm(false)}
                className="text-gray-400 hover:text-gray-600 p-2 touch-target"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-4 md:p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">{t('forms:addCrewMember.fields.firstName')}</label>
                  <input
                    type="text"
                    className={`form-input ${errors.firstName ? 'error' : ''}`}
                    {...register('firstName', { required: 'First name is required' })}
                  />
                  {errors.firstName && (
                    <p className="form-error">{errors.firstName.message}</p>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">{t('forms:addCrewMember.fields.lastName')}</label>
                  <input
                    type="text"
                    className={`form-input ${errors.lastName ? 'error' : ''}`}
                    {...register('lastName', { required: 'Last name is required' })}
                  />
                  {errors.lastName && (
                    <p className="form-error">{errors.lastName.message}</p>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">{t('forms:addCrewMember.fields.email')}</label>
                <input
                  type="email"
                  className={`form-input ${errors.email ? 'error' : ''}`}
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address'
                    }
                  })}
                />
                {errors.email && (
                  <p className="form-error">{errors.email.message}</p>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">{t('forms:addCrewMember.fields.position')}</label>
                <select
                  className={`form-input form-select ${errors.position ? 'error' : ''}`}
                  {...register('position', { required: 'Position is required' })}
                >
                  <option value="">{t('forms:selectPosition')}</option>
                  <option value="Deksman">Deksman</option>
                  <option value="Lichtmatroos">Lichtmatroos</option>
                  <option value="Matroos">Matroos</option>
                  <option value="Volmatroos">Volmatroos</option>
                  <option value="Stuurman">Stuurman</option>
                  <option value="Kapitein">Kapitein</option>
                </select>
                {errors.position && (
                  <p className="form-error">{errors.position.message}</p>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">
                  <Globe className="h-4 w-4 inline mr-1" />
                  {t('forms:addCrewMember.fields.preferredLanguage')}
                </label>
                <select
                  className={`form-input form-select ${errors.preferredLanguage ? 'error' : ''}`}
                  {...register('preferredLanguage', { required: t('forms:required') })}
                  defaultValue="en"
                >
                  {languages.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.flag} {lang.name}
                    </option>
                  ))}
                </select>
                {errors.preferredLanguage && (
                  <p className="form-error">{errors.preferredLanguage.message}</p>
                )}
                <p className="text-sm text-gray-500 mt-1">
                  {t('profile.language_description')}
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">{t('forms:addCrewMember.fields.vesselAssignment')}</label>
                <input
                  type="text"
                  className={`form-input ${errors.vesselAssignment ? 'error' : ''}`}
                  placeholder="e.g., MS Burando Atlantic"
                  {...register('vesselAssignment', { required: 'Vessel assignment is required' })}
                />
                {errors.vesselAssignment && (
                  <p className="form-error">{errors.vesselAssignment.message}</p>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">{t('forms:addCrewMember.fields.expectedBoardingDate')}</label>
                <input
                  type="date"
                  className={`form-input ${errors.expectedBoardingDate ? 'error' : ''}`}
                  {...register('expectedBoardingDate', { required: 'Boarding date is required' })}
                />
                {errors.expectedBoardingDate && (
                  <p className="form-error">{errors.expectedBoardingDate.message}</p>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">{t('forms:addCrewMember.fields.contactPhone')}</label>
                <input
                  type="tel"
                  className="form-input"
                  {...register('contactPhone')}
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t('forms:addCrewMember.fields.emergencyContactName')}</label>
                <input
                  type="text"
                  className="form-input"
                  {...register('emergencyContactName')}
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t('forms:addCrewMember.fields.emergencyContactPhone')}</label>
                <input
                  type="tel"
                  className="form-input"
                  {...register('emergencyContactPhone')}
                />
              </div>

              <div className="flex flex-col md:flex-row justify-end space-y-3 md:space-y-0 md:space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="btn btn-secondary touch-target"
                >
                  {t('forms:addCrewMember.actions.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={createCrewMutation.isLoading}
                  className="btn btn-primary touch-target"
                >
                  {createCrewMutation.isLoading ? (
                    <LoadingSpinner size="small" message="" />
                  ) : (
                    t('forms:addCrewMember.actions.create')
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Crew Member Modal */}
      {editingMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto modal-mobile">
            <div className="flex justify-between items-center p-4 md:p-6 border-b">
              <h3 className="text-lg font-semibold">{t('forms:editCrewMember.title')}</h3>
              <button
                onClick={() => {
                  setEditingMember(null);
                  resetEdit();
                }}
                className="text-gray-400 hover:text-gray-600 p-2 touch-target"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmitEdit(onEditSubmit)} className="p-4 md:p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">{t('forms:editCrewMember.fields.firstName')}</label>
                  <input
                    type="text"
                    className={`form-input ${errorsEdit.firstName ? 'error' : ''}`}
                    {...registerEdit('firstName', { required: 'First name is required' })}
                  />
                  {errorsEdit.firstName && (
                    <p className="form-error">{errorsEdit.firstName.message}</p>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">{t('forms:editCrewMember.fields.lastName')}</label>
                  <input
                    type="text"
                    className={`form-input ${errorsEdit.lastName ? 'error' : ''}`}
                    {...registerEdit('lastName', { required: 'Last name is required' })}
                  />
                  {errorsEdit.lastName && (
                    <p className="form-error">{errorsEdit.lastName.message}</p>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">{t('profile.email')}</label>
                <input
                  type="email"
                  className={`form-input ${errorsEdit.email ? 'error' : ''}`}
                  {...registerEdit('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address'
                    }
                  })}
                />
                {errorsEdit.email && (
                  <p className="form-error">{errorsEdit.email.message}</p>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">{t('profile.position')}</label>
                <select
                  className={`form-input form-select ${errorsEdit.position ? 'error' : ''}`}
                  {...registerEdit('position', { required: 'Position is required' })}
                >
                  <option value="">{t('forms.selectPosition')}</option>
                  <option value="Deksman">Deksman</option>
                  <option value="Lichtmatroos">Lichtmatroos</option>
                  <option value="Matroos">Matroos</option>
                  <option value="Volmatroos">Volmatroos</option>
                  <option value="Stuurman">Stuurman</option>
                  <option value="Kapitein">Kapitein</option>
                </select>
                {errorsEdit.position && (
                  <p className="form-error">{errorsEdit.position.message}</p>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">
                  <Globe className="h-4 w-4 inline mr-1" />
                  {t('profile.language_preference')}
                </label>
                <select
                  className={`form-input form-select ${errorsEdit.preferredLanguage ? 'error' : ''}`}
                  {...registerEdit('preferredLanguage')}
                >
                  {languages.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.flag} {lang.name}
                    </option>
                  ))}
                </select>
                {errorsEdit.preferredLanguage && (
                  <p className="form-error">{errorsEdit.preferredLanguage.message}</p>
                )}
                <p className="text-sm text-gray-500 mt-1">
                  {t('profile.language_description')}
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">{t('profile.vessel_assignment')}</label>
                <input
                  type="text"
                  className={`form-input ${errorsEdit.vesselAssignment ? 'error' : ''}`}
                  placeholder="e.g., MS Burando Atlantic"
                  {...registerEdit('vesselAssignment', { required: 'Vessel assignment is required' })}
                />
                {errorsEdit.vesselAssignment && (
                  <p className="form-error">{errorsEdit.vesselAssignment.message}</p>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">{t('profile.boarding_date')}</label>
                <input
                  type="date"
                  className={`form-input ${errorsEdit.expectedBoardingDate ? 'error' : ''}`}
                  {...registerEdit('expectedBoardingDate', { required: 'Boarding date is required' })}
                />
                {errorsEdit.expectedBoardingDate && (
                  <p className="form-error">{errorsEdit.expectedBoardingDate.message}</p>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Status</label>
                <select
                  className={`form-input form-select ${errorsEdit.status ? 'error' : ''}`}
                  {...registerEdit('status', { required: 'Status is required' })}
                >
                  <option value="pending">Pending</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="inactive">Inactive</option>
                </select>
                {errorsEdit.status && (
                  <p className="form-error">{errorsEdit.status.message}</p>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">{t('profile.contact_phone')} ({t('forms.optional')})</label>
                <input
                  type="tel"
                  className="form-input"
                  {...registerEdit('contactPhone')}
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t('profile.contact_name')} ({t('forms.optional')})</label>
                <input
                  type="text"
                  className="form-input"
                  {...registerEdit('emergencyContactName')}
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t('profile.contact_phone')} ({t('forms.optional')})</label>
                <input
                  type="tel"
                  className="form-input"
                  {...registerEdit('emergencyContactPhone')}
                />
              </div>

              <div className="flex flex-col md:flex-row justify-end space-y-3 md:space-y-0 md:space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setEditingMember(null);
                    resetEdit();
                  }}
                  className="btn btn-secondary touch-target"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateCrewMutation.isLoading}
                  className="btn btn-primary touch-target"
                >
                  {updateCrewMutation.isLoading ? (
                    <LoadingSpinner size="small" message="" />
                  ) : (
                    'Update Crew Member'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Crew Member Modal */}
      {viewingMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-lg font-semibold">{t('general.details')}</h3>
              <button
                onClick={() => setViewingMember(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Personal Information */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-4">Personal Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">First Name</label>
                    <p className="mt-1 text-sm text-gray-900">{viewingMember.firstName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Last Name</label>
                    <p className="mt-1 text-sm text-gray-900">{viewingMember.lastName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <p className="mt-1 text-sm text-gray-900">{viewingMember.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Contact Phone</label>
                    <p className="mt-1 text-sm text-gray-900">{viewingMember.contactPhone || 'Not provided'}</p>
                  </div>
                </div>
              </div>

              {/* Work Information */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-4">Work Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Position</label>
                    <p className="mt-1 text-sm text-gray-900">{viewingMember.position}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Vessel Assignment</label>
                    <p className="mt-1 text-sm text-gray-900 flex items-center">
                      <Ship className="h-4 w-4 text-gray-400 mr-2" />
                      {viewingMember.vesselAssignment}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Expected Boarding Date</label>
                    <p className="mt-1 text-sm text-gray-900 flex items-center">
                      <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                      {formatDate(viewingMember.expectedBoardingDate)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <span className={`mt-1 inline-flex ${getStatusBadge(viewingMember.status)}`}>
                      {getStatusDisplayName(viewingMember.status)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-4">Emergency Contact</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Emergency Contact Name</label>
                    <p className="mt-1 text-sm text-gray-900">{viewingMember.emergencyContactName || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Emergency Contact Phone</label>
                    <p className="mt-1 text-sm text-gray-900">{viewingMember.emergencyContactPhone || 'Not provided'}</p>
                  </div>
                </div>
              </div>

              {/* Account Information */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-4">Account Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Created At</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {viewingMember.createdAt ? new Date(viewingMember.createdAt).toLocaleString() : 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Member ID</label>
                    <p className="mt-1 text-sm text-gray-900">#{viewingMember.id}</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  onClick={() => {
                    setViewingMember(null);
                    setEditingMember(viewingMember);
                  }}
                  className="btn btn-secondary"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Member
                </button>
                <button
                  onClick={() => {
                    handleSendMagicLink(viewingMember.id);
                    setViewingMember(null);
                  }}
                  disabled={sendMagicLinkMutation.isLoading}
                  className="btn btn-outline"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Send Magic Link
                </button>
                <button
                  onClick={() => setViewingMember(null)}
                  className="btn btn-primary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Certificate Details Modal */}
      {selectedCertificate && (
        <CertificateDetails
          certificate={selectedCertificate}
          onClose={() => setSelectedCertificate(null)}
          onRegenerateSuccess={(newCertificate) => {
            setSelectedCertificate(null);
            toast.success(`Certificate regenerated successfully. Certificate #${newCertificate.certificateNumber}`);
          }}
        />
      )}
    </div>
  );
};

export default ManagerDashboard;
