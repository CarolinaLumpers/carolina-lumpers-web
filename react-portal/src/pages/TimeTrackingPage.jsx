import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { sheetsApi } from '../services/sheets';
import { format } from 'date-fns';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Loading from '../components/Loading';

/**
 * TimeTrackingPage - Detailed view of all clock-in records
 * Shows timesheet-style view with all entries, filterable by worker/date
 */
function TimeTrackingPage() {
  const { t } = useTranslation();
  const [selectedWorker, setSelectedWorker] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch all workers with today's clock-ins
  const { data: teamData, isLoading: teamLoading } = useQuery({
    queryKey: ['allWorkersDirect'],
    queryFn: () => sheetsApi.getAllWorkersWithClockIns(),
    staleTime: 60000,
  });

  const workers = teamData?.workers || [];
  const records = teamData?.records || {};

  // Flatten all records into a single list
  const allRecords = Object.entries(records)
    .flatMap(([workerId, entries]) =>
      entries.map(entry => ({
        workerId,
        worker: workers.find(w => w.id === workerId),
        ...entry
      }))
    )
    .sort((a, b) => b.time.localeCompare(a.time)); // Most recent first

  // Filter records
  const filteredRecords = allRecords.filter(record => {
    const matchesWorker = selectedWorker === 'all' || record.workerId === selectedWorker;
    const matchesSearch = !searchQuery || 
      record.worker?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.site?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesWorker && matchesSearch;
  });

  const totalClockIns = allRecords.length;
  const uniqueWorkers = new Set(allRecords.map(r => r.workerId)).size;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-anton text-gray-800 dark:text-gray-200">
          {t('timeTracking.title', 'Time Tracking')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {format(new Date(), 'EEEE, MMMM d, yyyy')} • {t('timeTracking.description', 'All clock-in records')}
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Clock-Ins Today</p>
            <p className="text-3xl font-bold text-gray-800 dark:text-white">
              {teamLoading ? '...' : totalClockIns}
            </p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Workers Active</p>
            <p className="text-3xl font-bold text-gray-800 dark:text-white">
              {teamLoading ? '...' : uniqueWorkers}
            </p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Filtered Results</p>
            <p className="text-3xl font-bold text-gray-800 dark:text-white">
              {filteredRecords.length}
            </p>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search
            </label>
            <input
              type="text"
              placeholder="Search by worker name or site..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
            />
          </div>

          {/* Worker Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Filter by Worker
            </label>
            <select
              value={selectedWorker}
              onChange={(e) => setSelectedWorker(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
            >
              <option value="all">All Workers ({uniqueWorkers})</option>
              {workers
                .filter(w => records[w.id]?.length > 0)
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(worker => (
                  <option key={worker.id} value={worker.id}>
                    {worker.name} ({records[worker.id].length})
                  </option>
                ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Records Table */}
      <Card title={`Clock-In Records (${filteredRecords.length})`}>
        {teamLoading ? (
          <Loading message="Loading records..." />
        ) : filteredRecords.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-400">
              {searchQuery || selectedWorker !== 'all' 
                ? 'No records match your filters' 
                : 'No clock-ins recorded today'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Worker
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Site
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Time
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Distance
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record, index) => (
                  <tr 
                    key={index}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {record.worker?.photo ? (
                          <img
                            src={`http://localhost:3001/api/drive/photo/1w4zgtci_SzdG_xi5Odk98xQBaxwGzGOh/${record.worker.photo}`}
                            alt={record.worker.name}
                            className="w-8 h-8 rounded-full object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextElementSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div 
                          className={`w-8 h-8 rounded-full bg-cls-amber flex items-center justify-center text-xs font-bold text-cls-charcoal ${record.worker?.photo ? 'hidden' : ''}`}
                        >
                          {record.worker?.name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800 dark:text-gray-200">
                            {record.worker?.name || record.workerId}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {record.workerId}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-800 dark:text-gray-200">
                      {record.site || 'Unknown'}
                    </td>
                    <td className="py-3 px-4 text-gray-800 dark:text-gray-200">
                      {record.time}
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                      {record.distance ? `${record.distance} mi` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

export default TimeTrackingPage;
