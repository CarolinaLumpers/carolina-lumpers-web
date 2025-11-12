import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import W9Management from '../components/W9Management';
import TimeEditRequests from '../components/TimeEditRequests';

/**
 * ApprovalsPage - Admin approval hub
 * Contains W-9 submissions and time edit requests (Admin only)
 */
function ApprovalsPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('w9'); // 'w9' or 'timeEdits'

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-anton text-gray-800 dark:text-gray-200">
          {t('approvals.title', 'Approvals')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {t('approvals.description', 'Review and approve pending W-9 submissions and time corrections')}
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('w9')}
            className={`py-3 px-4 font-medium transition-colors border-b-2 ${
              activeTab === 'w9'
                ? 'border-cls-amber text-cls-amber'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            {t('approvals.w9Submissions', 'W-9 Submissions')}
          </button>
          <button
            onClick={() => setActiveTab('timeEdits')}
            className={`py-3 px-4 font-medium transition-colors border-b-2 ${
              activeTab === 'timeEdits'
                ? 'border-cls-amber text-cls-amber'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            {t('approvals.timeEditRequests', 'Time Edit Requests')}
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'w9' ? (
          <W9Management />
        ) : (
          <TimeEditRequests />
        )}
      </div>
    </div>
  );
}

export default ApprovalsPage;
