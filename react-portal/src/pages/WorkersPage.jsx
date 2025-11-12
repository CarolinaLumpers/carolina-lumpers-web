import React from 'react';
import { useTranslation } from 'react-i18next';
import AllWorkersView from '../components/AllWorkersView';

/**
 * WorkersPage - Admin view of all workers
 * Shows clock-in status for all active workers (Admin only)
 */
function WorkersPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-anton text-gray-800 dark:text-gray-200">
          {t('workers.title', 'All Workers')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {t('workers.description', 'Manage all active workers and view their clock-in status')}
        </p>
      </div>

      {/* All Workers View Component */}
      <AllWorkersView />
    </div>
  );
}

export default WorkersPage;
