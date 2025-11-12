import React from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../components/Card';

/**
 * ReportsPage - Reports and analytics hub
 * Placeholder for future reporting features (Admin only)
 */
function ReportsPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-anton text-gray-800 dark:text-gray-200">
          {t('reports.title', 'Reports & Analytics')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {t('reports.description', 'Generate reports and view analytics')}
        </p>
      </div>

      {/* Coming Soon Card */}
      <Card>
        <div className="text-center py-12">
          <svg className="w-20 h-20 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
            {t('reports.comingSoon', 'Coming Soon')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
            {t('reports.comingSoonMessage', 'Advanced reporting and analytics features will be available here soon. Stay tuned!')}
          </p>
        </div>
      </Card>

      {/* Future Report Types (Placeholder) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <div className="p-4">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">
              {t('reports.attendanceReport', 'Attendance Report')}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {t('reports.attendanceDescription', 'Worker attendance and punctuality metrics')}
            </p>
            <button
              disabled
              className="w-full px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-500 rounded cursor-not-allowed"
            >
              {t('common.comingSoon', 'Coming Soon')}
            </button>
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">
              {t('reports.payrollSummary', 'Payroll Summary')}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {t('reports.payrollDescription', 'Comprehensive payroll and hours summary')}
            </p>
            <button
              disabled
              className="w-full px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-500 rounded cursor-not-allowed"
            >
              {t('common.comingSoon', 'Coming Soon')}
            </button>
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">
              {t('reports.siteActivity', 'Site Activity')}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {t('reports.siteDescription', 'Clock-ins by location and site trends')}
            </p>
            <button
              disabled
              className="w-full px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-500 rounded cursor-not-allowed"
            >
              {t('common.comingSoon', 'Coming Soon')}
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default ReportsPage;
