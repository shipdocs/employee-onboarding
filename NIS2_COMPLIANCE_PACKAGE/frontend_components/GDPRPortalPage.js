/**
 * GDPR Portal Page
 * Standalone page for GDPR self-service portal
 */

import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import GDPRSelfServicePortal from '../components/gdpr/GDPRSelfServicePortal';

const GDPRPortalPage = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="py-8">
        <GDPRSelfServicePortal />
      </div>
    </div>
  );
};

export default GDPRPortalPage;
