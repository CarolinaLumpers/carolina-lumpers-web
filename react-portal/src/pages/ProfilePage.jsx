import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../features/auth/AuthContext';
import { storage } from '../services/storage';
import Card from '../components/Card';
import Badge from '../components/Badge';

/**
 * ProfilePage - User profile and settings
 * Placeholder for future profile features
 */
function ProfilePage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();

  const handleLanguageChange = async (e) => {
    const newLang = e.target.value;
    try {
      // Change language in i18n
      await i18n.changeLanguage(newLang);
      // Save to localStorage
      storage.setLanguage(newLang);
      // Force page reload to apply changes everywhere
      window.location.reload();
    } catch (error) {
      console.error('Failed to change language:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-anton text-gray-800 dark:text-gray-200">
          {t('profile.title', 'Profile')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {t('profile.description', 'Manage your account settings and preferences')}
        </p>
      </div>

      {/* User Info Card */}
      <Card>
        <div className="flex items-start gap-6">
          {/* Avatar Placeholder */}
          <div className="w-24 h-24 rounded-full bg-cls-amber flex items-center justify-center text-4xl font-bold text-cls-charcoal">
            {user?.displayName?.charAt(0) || 'U'}
          </div>

          {/* User Details */}
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
              {user?.displayName || 'User'}
            </h2>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-gray-600 dark:text-gray-400 font-medium">
                  {t('profile.workerId', 'Worker ID')}:
                </span>
                <span className="text-gray-800 dark:text-gray-200">
                  {user?.workerId || 'N/A'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600 dark:text-gray-400 font-medium">
                  {t('profile.email', 'Email')}:
                </span>
                <span className="text-gray-800 dark:text-gray-200">
                  {user?.email || 'N/A'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600 dark:text-gray-400 font-medium">
                  {t('profile.role', 'Role')}:
                </span>
                <Badge variant={user?.role === 'Admin' ? 'success' : 'default'}>
                  {user?.role || 'Worker'}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Settings Section (Placeholder) */}
      <Card title={t('profile.settings', 'Settings')}>
        <div className="text-center py-8">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="text-gray-600 dark:text-gray-400">
            {t('profile.settingsComingSoon', 'Account settings and preferences will be available soon')}
          </p>
        </div>
      </Card>

      {/* Language Preference (Future) */}
      <Card title={t('profile.preferences', 'Preferences')}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('profile.language', 'Language')}
            </label>
            <select
              value={i18n.language}
              onChange={handleLanguageChange}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-cls-charcoal text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-cls-amber focus:border-cls-amber transition-colors"
            >
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="pt">Português</option>
            </select>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {t('profile.languageDescription', 'Select your preferred language for the interface')}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('profile.timezone', 'Timezone')}
            </label>
            <select
              disabled
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-500 cursor-not-allowed"
            >
              <option>America/New_York (EST/EDT)</option>
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              {t('profile.timezoneComingSoon', 'Timezone settings coming soon')}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default ProfilePage;
