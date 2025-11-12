import React from 'react';
import { useTranslation } from 'react-i18next';
import ClockInHistory from '../components/ClockInHistory';

/**
 * TimeEntriesPage - Full clock-in history view
 * Wrapper for ClockInHistory component with page header
 */
function TimeEntriesPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-anton text-gray-800 dark:text-gray-200">
          {t('timeEntries.title', 'Time Entries')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {t('timeEntries.description', 'View your clock-in history and request time corrections')}
        </p>
      </div>

      {/* Clock-in History Component */}
      <ClockInHistory />
    </div>
  );
}

export default TimeEntriesPage;
