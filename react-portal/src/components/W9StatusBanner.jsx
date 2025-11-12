import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuth } from '../features/auth/AuthContext';
import Badge from './Badge';

const W9StatusBanner = () => {
  const { t } = useTranslation();
  const { user, updateW9Status } = useAuth();

  // Fetch W-9 status
  const { data } = useQuery({
    queryKey: ['w9Status', user.workerId],
    queryFn: () => api.getW9Status(user.workerId),
    staleTime: 5 * 60 * 1000, // 5 minutes - reduced API calls
    gcTime: 10 * 60 * 1000, // 10 minutes in cache
    refetchOnWindowFocus: false, // Don't refetch when switching tabs
    refetchOnMount: false, // Don't refetch on every mount
    retry: 1, // Only retry once on failure
    onSuccess: (data) => {
      if (data?.w9Status && data.w9Status !== user.w9Status) {
        updateW9Status(data.w9Status);
      }
    },
  });

  const w9Status = data?.w9Status || user.w9Status;

  // Only show banner if W-9 is not approved
  if (w9Status === 'approved') {
    return null;
  }

  const statusConfig = {
    pending: {
      variant: 'warning',
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
        </svg>
      ),
      title: t('w9.pending', 'W-9 Form Pending Review'),
      message: t('w9.pendingMessage', 'Your W-9 form is being reviewed. You will be notified once approved.'),
    },
    required: {
      variant: 'error',
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      ),
      title: t('w9.required', 'W-9 Form Required'),
      message: t('w9.requiredMessage', 'Please submit your W-9 form to continue working. This is required for payroll.'),
      actionLabel: t('w9.submit', 'Submit W-9'),
      actionLink: '/w9-form', // TODO: Add W-9 form route
    },
  };

  const config = statusConfig[w9Status] || statusConfig.required;

  return (
    <div className={`mb-6 p-4 rounded-lg border-l-4 ${
      config.variant === 'warning' 
        ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-400' 
        : 'bg-red-50 dark:bg-red-900/20 border-red-400'
    }`}>
      <div className="flex items-start">
        <div className={`flex-shrink-0 ${
          config.variant === 'warning' ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'
        }`}>
          {config.icon}
        </div>
        <div className="ml-3 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className={`text-sm font-medium ${
              config.variant === 'warning' ? 'text-yellow-800 dark:text-yellow-200' : 'text-red-800 dark:text-red-200'
            }`}>
              {config.title}
            </h3>
            <Badge variant={config.variant}>{w9Status}</Badge>
          </div>
          <p className={`text-sm ${
            config.variant === 'warning' ? 'text-yellow-700 dark:text-yellow-300' : 'text-red-700 dark:text-red-300'
          }`}>
            {config.message}
          </p>
          {config.actionLink && (
            <a
              href={config.actionLink}
              className={`mt-3 inline-block px-4 py-2 rounded-lg font-medium transition-colors ${
                config.variant === 'warning'
                  ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              {config.actionLabel}
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default W9StatusBanner;
