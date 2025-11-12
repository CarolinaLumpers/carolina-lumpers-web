import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { sheetsApi } from '../services/sheets';
import Card from './Card';
import Badge from './Badge';
import Button from './Button';
import Loading from './Loading';

/**
 * TimeEditRequests - List and manage pending time edit requests
 */
function TimeEditRequests({ user }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [processingId, setProcessingId] = useState(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['timeEditRequestsDirect'],
    queryFn: () => sheetsApi.getTimeEditRequests(),
    staleTime: 60000, // 1 minute
  });

  const approveMutation = useMutation({
    mutationFn: (requestId) => api.approveTimeEdit(user.workerId, requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEditRequests'] });
      setProcessingId(null);
    },
    onError: () => {
      setProcessingId(null);
    },
  });

  const denyMutation = useMutation({
    mutationFn: ({ requestId, reason }) => api.denyTimeEdit(user.workerId, requestId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEditRequests'] });
      setProcessingId(null);
    },
    onError: () => {
      setProcessingId(null);
    },
  });

  const handleApprove = (requestId) => {
    if (window.confirm(t('admin.timeEdits.confirmApprove', 'Approve this time edit request?'))) {
      setProcessingId(requestId);
      approveMutation.mutate(requestId);
    }
  };

  const handleDeny = (requestId) => {
    const reason = window.prompt(
      t('admin.timeEdits.denyReason', 'Enter reason for denial (optional):')
    );
    if (reason !== null) { // User didn't cancel
      setProcessingId(requestId);
      denyMutation.mutate({ requestId, reason: reason || 'No reason provided' });
    }
  };

  if (isLoading) {
    return <Loading message={t('admin.loading.timeEdits', 'Loading time edit requests...')} />;
  }

  if (error) {
    return (
      <Card>
        <div className="text-center py-8">
          <p className="text-red-600 dark:text-red-400 mb-4">
            {t('admin.error.loadTimeEdits', 'Failed to load time edit requests')}
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

  const requests = data || [];

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              {t('admin.timeEdits.title', 'Pending Time Edit Requests')}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {t('admin.timeEdits.total', 'Total Pending')}: {requests.length}
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

      {/* Requests List */}
      <div className="space-y-4">
        {requests.map((request) => (
          <Card key={request.requestId} variant="default">
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200">
                    {request.employeeName || request.employeeId}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {request.employeeId}
                  </p>
                </div>
                <Badge variant="warning">
                  {t('admin.timeEdits.status.pending', 'Pending')}
                </Badge>
              </div>

              {/* Time Change */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                    {t('admin.timeEdits.originalTime', 'Original Time')}
                  </p>
                  <p className="font-medium text-gray-800 dark:text-gray-200">
                    {request.originalTime}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                    {t('admin.timeEdits.requestedTime', 'Requested Time')}
                  </p>
                  <p className="font-medium text-cls-amber">
                    {request.requestedTime}
                  </p>
                </div>
              </div>

              {/* Reason */}
              {request.reason && (
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                    {t('admin.timeEdits.reason', 'Reason')}
                  </p>
                  <p className="text-sm text-gray-800 dark:text-gray-200">
                    {request.reason}
                  </p>
                </div>
              )}

              {/* Submitted Date */}
              <p className="text-xs text-gray-500 dark:text-gray-500">
                {t('admin.timeEdits.submitted', 'Submitted')}: {request.submittedAt}
              </p>

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleApprove(request.requestId)}
                  disabled={processingId === request.requestId}
                  className="flex-1"
                >
                  {processingId === request.requestId && approveMutation.isLoading
                    ? t('common.processing', 'Processing...')
                    : t('admin.timeEdits.approve', 'Approve')
                  }
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDeny(request.requestId)}
                  disabled={processingId === request.requestId}
                  className="flex-1"
                >
                  {processingId === request.requestId && denyMutation.isLoading
                    ? t('common.processing', 'Processing...')
                    : t('admin.timeEdits.deny', 'Deny')
                  }
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {requests.length === 0 && (
        <Card>
          <div className="text-center py-8">
            <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-gray-600 dark:text-gray-400">
              {t('admin.timeEdits.noRequests', 'No pending time edit requests')}
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}

export default TimeEditRequests;
