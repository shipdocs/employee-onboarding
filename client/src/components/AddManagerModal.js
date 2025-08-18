import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from 'react-query';
import { X, Eye, EyeOff, User, Mail, Lock, Briefcase, Globe } from 'lucide-react';
import adminService from '../services/adminService';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

const AddManagerModal = ({ isOpen, onClose, onSuccess }) => {
  const { t } = useTranslation(['common', 'forms']);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState([]);
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

  // Available manager permissions
  const availablePermissions = [
    { key: 'view_crew_list', label: t('manager.permission_labels.view_crew_list'), description: t('manager.permission_descriptions.view_crew_list') },
    { key: 'manage_crew_members', label: t('manager.permission_labels.manage_crew_members'), description: t('manager.permission_descriptions.manage_crew_members') },
    { key: 'review_quiz_results', label: t('manager.permission_labels.review_quiz_results'), description: t('manager.permission_descriptions.review_quiz_results') },
    { key: 'approve_training_completion', label: t('manager.permission_labels.approve_training_completion'), description: t('manager.permission_descriptions.approve_training_completion') },
    { key: 'view_certificates', label: t('manager.permission_labels.view_certificates'), description: t('manager.permission_descriptions.view_certificates') },
    { key: 'regenerate_certificates', label: t('manager.permission_labels.regenerate_certificates'), description: t('manager.permission_descriptions.regenerate_certificates') },
    { key: 'view_compliance_reports', label: t('manager.permission_labels.view_compliance_reports'), description: t('manager.permission_descriptions.view_compliance_reports') },
    { key: 'export_training_data', label: t('manager.permission_labels.export_training_data'), description: t('manager.permission_descriptions.export_training_data') },
    { key: 'content_edit', label: t('manager.permission_labels.content_edit'), description: t('manager.permission_descriptions.content_edit') }
  ];

  // Create manager mutation
  const createManagerMutation = useMutation(
    adminService.createManager,
    {
      onSuccess: () => {
        queryClient.invalidateQueries('managers');
        queryClient.invalidateQueries('admin-stats');
        toast.success(t('manager.manager_created'));
        reset();
        setSelectedPermissions([]);
        onClose();
        if (onSuccess) {
          onSuccess();
        }
      },
      onError: (error) => {
        const message = error.response?.data?.error || t('manager.failed_create');
        toast.error(message);
      }
    }
  );

  const onSubmit = (data) => {
    const managerData = {
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      position: data.position,
      password: data.password,
      preferredLanguage: data.preferredLanguage || 'en',
      permissions: selectedPermissions
    };

    createManagerMutation.mutate(managerData);
  };

  const handlePermissionToggle = (permissionKey) => {
    setSelectedPermissions(prev => {
      if (prev.includes(permissionKey)) {
        return prev.filter(p => p !== permissionKey);
      } else {
        return [...prev, permissionKey];
      }
    });
  };

  const handleSelectAllPermissions = () => {
    if (selectedPermissions.length === availablePermissions.length) {
      setSelectedPermissions([]);
    } else {
      setSelectedPermissions(availablePermissions.map(p => p.key));
    }
  };

  const handleClose = () => {
    reset();
    setSelectedPermissions([]);
    setShowPassword(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl">
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-4 sm:p-5 border-b">
          <h3 className="text-lg sm:text-xl font-medium text-gray-900">{t('manager.add_manager')}</h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 -mr-2 rounded-lg min-touch-target"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-4 sm:p-5 space-y-4 sm:space-y-6">
          {/* Personal Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <User size={16} className="inline mr-1" />
                {t('manager.first_name')}
              </label>
              <input
                type="text"
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  errors.firstName ? 'border-red-300' : 'border-gray-300'
                }`}
                {...register('firstName', {
                  required: t('forms:required'),
                  minLength: { value: 2, message: t('forms:min_length', { field: t('manager.first_name'), min: 2 }) }
                })}
              />
              {errors.firstName && (
                <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <User size={16} className="inline mr-1" />
                {t('manager.last_name')}
              </label>
              <input
                type="text"
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  errors.lastName ? 'border-red-300' : 'border-gray-300'
                }`}
                {...register('lastName', {
                  required: t('forms:required'),
                  minLength: { value: 2, message: t('forms:min_length', { field: t('manager.last_name'), min: 2 }) }
                })}
              />
              {errors.lastName && (
                <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Mail size={16} className="inline mr-1" />
              {t('profile.email_address')}
            </label>
            <input
              type="email"
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                errors.email ? 'border-red-300' : 'border-gray-300'
              }`}
              {...register('email', {
                required: t('forms:required'),
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: t('forms:email_invalid')
                }
              })}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          {/* Position */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Briefcase size={16} className="inline mr-1" />
              {t('profile.position')}
            </label>
            <input
              type="text"
              placeholder="e.g., Fleet Manager, Training Coordinator"
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                errors.position ? 'border-red-300' : 'border-gray-300'
              }`}
              {...register('position')}
            />
          </div>

          {/* Language Preference */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Globe size={16} className="inline mr-1" />
              {t('profile.language_preference')}
            </label>
            <select
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                errors.preferredLanguage ? 'border-red-300' : 'border-gray-300'
              }`}
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
              <p className="mt-1 text-sm text-red-600">{errors.preferredLanguage.message}</p>
            )}
            <p className="mt-1 text-sm text-gray-500">
              {t('profile.language_description')}
            </p>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Lock size={16} className="inline mr-1" />
              {t('manager.password')}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className={`w-full px-3 py-2 pr-10 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  errors.password ? 'border-red-300' : 'border-gray-300'
                }`}
                {...register('password', {
                  required: t('forms:required'),
                  minLength: { value: 8, message: t('forms:password_min_length', { min: 8 }) },
                  pattern: {
                    value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                    message: t('manager.password_requirements')
                  }
                })}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
            )}
            <p className="mt-1 text-sm text-gray-500">
              {t('manager.password_requirements')}
            </p>
          </div>

          {/* Permissions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                {t('manager.manager_permissions')}
              </label>
              <button
                type="button"
                onClick={handleSelectAllPermissions}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {selectedPermissions.length === availablePermissions.length ? t('manager.deselect_all') : t('manager.select_all')}
              </button>
            </div>
            <div className="max-h-40 sm:max-h-48 overflow-y-auto border border-gray-200 rounded-md p-3">
              <div className="space-y-3">
                {availablePermissions.map((permission) => (
                  <div key={permission.key} className="flex items-start">
                    <input
                      type="checkbox"
                      id={permission.key}
                      checked={selectedPermissions.includes(permission.key)}
                      onChange={() => handlePermissionToggle(permission.key)}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div className="ml-3">
                      <label htmlFor={permission.key} className="text-sm font-medium text-gray-700 cursor-pointer">
                        {permission.label}
                      </label>
                      <p className="text-xs text-gray-500">{permission.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              {selectedPermissions.length === 0
                ? t('manager.permissions_default')
                : t('manager.permissions_selected', { count: selectedPermissions.length })
              }
            </p>
          </div>

          {/* Form Actions */}
          <div className="sticky bottom-0 bg-white border-t -mx-4 sm:-mx-5 px-4 sm:px-5 py-3 sm:py-4">
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="w-full sm:w-auto px-4 py-2.5 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 min-touch-target"
              >
                {t('buttons.cancel')}
              </button>
              <button
                type="submit"
                disabled={createManagerMutation.isLoading}
                className="w-full sm:w-auto px-4 py-2.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed min-touch-target"
              >
                {createManagerMutation.isLoading ? (
                  <>
                    <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {t('manager.creating')}
                  </>
                ) : (
                  t('manager.create_manager')
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddManagerModal;
