import React, { useState } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { useTranslation } from 'react-i18next';
import {
  X,
  Download,
  RotateCw,
  Trash2,
  Calendar,
  User,
  FileText,
  Ship,
  Award,
  CheckCircle,
  XCircle,
  Edit,
  Save,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import LoadingSpinner from '../LoadingSpinner';
import managerService from '../../services/managerService';

const CertificateDetails = ({ certificate, onClose, onRegenerateSuccess }) => {
  const { t } = useTranslation(['admin', 'common']);
  const [isEditing, setIsEditing] = useState(false);
  const [editedCertificate, setEditedCertificate] = useState({
    certificate_type: certificate.certificate_type,
    certificate_number: certificate.certificate_number,
    issue_date: certificate.issue_date,
    expiry_date: certificate.expiry_date,
    issuing_authority: certificate.issuing_authority,
    verified: certificate.verified
  });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);
  const queryClient = useQueryClient();

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return t('common:common.not_set');
    try {
      return format(new Date(dateString), 'dd MMM yyyy');
    } catch (e) {
      return dateString;
    }
  };

  // Update certificate mutation
  const updateMutation = useMutation(
    (data) => managerService.updateCertificate(certificate.id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('certificates');
        toast.success(t('admin:certificates.messages.updated'));
        setIsEditing(false);
      },
      onError: (error) => {
        toast.error(t('admin:certificates.messages.updateFailed', { error: error.message }));
      }
    }
  );

  // Delete certificate mutation
  const deleteMutation = useMutation(
    () => managerService.deleteCertificate(certificate.id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('certificates');
        toast.success(t('admin:certificates.messages.deleted'));
        onClose();
      },
      onError: (error) => {
        toast.error(t('admin:certificates.messages.deleteFailed', { error: error.message }));
      }
    }
  );

  // Regenerate certificate mutation
  const regenerateMutation = useMutation(
    () => managerService.regenerateCertificate({
      userId: certificate.user_id,
      certificateType: certificate.certificate_type === 'Intro Kapitein' ? 'intro_kapitein' : 'standard',
      certificateId: certificate.id
    }),
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries('certificates');
        toast.success(t('admin:certificates.messages.regenerated'));
        if (onRegenerateSuccess) {
          onRegenerateSuccess(data.certificate);
        }
        setConfirmRegenerate(false);
      },
      onError: (error) => {
        toast.error(t('admin:certificates.messages.regenerateFailed', { error: error.message }));
      }
    }
  );

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditedCertificate(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate(editedCertificate);
  };

  // Get status badge class
  const getStatusBadge = () => {
    if (!certificate.expiry_date) return 'badge badge-secondary';

    const now = new Date();
    const expiryDate = new Date(certificate.expiry_date);

    if (expiryDate < now) {
      return 'badge badge-danger';
    }

    // Warning if expiring in 30 days
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    if (expiryDate < thirtyDaysFromNow) {
      return 'badge badge-warning';
    }

    return certificate.verified ? 'badge badge-success' : 'badge badge-info';
  };

  // Get status text
  const getStatusText = () => {
    if (!certificate.expiry_date) return t('admin:certificates.status.noExpiry');

    const now = new Date();
    const expiryDate = new Date(certificate.expiry_date);

    if (expiryDate < now) {
      return t('admin:certificates.status.expired');
    }

    // Warning if expiring in 30 days
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    if (expiryDate < thirtyDaysFromNow) {
      return t('admin:certificates.status.expiringSoon');
    }

    return certificate.verified ? t('admin:certificates.status.valid') : t('admin:certificates.status.unverified');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-lg font-semibold flex items-center">
            <FileText className="h-5 w-5 text-blue-600 mr-2" />
            {t('admin:certificates.details.title')}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Certificate Header */}
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{certificate.certificate_type}</h2>
              <p className="text-gray-600 flex items-center mt-1">
                <Award className="h-4 w-4 mr-2" />
                Certificate #{certificate.certificate_number}
              </p>
            </div>
            <div className="flex flex-col items-end">
              <span className={getStatusBadge()}>
                {getStatusText()}
              </span>
              <p className="text-sm text-gray-500 mt-1">
                {certificate.verified ? t('admin:certificates.status.verified') : t('admin:certificates.status.notVerified')}
              </p>
            </div>
          </div>

          {/* Crew Member Information */}
          <div className="glass-card p-4">
            <h4 className="text-md font-semibold text-gray-900 mb-3">{t('admin:certificates.details.crewInfo')}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">{t('admin:certificates.details.name')}</label>
                <p className="mt-1 text-sm text-gray-900 flex items-center">
                  <User className="h-4 w-4 text-gray-400 mr-2" />
                  {certificate.users.first_name} {certificate.users.last_name}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">{t('admin:certificates.details.email')}</label>
                <p className="mt-1 text-sm text-gray-900">{certificate.users.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">{t('admin:certificates.details.position')}</label>
                <p className="mt-1 text-sm text-gray-900">{certificate.users.position}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">{t('admin:certificates.details.vessel')}</label>
                <p className="mt-1 text-sm text-gray-900 flex items-center">
                  <Ship className="h-4 w-4 text-gray-400 mr-2" />
                  {certificate.users.vessel_assignment}
                </p>
              </div>
            </div>
          </div>

          {/* Certificate Details */}
          {isEditing ? (
            <form onSubmit={handleSubmit} className="glass-card p-4">
              <h4 className="text-md font-semibold text-gray-900 mb-3">{t('admin:certificates.details.editTitle')}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">{t('admin:certificates.details.certificateType')}</label>
                  <input
                    type="text"
                    name="certificate_type"
                    value={editedCertificate.certificate_type}
                    onChange={handleInputChange}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('admin:certificates.details.certificateNumber')}</label>
                  <input
                    type="text"
                    name="certificate_number"
                    value={editedCertificate.certificate_number}
                    onChange={handleInputChange}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('admin:certificates.details.issueDate')}</label>
                  <input
                    type="date"
                    name="issue_date"
                    value={editedCertificate.issue_date}
                    onChange={handleInputChange}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('admin:certificates.details.expiryDate')}</label>
                  <input
                    type="date"
                    name="expiry_date"
                    value={editedCertificate.expiry_date}
                    onChange={handleInputChange}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('admin:certificates.details.issuingAuthority')}</label>
                  <input
                    type="text"
                    name="issuing_authority"
                    value={editedCertificate.issuing_authority}
                    onChange={handleInputChange}
                    className="form-input"
                  />
                </div>
                <div className="form-group flex items-center">
                  <label className="form-label mr-2">{t('admin:certificates.details.verified')}</label>
                  <input
                    type="checkbox"
                    name="verified"
                    checked={editedCertificate.verified}
                    onChange={handleInputChange}
                    className="form-checkbox h-5 w-5"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-4">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="btn btn-secondary"
                >
                  {t('admin:certificates.details.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isLoading}
                  className="btn btn-primary"
                >
                  {updateMutation.isLoading ? (
                    <LoadingSpinner size="small" message="" />
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {t('admin:certificates.details.saveChanges')}
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="glass-card p-4">
              <h4 className="text-md font-semibold text-gray-900 mb-3">{t('admin:certificates.details.title')}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t('admin:certificates.details.certificateType')}</label>
                  <p className="mt-1 text-sm text-gray-900">{certificate.certificate_type}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t('admin:certificates.details.certificateNumber')}</label>
                  <p className="mt-1 text-sm text-gray-900">{certificate.certificate_number}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t('admin:certificates.details.issueDate')}</label>
                  <p className="mt-1 text-sm text-gray-900 flex items-center">
                    <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                    {formatDate(certificate.issue_date)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t('admin:certificates.details.expiryDate')}</label>
                  <p className="mt-1 text-sm text-gray-900 flex items-center">
                    <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                    {formatDate(certificate.expiry_date)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t('admin:certificates.details.issuingAuthority')}</label>
                  <p className="mt-1 text-sm text-gray-900">{certificate.issuing_authority}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t('common:general.created_at')}</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {formatDate(certificate.created_at)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Certificate Metadata */}
          {certificate.metadata && (
            <div className="glass-card p-4">
              <h4 className="text-md font-semibold text-gray-900 mb-3">{t('admin:certificates.details.metadata')}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {certificate.metadata.phase1_completed && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phase 1 Completed</label>
                    <p className="mt-1 text-sm text-gray-900">{certificate.metadata.phase1_completed}</p>
                  </div>
                )}
                {certificate.metadata.phase1_score && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phase 1 Score</label>
                    <p className="mt-1 text-sm text-gray-900">{certificate.metadata.phase1_score}</p>
                  </div>
                )}
                {certificate.metadata.phase2_completed && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phase 2 Completed</label>
                    <p className="mt-1 text-sm text-gray-900">{certificate.metadata.phase2_completed}</p>
                  </div>
                )}
                {certificate.metadata.phase2_score && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phase 2 Score</label>
                    <p className="mt-1 text-sm text-gray-900">{certificate.metadata.phase2_score}</p>
                  </div>
                )}
                {certificate.metadata.phase3_completed && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phase 3 Completed</label>
                    <p className="mt-1 text-sm text-gray-900">{certificate.metadata.phase3_completed}</p>
                  </div>
                )}
                {certificate.metadata.phase3_score && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phase 3 Score</label>
                    <p className="mt-1 text-sm text-gray-900">{certificate.metadata.phase3_score}</p>
                  </div>
                )}
                {certificate.metadata.overall_score && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Overall Score</label>
                    <p className="mt-1 text-sm text-gray-900">{certificate.metadata.overall_score}</p>
                  </div>
                )}
                {certificate.metadata.replaced_by && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Replaced By</label>
                    <p className="mt-1 text-sm text-gray-900">Certificate #{certificate.metadata.replaced_by}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap justify-end space-x-3 pt-4 border-t">
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="btn btn-secondary"
              >
                <Edit className="h-4 w-4 mr-2" />
                {t('admin:certificates.details.editDetails')}
              </button>
            )}

            <button
              onClick={() => window.open(certificate.file_url, '_blank')}
              className="btn btn-outline"
              disabled={!certificate.file_url}
            >
              <Download className="h-4 w-4 mr-2" />
              {t('admin:certificates.details.download')}
            </button>

            {confirmRegenerate ? (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-red-600 flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  {t('admin:certificates.details.regenerateConfirm')}
                </span>
                <button
                  onClick={() => regenerateMutation.mutate()}
                  disabled={regenerateMutation.isLoading}
                  className="btn btn-danger"
                >
                  {regenerateMutation.isLoading ? (
                    <LoadingSpinner size="small" message="" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={() => setConfirmRegenerate(false)}
                  className="btn btn-secondary"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmRegenerate(true)}
                className="btn btn-primary"
              >
                <RotateCw className="h-4 w-4 mr-2" />
                {t('admin:certificates.details.regenerate')}
              </button>
            )}

            {confirmDelete ? (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-red-600 flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  {t('admin:certificates.details.deleteConfirm')}
                </span>
                <button
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isLoading}
                  className="btn btn-danger"
                >
                  {deleteMutation.isLoading ? (
                    <LoadingSpinner size="small" message="" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="btn btn-secondary"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="btn btn-danger"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t('admin:certificates.details.delete')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CertificateDetails;
