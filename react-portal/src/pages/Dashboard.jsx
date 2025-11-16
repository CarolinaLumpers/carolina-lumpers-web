import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../features/auth/AuthContext';
import Card from '../components/Card';
import TimeTracker from '../components/TimeTracker';
import ClockInHistory from '../components/ClockInHistory';
import W9StatusBanner from '../components/W9StatusBanner';
import { storage } from '../services/storage';

function Dashboard() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleClockInSuccess = () => {
    // Trigger refresh of clock-in history
    setRefreshTrigger(prev => prev + 1);
  };

  // Get formatted date based on current language
  const getFormattedDate = () => {
    const now = new Date();
    const lang = i18n.language || storage.getLanguage() || 'en';

    // Map language codes to proper locales
    const localeMap = {
      'en': 'en-US',
      'es': 'es-ES',
      'pt': 'pt-BR'
    };

    const locale = localeMap[lang] || 'en-US';

    const dateOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };

    return new Intl.DateTimeFormat(locale, dateOptions).format(now);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-anton text-gray-800 dark:text-gray-200">
          {t('dashboard.timeTracking', 'Time Tracking')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {getFormattedDate()}
        </p>
      </div>

      {/* Welcome Section */}
      <div className="mb-6">
        <h3 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">
          {t('dashboard.welcome', { name: user?.displayName || 'User' })}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {user?.role && (
            <span className="inline-block px-2 py-1 bg-cls-amber text-cls-charcoal rounded text-sm font-medium">
              {user.role}
            </span>
          )}
        </p>
      </div>

      {/* W-9 Status Banner */}
      <W9StatusBanner />

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Time Tracker (2 columns on large screens) */}
        <div className="lg:col-span-2">
          <TimeTracker onClockInOut={handleClockInSuccess} />
        </div>

        {/* Right Column - Today's Entries */}
        <div className="lg:col-span-1">
          <Card title={t('dashboard.todayEntries', "Today's Entries")}>
            <ClockInHistory refreshTrigger={refreshTrigger} />
          </Card>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
