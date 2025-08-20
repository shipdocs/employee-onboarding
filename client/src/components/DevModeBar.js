import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ChevronDown, ChevronUp, User, Shield, Users, Anchor } from 'lucide-react';

const DEV_USERS = {
  admin: {
    email: 'dev-admin@example.com',
    name: 'Dev Admin',
    role: 'admin',
    icon: Shield
  },
  manager: {
    email: 'dev-manager@example.com',
    name: 'Dev Manager',
    role: 'manager',
    icon: Users
  },
  crew: {
    email: 'dev-crew@example.com',
    name: 'Dev Crew',
    role: 'crew',
    icon: Anchor
  }
};

const DevModeBar = () => {
  const { user, devLogin } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Debug logging
  // console.log('DevModeBar - NODE_ENV:', process.env.NODE_ENV);
  // console.log('DevModeBar - REACT_APP_DEV_MODE:', process.env.REACT_APP_DEV_MODE);

  // Check if dev mode bar is enabled
  // This can be controlled by:
  // 1. REACT_APP_DEV_MODE_BAR_ENABLED environment variable
  // 2. Fallback to REACT_APP_DEV_MODE for backward compatibility
  // 3. Default to showing in development environment only
  const isDevModeEnabled =
    process.env.REACT_APP_DEV_MODE_BAR_ENABLED === 'true' ||
    process.env.REACT_APP_DEV_MODE === 'true' ||
    (process.env.NODE_ENV === 'development' && process.env.REACT_APP_DEV_MODE !== 'false');

  if (!isDevModeEnabled) {
    return null;
  }

  // Additional safety check - never show on production domains
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isProductionDomain =
      hostname.includes('maritime-onboarding.com') ||
      (hostname.includes('.vercel.app') && !hostname.includes('staging') && !hostname.includes('preview'));

    if (isProductionDomain && process.env.REACT_APP_FORCE_DEV_MODE !== 'true') {
      // console.warn('DevModeBar disabled on production domain');
      return null;
    }
  }

  const handleRoleSwitch = async (role) => {
    setIsLoading(true);
    try {
      await devLogin(DEV_USERS[role].email);
    } catch (error) {
      // console.error('Dev login failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const currentUser = user ? Object.values(DEV_USERS).find(u => u.email === user.email) : null;
  const Icon = currentUser?.icon || User;

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div className="bg-yellow-400 text-black rounded-lg shadow-lg border-2 border-yellow-600">
        <div
          className="px-4 py-2 flex items-center gap-3 cursor-pointer select-none"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <span className="font-bold text-sm">🚧 DEV MODE</span>
          {user && (
            <>
              <span className="text-sm">|</span>
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {currentUser?.name || user.email} ({user.role})
                </span>
              </div>
            </>
          )}
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </div>

        {isExpanded && (
          <div className="border-t-2 border-yellow-600 p-3">
            <div className="text-xs font-semibold mb-2">Quick Switch:</div>
            <div className="flex gap-2">
              {Object.entries(DEV_USERS).map(([role, userData]) => {
                const RoleIcon = userData.icon;
                const isActive = user?.email === userData.email;

                return (
                  <button
                    key={role}
                    onClick={() => handleRoleSwitch(role)}
                    disabled={isLoading || isActive}
                    className={`
                      flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium
                      transition-all duration-200
                      ${isActive
                        ? 'bg-black text-yellow-400 cursor-default'
                        : 'bg-yellow-500 hover:bg-yellow-600 text-black'
                      }
                      ${isLoading ? 'opacity-50 cursor-wait' : ''}
                    `}
                  >
                    <RoleIcon className="h-3 w-3" />
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 pt-3 border-t border-yellow-600">
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-700">Environment:</span>
                  <span className="font-mono">{process.env.NODE_ENV}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">API URL:</span>
                  <span className="font-mono text-xs">{window.location.origin}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DevModeBar;
