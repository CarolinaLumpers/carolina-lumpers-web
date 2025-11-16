import React from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import TimeTracker from '../components/TimeTracker';

/**
 * TimeTrackingPage - Time tracking with break button functionality
 * Uses time_events table with automatic break/hours calculations
 */
function TimeTrackingPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-anton text-gray-800 dark:text-gray-200">
          {t('timeTracking.title', 'Time Tracking')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {format(new Date(), 'EEEE, MMMM d, yyyy')} • {t('timeTracking.description', 'Clock in/out and track breaks')}
        </p>
      </div>

      {/* TimeTracker Component - Break Button System */}
      <TimeTracker />
    </div>
  );
}

export default TimeTrackingPage;
