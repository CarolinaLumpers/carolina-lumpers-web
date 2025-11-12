import React from 'react';
import { useTranslation } from 'react-i18next';
import PayrollView from '../components/PayrollView';

/**
 * PayrollPage - Payroll history and earnings view
 * Wrapper for PayrollView component with page header
 */
function PayrollPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-anton text-gray-800 dark:text-gray-200">
          {t('payroll.title', 'Payroll')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {t('payroll.description', 'View your earnings and payroll history')}
        </p>
      </div>

      {/* Payroll View Component */}
      <PayrollView />
    </div>
  );
}

export default PayrollPage;
