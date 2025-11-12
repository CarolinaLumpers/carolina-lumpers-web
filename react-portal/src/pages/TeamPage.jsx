import React from 'react';
import { useTranslation } from 'react-i18next';
import AllWorkersView from '../components/AllWorkersView';

/**
 * TeamPage - Supervisor's team overview
 * Shows clock-in status for team members (Lead role only)
 */
function TeamPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-anton text-gray-800 dark:text-gray-200">
          {t('team.title', 'My Team')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {t('team.description', 'View your team members and their clock-in status')}
        </p>
      </div>

      {/* All Workers View Component */}
      <AllWorkersView />
    </div>
  );
}

export default TeamPage;
