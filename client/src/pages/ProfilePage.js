import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  User,
  Mail,
  Phone,
  Ship,
  Calendar,
  Globe,
  MapPin,
  Shield,
  Edit3,
  Camera,
  Award,
  Anchor
} from 'lucide-react';
import crewService from '../services/crewService';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../contexts/LanguageContext';
import toast from 'react-hot-toast';
import MFAManagement from '../components/MFAManagement';

const ProfilePage = () => {
  const { user } = useAuth();
  const { t } = useTranslation('common');
  const { currentLanguage, languages, changeLanguage } = useLanguage();
  const queryClient = useQueryClient();
  const [selectedLanguage, setSelectedLanguage] = useState(currentLanguage);

  // Fetch profile data
  const { data: profileData, isLoading } = useQuery(
    'crew-profile',
    crewService.getProfile,
    {
      enabled: user?.role === 'crew',
      onSuccess: (data) => {
        // Update selected language when profile loads
        if (data?.user?.preferredLanguage) {
          setSelectedLanguage(data.user.preferredLanguage);
        }
      }
    }
  );

  // Extract user profile from the response
  const profile = profileData?.user;

  // Update language preference mutation
  const updateLanguageMutation = useMutation(
    async (language) => {
      // Update the language preference on the server
      const response = await fetch('/api/crew/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ preferredLanguage: language })
      });

      if (!response.ok) {
        throw new Error('Failed to update language preference');
      }

      return response.json();
    },
    {
      onSuccess: async (data, language) => {
        // Update the UI language
        await changeLanguage(language);

        // Invalidate profile query to ensure fresh data
        queryClient.invalidateQueries('crew-profile');

        toast.success(t('profile.language_updated'));
      },
      onError: () => {
        toast.error(t('profile.language_update_failed'));
      }
    }
  );

  const handleLanguageChange = async (e) => {
    const newLanguage = e.target.value;
    setSelectedLanguage(newLanguage);
    updateLanguageMutation.mutate(newLanguage);
  };

  if (isLoading) {
    return <LoadingSpinner message={t('profile.loading_profile')} />;
  }

  // For managers, show basic info with language preference
  if (user?.role === 'manager' || user?.role === 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{t('profile.title')}</h1>
                <p className="text-gray-600">Management Profile & Preferences</p>
              </div>
            </div>
          </div>

          {/* Main Profile Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            {/* Profile Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6">
              <div className="flex items-center space-x-4">
                <div className="h-16 w-16 bg-white/20 rounded-full flex items-center justify-center">
                  <User className="h-8 w-8 text-white" />
                </div>
                <div className="text-white">
                  <h2 className="text-2xl font-bold">{user.firstName} {user.lastName}</h2>
                  <p className="text-blue-100 capitalize flex items-center">
                    <Shield className="h-4 w-4 mr-1" />
                    {user.role}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Personal Information */}
                <div className="space-y-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <User className="h-5 w-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900">
                      {t('profile.personal_info')}
                    </h3>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center space-x-3">
                        <User className="h-5 w-5 text-gray-500" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-600">{t('profile.full_name')}</p>
                          <p className="text-lg font-semibold text-gray-900">
                            {user.firstName} {user.lastName}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center space-x-3">
                        <Mail className="h-5 w-5 text-gray-500" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-600">{t('profile.email')}</p>
                          <p className="text-lg font-semibold text-gray-900">{user.email}</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center space-x-3">
                        <Shield className="h-5 w-5 text-gray-500" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-600">{t('profile.role')}</p>
                          <p className="text-lg font-semibold text-gray-900 capitalize">{user.role}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Preferences */}
                <div className="space-y-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <Globe className="h-5 w-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900">
                      {t('profile.preferences')}
                    </h3>
                  </div>

                  <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      <Globe className="inline h-4 w-4 mr-2 text-blue-600" />
                      {t('profile.language_preference')}
                    </label>
                    <select
                      value={selectedLanguage}
                      onChange={(e) => {
                        const newLanguage = e.target.value;
                        setSelectedLanguage(newLanguage);
                        changeLanguage(newLanguage);
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm"
                    >
                      {languages.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.flag} {lang.name}
                        </option>
                      ))}
                    </select>
                    <p className="mt-2 text-sm text-gray-600">
                      {t('profile.language_description')}
                    </p>
                  </div>
                </div>
              </div>

              {/* MFA Security Section */}
              <div className="mt-8 pt-8 border-t border-gray-200">
                <div className="flex items-center space-x-2 mb-6">
                  <Shield className="h-5 w-5 text-red-600" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    Multi-Factor Authentication
                  </h3>
                </div>

                <MFAManagement
                  userId={user.id}
                  className="max-w-2xl"
                  onStatusChange={(status) => {
                    console.log('MFA status changed:', status);
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Anchor className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{t('profile.my_profile')}</h1>
              <p className="text-gray-600">{t('profile.personal_information')}</p>
            </div>
          </div>
        </div>

        {/* Main Profile Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Profile Header with Avatar */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-8">
            <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
              <div className="relative">
                <div className="h-24 w-24 bg-white/20 rounded-full flex items-center justify-center border-4 border-white/30">
                  <User className="h-12 w-12 text-white" />
                </div>
                <button className="absolute -bottom-1 -right-1 p-2 bg-white rounded-full shadow-lg hover:shadow-xl transition-shadow">
                  <Camera className="h-4 w-4 text-gray-600" />
                </button>
              </div>
              <div className="text-white text-center sm:text-left">
                <h2 className="text-3xl font-bold">{profile?.firstName} {profile?.lastName}</h2>
                <p className="text-blue-100 text-lg flex items-center justify-center sm:justify-start mt-1">
                  <Ship className="h-5 w-5 mr-2" />
                  {profile?.position}
                </p>
                <div className="flex items-center justify-center sm:justify-start mt-2">
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    profile?.status === 'completed' ? 'bg-green-500/20 text-green-100 border border-green-400/30' :
                    profile?.status === 'active' ? 'bg-blue-500/20 text-blue-100 border border-blue-400/30' :
                    profile?.status === 'pending' ? 'bg-yellow-500/20 text-yellow-100 border border-yellow-400/30' :
                    'bg-gray-500/20 text-gray-100 border border-gray-400/30'
                  }`}>
                    <div className={`h-2 w-2 rounded-full mr-2 ${
                      profile?.status === 'completed' ? 'bg-green-400' :
                      profile?.status === 'active' ? 'bg-blue-400' :
                      profile?.status === 'pending' ? 'bg-yellow-400' :
                      'bg-gray-400'
                    }`}></div>
                    {profile?.status}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Personal Information */}
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <User className="h-5 w-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900">
                      {t('profile.personal_info')}
                    </h3>
                  </div>
                  <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                    <Edit3 className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600">{t('profile.full_name')}</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {profile?.firstName} {profile?.lastName}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Mail className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600">{t('profile.email')}</p>
                        <p className="text-lg font-semibold text-gray-900">{profile?.email}</p>
                      </div>
                    </div>
                  </div>

                  {profile?.contactPhone && (
                    <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <Phone className="h-5 w-5 text-purple-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-600">{t('profile.phone')}</p>
                          <p className="text-lg font-semibold text-gray-900">{profile.contactPhone}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Work Information */}
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Ship className="h-5 w-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900">
                      {t('profile.work_info')}
                    </h3>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Award className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm text-gray-600">Maritime Professional</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 hover:shadow-md transition-shadow">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600">{t('profile.position')}</p>
                        <p className="text-lg font-semibold text-gray-900">{profile?.position}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 hover:shadow-md transition-shadow">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Ship className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600">{t('profile.vessel')}</p>
                        <p className="text-lg font-semibold text-gray-900">{profile?.vesselAssignment}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 hover:shadow-md transition-shadow">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <Calendar className="h-5 w-5 text-orange-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600">{t('profile.boarding_date')}</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {profile?.expectedBoardingDate
                            ? new Date(profile.expectedBoardingDate).toLocaleDateString()
                            : t('common.not_set')
                          }
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 hover:shadow-md transition-shadow">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${
                        profile?.status === 'completed' ? 'bg-green-100' :
                        profile?.status === 'active' ? 'bg-blue-100' :
                        profile?.status === 'pending' ? 'bg-yellow-100' :
                        'bg-gray-100'
                      }`}>
                        <div className={`h-5 w-5 rounded-full flex items-center justify-center ${
                          profile?.status === 'completed' ? 'bg-green-500' :
                          profile?.status === 'active' ? 'bg-blue-500' :
                          profile?.status === 'pending' ? 'bg-yellow-500' :
                          'bg-gray-500'
                        }`}>
                          <div className="h-2 w-2 bg-white rounded-full"></div>
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600">{t('common.status')}</p>
                        <p className="text-lg font-semibold text-gray-900 capitalize">{profile?.status}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
          </div>

            {/* Language Preference for Crew */}
            <div className="mt-8 pt-8 border-t border-gray-200">
              <div className="flex items-center space-x-2 mb-6">
                <Globe className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  {t('profile.preferences')}
                </h3>
              </div>

              <div className="max-w-md">
                <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    <Globe className="inline h-4 w-4 mr-2 text-blue-600" />
                    {t('profile.language_preference')}
                  </label>
                  <select
                    value={selectedLanguage}
                    onChange={handleLanguageChange}
                    disabled={updateLanguageMutation.isLoading}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {languages.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.flag} {lang.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-sm text-gray-600">
                    {t('profile.language_description')}
                  </p>
                  {updateLanguageMutation.isLoading && (
                    <div className="mt-3 flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <p className="text-sm text-blue-600">
                        {t('profile.updating_language')}...
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            {(profile?.emergencyContactName || profile?.emergencyContactPhone) && (
              <div className="mt-8 pt-8 border-t border-gray-200">
                <div className="flex items-center space-x-2 mb-6">
                  <Shield className="h-5 w-5 text-red-600" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    {t('profile.emergency_contact')}
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {profile?.emergencyContactName && (
                    <div className="p-4 bg-gradient-to-r from-red-50 to-pink-50 rounded-lg border border-red-200 hover:shadow-md transition-shadow">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-red-100 rounded-lg">
                          <User className="h-5 w-5 text-red-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-600">{t('profile.contact_name')}</p>
                          <p className="text-lg font-semibold text-gray-900">{profile.emergencyContactName}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {profile?.emergencyContactPhone && (
                    <div className="p-4 bg-gradient-to-r from-red-50 to-pink-50 rounded-lg border border-red-200 hover:shadow-md transition-shadow">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-red-100 rounded-lg">
                          <Phone className="h-5 w-5 text-red-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-600">{t('profile.contact_phone')}</p>
                          <p className="text-lg font-semibold text-gray-900">{profile.emergencyContactPhone}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
