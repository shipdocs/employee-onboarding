import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { useTranslation } from 'react-i18next';
import {
  Search,
  Filter,
  RefreshCw,
  Eye,
  Download,
  RotateCw,
  Trash2,
  Calendar,
  User,
  FileText,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { format } from 'date-fns';
import LoadingSpinner from '../LoadingSpinner';
import managerService from '../../services/managerService';

const CertificateList = ({ onViewCertificate, onRegenerateCertificate, onDeleteCertificate }) => {
  const { t } = useTranslation(['admin', 'common']);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  // Fetch certificates
  const {
    data: certificatesData,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery(
    ['certificates', page, limit, typeFilter, sortBy, sortOrder],
    () => managerService.getCertificates({
      page,
      limit,
      certificate_type: typeFilter !== 'all' ? typeFilter : undefined,
      sort_by: sortBy,
      sort_order: sortOrder
    }),
    {
      keepPreviousData: true
    }
  );

  // Handle search filter
  const filteredCertificates = certificatesData?.certificates?.filter(cert => {
    if (!searchTerm) return true;

    const searchLower = searchTerm.toLowerCase();
    const userName = `${cert.users.first_name} ${cert.users.last_name}`.toLowerCase();

    return userName.includes(searchLower) ||
      (cert.certificate_number || '').toLowerCase().includes(searchLower) ||
      (cert.certificate_type || '').toLowerCase().includes(searchLower) ||
      (cert.users.email || '').toLowerCase().includes(searchLower) ||
      (cert.users.position || '').toLowerCase().includes(searchLower) ||
      (cert.users.vessel_assignment || '').toLowerCase().includes(searchLower);
  }) || [];

  // Handle pagination
  const handlePreviousPage = () => {
    setPage(old => Math.max(old - 1, 1));
  };

  const handleNextPage = () => {
    if (!certificatesData?.pagination) return;
    setPage(old => old < certificatesData.pagination.pages ? old + 1 : old);
  };

  // Handle sorting
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return t('common:common.not_set');
    try {
      return format(new Date(dateString), 'dd MMM yyyy');
    } catch (e) {
      return dateString;
    }
  };

  // Get status badge class
  const getStatusBadge = (cert) => {
    if (!cert.expiry_date) return 'badge badge-secondary';

    const now = new Date();
    const expiryDate = new Date(cert.expiry_date);

    if (expiryDate < now) {
      return 'badge badge-danger';
    }

    // Warning if expiring in 30 days
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    if (expiryDate < thirtyDaysFromNow) {
      return 'badge badge-warning';
    }

    return cert.verified ? 'badge badge-success' : 'badge badge-info';
  };

  // Get status text
  const getStatusText = (cert) => {
    if (!cert.expiry_date) return t('admin:certificates.status.noExpiry');

    const now = new Date();
    const expiryDate = new Date(cert.expiry_date);

    if (expiryDate < now) {
      return t('admin:certificates.status.expired');
    }

    // Warning if expiring in 30 days
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    if (expiryDate < thirtyDaysFromNow) {
      return t('admin:certificates.status.expiringSoon');
    }

    return cert.verified ? t('admin:certificates.status.valid') : t('admin:certificates.status.unverified');
  };

  if (isLoading) {
    return <LoadingSpinner message={t('admin:certificates.loading')} />;
  }

  if (isError) {
    return (
      <div className="glass-card p-6 text-center">
        <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">{t('admin:certificates.error')}</h3>
        <p className="text-gray-600 mb-4">{error?.message || t('admin:certificates.failed')}</p>
        <button onClick={refetch} className="btn btn-primary">
          <RefreshCw className="h-4 w-4 mr-2" />
          {t('admin:certificates.tryAgain')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter Bar */}
      <div className="glass-card p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder={t('admin:certificates.search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="glass-input pl-10 pr-4 py-3 w-full"
              />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="glass-input px-4 py-3"
              >
                <option value="all">{t('admin:certificates.filters.allTypes')}</option>
                <option value="Maritime Onboarding Training">{t('admin:certificates.filters.onboardingTraining')}</option>
                <option value="Intro Kapitein">{t('admin:certificates.filters.introKapitein')}</option>
              </select>
            </div>

            <button
              onClick={refetch}
              className="glass-input px-4 py-2 text-slate-700 hover:text-slate-900 transition-all duration-300 flex items-center gap-2 rounded-xl"
            >
              <RefreshCw className="h-4 w-4" />
              {t('admin:certificates.refresh')}
            </button>
          </div>
        </div>
      </div>

      {/* Certificates Table */}
      <div className="glass-card hover-lift">
        <div className="p-8 border-b border-white/20">
          <h2 className="text-2xl font-bold text-gradient-navy">{t('admin:certificates.title')}</h2>
          <p className="text-slate-600 mt-2">{t('admin:certificates.description')}</p>
        </div>
        <div className="p-6">
          <div className="overflow-x-auto">
            {filteredCertificates.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">{t('admin:certificates.noFound')}</h3>
                <p className="text-gray-600">{t('admin:certificates.noFoundDescription')}</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-t-xl">
                  <tr>
                    <th
                      className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider rounded-tl-xl cursor-pointer"
                      onClick={() => handleSort('certificate_type')}
                    >
                      <div className="flex items-center">
                        {t('admin:certificates.table.type')}
                        {sortBy === 'certificate_type' && (
                          <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th
                      className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('users.last_name')}
                    >
                      <div className="flex items-center">
                        {t('admin:certificates.table.crewMember')}
                        {sortBy === 'users.last_name' && (
                          <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th
                      className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('issue_date')}
                    >
                      <div className="flex items-center">
                        {t('admin:certificates.table.issueDate')}
                        {sortBy === 'issue_date' && (
                          <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th
                      className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('expiry_date')}
                    >
                      <div className="flex items-center">
                        {t('admin:certificates.table.expiryDate')}
                        {sortBy === 'expiry_date' && (
                          <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      {t('admin:certificates.table.status')}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider rounded-tr-xl">
                      {t('admin:certificates.table.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white/50 divide-y divide-slate-200">
                  {filteredCertificates.map((cert) => (
                    <tr key={cert.id} className="hover:bg-white/80 transition-colors duration-200">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <FileText className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm font-medium text-gray-900">{cert.certificate_type}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900 flex items-center">
                            <User className="h-4 w-4 text-gray-400 mr-2" />
                            {cert.users.first_name} {cert.users.last_name}
                          </div>
                          <div className="text-sm text-gray-500">{cert.users.position}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                          {formatDate(cert.issue_date)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                          {formatDate(cert.expiry_date)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={getStatusBadge(cert)}>
                          {getStatusText(cert)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => onViewCertificate(cert)}
                            className="btn btn-sm btn-info"
                            title={t('common:buttons.view')}
                          >
                            <Eye className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => window.open(cert.file_url, '_blank')}
                            className="btn btn-sm btn-outline"
                            title={t('common:buttons.download')}
                            disabled={!cert.file_url}
                          >
                            <Download className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => onRegenerateCertificate(cert)}
                            className="btn btn-sm btn-secondary"
                            title={t('admin:certificates.details.regenerate')}
                          >
                            <RotateCw className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => onDeleteCertificate(cert)}
                            className="btn btn-sm btn-danger"
                            title={t('common:buttons.delete')}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {certificatesData?.pagination && (
            <div className="flex justify-between items-center mt-6">
              <div className="text-sm text-gray-600">
                {t('admin:certificates.pagination.showing')} {(page - 1) * limit + 1} {t('admin:certificates.pagination.to')} {Math.min(page * limit, certificatesData.pagination.total)} {t('admin:certificates.pagination.of')} {certificatesData.pagination.total} {t('admin:certificates.pagination.results')}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={handlePreviousPage}
                  disabled={page === 1}
                  className={`btn btn-sm ${page === 1 ? 'btn-disabled' : 'btn-outline'}`}
                >
                  {t('admin:certificates.pagination.previous')}
                </button>
                <button
                  onClick={handleNextPage}
                  disabled={page >= certificatesData.pagination.pages}
                  className={`btn btn-sm ${page >= certificatesData.pagination.pages ? 'btn-disabled' : 'btn-outline'}`}
                >
                  {t('admin:certificates.pagination.next')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CertificateList;
