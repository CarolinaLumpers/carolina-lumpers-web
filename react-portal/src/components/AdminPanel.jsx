import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import AllWorkersView from './AllWorkersView';
import TimeEditRequests from './TimeEditRequests';
import W9Management from './W9Management';

/**
 * AdminPanel - Main container for admin tools
 * Tabs: Workers | Time Edits | W-9 Management
 */
function AdminPanel({ user }) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('workers');

  const tabs = [
    {
      id: 'workers',
      label: t('admin.tabs.workers', 'All Workers'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      id: 'timeEdits',
      label: t('admin.tabs.timeEdits', 'Time Edit Requests'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
    },
    {
      id: 'w9',
      label: t('admin.tabs.w9', 'W-9 Management'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="bg-white dark:bg-cls-charcoal border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-2 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap
                ${activeTab === tab.id
                  ? 'border-cls-amber text-cls-amber font-medium'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                }
              `}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'workers' && <AllWorkersView user={user} />}
        {activeTab === 'timeEdits' && <TimeEditRequests user={user} />}
        {activeTab === 'w9' && <W9Management user={user} />}
      </div>
    </div>
  );
}

export default AdminPanel;
