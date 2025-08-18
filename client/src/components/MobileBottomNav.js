import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  BarChart3,
  BookOpen,
  User,
  Users,
  Award,
  Settings,
  HelpCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

const MobileBottomNav = () => {
  const { user } = useAuth();
  const location = useLocation();
  const { t } = useTranslation('common');

  // Define navigation based on user role
  const getNavigation = () => {
    if (user?.role === 'admin') {
      return [
        { name: t('admin.dashboard'), href: '/admin', icon: BarChart3 },
        { name: t('navigation.profile'), href: '/profile', icon: User },
        { name: t('navigation.settings'), href: '/admin/settings', icon: Settings }
      ];
    }

    if (user?.role === 'manager') {
      return [
        { name: t('navigation.dashboard'), href: '/manager', icon: BarChart3 },
        { name: t('admin.crew_members'), href: '/manager/crew', icon: Users },
        { name: t('navigation.profile'), href: '/profile', icon: User }
      ];
    }

    // Crew navigation
    return [
      { name: t('navigation.dashboard'), href: '/crew', icon: BarChart3 },
      { name: t('navigation.training'), href: '/crew/training', icon: BookOpen },
      { name: t('navigation.profile'), href: '/crew/profile', icon: User }
    ];
  };

  const navigation = getNavigation();

  const isActive = (href) => {
    if (href === '/manager' || href === '/crew' || href === '/admin') {
      return location.pathname === href;
    }
    return location.pathname.startsWith(href);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 lg:hidden z-40">
      <div className="grid grid-cols-3 gap-1 p-2">
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.name}
              to={item.href}
              className={`flex flex-col items-center justify-center py-3 px-2 rounded-lg transition-all duration-200 mobile-nav-item ${
                active
                  ? 'bg-burando-teal text-white shadow-md'
                  : 'text-gray-600 hover:text-burando-teal hover:bg-gray-100'
              }`}
            >
              <Icon className={`h-5 w-5 mb-1 ${active ? 'text-white' : ''}`} />
              <span className={`text-xs font-medium truncate max-w-16 ${active ? 'text-white' : ''}`}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default MobileBottomNav;
