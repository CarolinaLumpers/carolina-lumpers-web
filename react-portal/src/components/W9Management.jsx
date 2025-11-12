import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import Card from './Card';
import Badge from './Badge';
import Button from './Button';
import Loading from './Loading';

/**
 * W9Management - List and manage pending W-9 submissions
 */
function W9Management({ user }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [processingId, setProcessingId] = useState(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['pendingW9s', user.workerId],
    queryFn: () => api.listPendingW9s(user.workerId),
    staleTime: 30000,
    refetchInterval: 60000,
  });

  const approveMutation = useMutation({
    mutationFn: (w9RecordId) => api.approveW9(w9RecordId, user.workerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingW9s'] });
      setProcessingId(null);
    },
    onError: () => {
      setProcessingId(null);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ w9RecordId, reason }) => api.rejectW9(w9RecordId, user.workerId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingW9s'] });
      setProcessingId(null);
    },
    onError: () => {
      setProcessingId(null);
    },
  });

  const handleApprove = (w9RecordId) => {
    if (window.confirm(t('admin.w9.confirmApprove', 'Approve this W-9 submission?'))) {
      setProcessingId(w9RecordId);
      approveMutation.mutate(w9RecordId);
    }
  };

  const handleReject = (w9RecordId) => {
    const reason = window.prompt(
      t('admin.w9.rejectReason', 'Enter reason for rejection:')
    );
    if (reason !== null && reason.trim()) {
      setProcessingId(w9RecordId);
      rejectMutation.mutate({ w9RecordId, reason });
    }
  };

  const handleViewPdf = (pdfUrl) => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    }
  };

  if (isLoading) {
    return <Loading message={t('admin.loading.w9s', 'Loading W-9 submissions...')} />;
  }

  if (error) {
    return (
      <Card>
        <div className="text-center py-8">
          <p className="text-red-600 dark:text-red-400 mb-4">
            {t('admin.error.loadW9s', 'Failed to load W-9 submissions')}
          </p>
          <button
            onClick={() => refetch()}
            className="text-cls-amber hover:text-amber-600"
          >
            {t('common.retry', 'Retry')}
          </button>
        </div>
      </Card>
    );
  }

  const w9List = data?.w9List || [];

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              {t('admin.w9.title', 'Pending W-9 Submissions')}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {t('admin.w9.total', 'Total Pending')}: {w9List.length}
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="p-2 text-gray-600 hover:text-cls-amber transition-colors"
            title={t('common.refresh', 'Refresh')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </Card>

      {/* W-9 List */}
      <div className="space-y-4">
        {w9List.map((w9) => (
          <Card key={w9.w9RecordId} variant="default">
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200">
                    {w9.displayName || w9.workerId}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {w9.workerId}
                  </p>
                </div>
                <Badge variant="warning">
                  {t('admin.w9.status.pending', 'Pending Review')}
                </Badge>
              </div>

              {/* W-9 Details */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                    {t('admin.w9.legalName', 'Legal Name')}
                  </p>
                  <p className="font-medium text-gray-800 dark:text-gray-200">
                    {w9.legalName || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                    {t('admin.w9.taxClass', 'Tax Classification')}
                  </p>
                  <p className="font-medium text-gray-800 dark:text-gray-200">
                    {w9.taxClassification || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                    {t('admin.w9.address', 'Address')}
                  </p>
                  <p className="font-medium text-gray-800 dark:text-gray-200">
                    {w9.address || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                    {t('admin.w9.ssnLast4', 'SSN (Last 4)')}
                  </p>
                  <p className="font-medium text-gray-800 dark:text-gray-200">
                    {w9.ssnLast4 ? `***-**-${w9.ssnLast4}` : 'N/A'}
                  </p>
                </div>
              </div>

              {/* Submitted Date */}
              <p className="text-xs text-gray-500 dark:text-gray-500">
                {t('admin.w9.submitted', 'Submitted')}: {w9.submittedDate || 'N/A'}
              </p>

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                {w9.pdfUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewPdf(w9.pdfUrl)}
                    className="flex-1"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    {t('admin.w9.viewPdf', 'View PDF')}
                  </Button>
                )}
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleApprove(w9.w9RecordId)}
                  disabled={processingId === w9.w9RecordId}
                  className="flex-1"
                >
                  {processingId === w9.w9RecordId && approveMutation.isLoading
                    ? t('common.processing', 'Processing...')
                    : t('admin.w9.approve', 'Approve')
                  }
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleReject(w9.w9RecordId)}
                  disabled={processingId === w9.w9RecordId}
                  className="flex-1"
                >
                  {processingId === w9.w9RecordId && rejectMutation.isLoading
                    ? t('common.processing', 'Processing...')
                    : t('admin.w9.reject', 'Reject')
                  }
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {w9List.length === 0 && (
        <Card>
          <div className="text-center py-8">
            <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-gray-600 dark:text-gray-400">
              {t('admin.w9.noSubmissions', 'No pending W-9 submissions')}
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}

export default W9Management;
