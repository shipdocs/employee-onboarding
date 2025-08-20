import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  LogOut,
  User,
  Ship,
  BookOpen,
  Users,
  BarChart3,
  Menu,
  X,
  Shield
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import MobileBottomNav from './MobileBottomNav';
import ThemeToggle from './ThemeToggle';

const Layout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { t } = useTranslation('common');

  const handleLogout = () => {
    logout();
  };

  const navigation = user?.role === 'admin' ? [
    { name: t('admin.dashboard'), href: '/admin', icon: BarChart3 },
    { name: t('navigation.profile'), href: '/profile', icon: User },
    { name: t('navigation.gdpr'), href: '/gdpr', icon: Shield }
  ] : user?.role === 'manager' ? [
    { name: t('navigation.dashboard'), href: '/manager', icon: BarChart3 },
    { name: t('admin.crew_members'), href: '/manager/crew', icon: Users },
    { name: t('navigation.profile'), href: '/profile', icon: User },
    { name: t('navigation.gdpr'), href: '/gdpr', icon: Shield }
  ] : [
    { name: t('navigation.dashboard'), href: '/crew', icon: BarChart3 },
    { name: t('navigation.training'), href: '/crew/training', icon: BookOpen },
    { name: t('navigation.profile'), href: '/crew/profile', icon: User },
    { name: t('navigation.gdpr'), href: '/gdpr', icon: Shield }
  ];

  const isActive = (href) => {
    if (href === '/manager' || href === '/crew') {
      return location.pathname === href;
    }
    return location.pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen maritime-bg">
      {/* Header */}
      <header className="nav-glass sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <div className="flex items-center">
              <img
                src="/maritime-logo.svg"
                alt="Maritime Onboarding Platform"
                className="h-10 w-auto mr-4"
              />
              <div>
                <h1 className="text-xl font-bold text-gradient-navy">
                  {t('general.maritime_platform')}
                </h1>
                <p className="text-sm text-gradient-primary font-medium">{t('crew.onboarding')}</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                      isActive(item.href)
                        ? 'glass-button text-white shadow-lg'
                        : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/20 dark:hover:bg-white/10 hover:backdrop-blur-sm'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              {/* Theme Toggle */}
              <ThemeToggle size="md" />

              {/* Language Switcher */}
              <LanguageSwitcher />

              <div className="hidden md:block text-right">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 capitalize">
                  {user?.role}
                </p>
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 transition-all duration-300 rounded-xl hover:bg-red-50/80 dark:hover:bg-red-900/20 hover:backdrop-blur-sm border border-transparent hover:border-red-200 dark:hover:border-red-800"
                title={t('navigation.logout')}
              >
                <LogOut className="h-4 w-4" />
                <span className="ml-2 hidden md:inline">{t('navigation.logout')}</span>
              </button>

              {/* Mobile menu button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-3 rounded-lg text-gray-700 hover:text-maritime-teal hover:bg-gray-100 touch-target transition-all duration-200"
                aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
              >
                {isMobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
            <div className="px-4 py-4 space-y-2">
              {/* User info */}
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 mb-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-base font-medium text-gray-900 dark:text-gray-100">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                      {user?.role}
                    </p>
                  </div>
                  {/* Mobile Theme Toggle */}
                  <ThemeToggle size="sm" />
                </div>
              </div>

              {/* Navigation items */}
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`maritime-nav-link flex items-center px-4 py-4 rounded-lg text-base font-medium transition-all duration-200 touch-target ${
                      isActive(item.href)
                        ? 'text-maritime-teal bg-maritime-teal/10 active shadow-sm'
                        : 'text-gray-700 dark:text-gray-300 hover:text-maritime-teal hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Icon className="h-5 w-5 mr-4" />
                    {item.name}
                  </Link>
                );
              })}

              {/* Mobile Logout Button */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center px-4 py-4 text-base font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200 touch-target mt-4 border-t border-gray-200 dark:border-gray-700 pt-6"
              >
                <LogOut className="h-5 w-5 mr-4" />
                {t('navigation.logout')}
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-8 pb-20 lg:pb-8">
        <div className="fade-in">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer className="glass-card mt-auto mx-4 md:mx-6 mb-4 md:mb-6 hidden lg:block">
        <div className="px-4 md:px-6 py-4">
          <div className="flex flex-col md:flex-row justify-between items-center text-center md:text-left">
            <div className="flex flex-col md:flex-row items-center mb-4 md:mb-0">
              <img
                src="/maritime-logo.svg"
                alt="Maritime Onboarding Platform"
                className="h-6 w-auto mr-0 md:mr-3 mb-2 md:mb-0"
              />
              <span className="text-xs md:text-sm text-slate-600 dark:text-slate-400">
                © 2024 {t('general.maritime_platform')} {t('general.maritime_services')}. {t('general.all_rights_reserved')}.
              </span>
            </div>
            <div className="text-xs md:text-sm text-gradient-primary font-medium">
              {t('general.safety_management_system')} v1.0
            </div>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
};

export default Layout;
