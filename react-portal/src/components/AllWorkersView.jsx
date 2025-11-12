import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { sheetsApi } from '../services/sheets';
import Card from './Card';
import Badge from './Badge';
import Loading from './Loading';

/**
 * AllWorkersView - Display all workers with today's clock-in status
 */
function AllWorkersView({ user }) {
  const { t } = useTranslation();
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [showAddWorkerModal, setShowAddWorkerModal] = useState(false);
  const [editingWorker, setEditingWorker] = useState(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['allWorkersDirect'],
    queryFn: () => sheetsApi.getAllWorkersWithClockIns(),
    staleTime: 60000, // 1 minute
  });

  if (isLoading) {
    return <Loading message={t('admin.loading.workers', 'Loading workers...')} />;
  }

  if (error) {
    return (
      <Card>
        <div className="text-center py-8">
          <p className="text-red-600 dark:text-red-400 mb-4">
            {t('admin.error.loadWorkers', 'Failed to load workers')}
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

  const allWorkers = data?.workers || [];
  const records = data?.records || {};

  // Filter to only Active workers (not fired/quit)
  // Only show workers with explicit "Active" status in Availability column
  const workers = allWorkers.filter(w => w.availability === 'Active');

  // Count workers who clocked in today
  const workersWorkedToday = workers.filter(w => {
    const workerRecords = records[w.id] || [];
    return workerRecords.length > 0;
  }).length;

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              {t('admin.workers.title', "Today's Worker Activity")}
            </h3>
            <div className="flex gap-4 mt-1">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('admin.workers.activeToday', 'Active Today')}: <span className="font-semibold text-green-600 dark:text-green-400">{workersWorkedToday}</span>
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('admin.workers.total', 'Total in System')}: <span className="font-semibold">{workers.length}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddWorkerModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-cls-amber hover:bg-amber-500 text-cls-charcoal font-semibold rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t('admin.workers.addWorker', 'Add Worker')}
            </button>
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
        </div>
      </Card>

      {/* Workers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workers.map((worker) => {
          const workerRecords = records[worker.id] || [];
          const hasClockedIn = workerRecords.length > 0;
          const lastClockIn = workerRecords[workerRecords.length - 1];

          return (
            <Card key={worker.id} variant="default">
              <div className="space-y-3">
                {/* Worker Info */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {/* Worker Photo */}
                    {worker.photo ? (
                      <img
                        src={`http://localhost:3001/api/drive/photo/1w4zgtci_SzdG_xi5Odk98xQBaxwGzGOh/${worker.photo}`}
                        alt={worker.name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-cls-amber"
                        onError={(e) => {
                          // Fallback to initials on error
                          e.target.style.display = 'none';
                          e.target.nextElementSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    {/* Initials fallback */}
                    <div 
                      className={`w-12 h-12 rounded-full bg-cls-amber flex items-center justify-center text-lg font-bold text-cls-charcoal border-2 border-cls-amber ${worker.photo ? 'hidden' : ''}`}
                    >
                      {worker.name?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800 dark:text-gray-200">
                        {worker.name}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {worker.id}
                      </p>
                    </div>
                  </div>
                  <Badge variant={hasClockedIn ? 'success' : 'default'}>
                    {hasClockedIn 
                      ? t('admin.workers.active', 'Active')
                      : t('admin.workers.inactive', 'No Clock-In')
                    }
                  </Badge>
                </div>

                {/* Clock-In Info */}
                {hasClockedIn && (
                  <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        {t('admin.workers.clockIns', 'Clock-Ins')}:
                      </span>
                      <span className="font-medium text-gray-800 dark:text-gray-200">
                        {workerRecords.length}
                      </span>
                    </div>
                    {lastClockIn && (
                      <div className="flex items-center justify-between text-sm mt-1">
                        <span className="text-gray-600 dark:text-gray-400">
                          {t('admin.workers.lastClockIn', 'Last')}:
                        </span>
                        <span className="font-medium text-gray-800 dark:text-gray-200">
                          {lastClockIn.time}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* View Details Button */}
                <button
                  className="w-full mt-2 px-3 py-2 text-sm text-cls-amber hover:bg-amber-50 dark:hover:bg-gray-800 rounded transition-colors"
                  onClick={() => setSelectedWorker(worker)}
                >
                  {t('admin.workers.viewDetails', 'View Details')}
                </button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {workers.length === 0 && (
        <Card>
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-400">
              {t('admin.workers.noWorkers', 'No workers found')}
            </p>
          </div>
        </Card>
      )}

      {/* Worker Details Modal */}
      {selectedWorker && (
        <WorkerDetailsModal
          worker={selectedWorker}
          records={records}
          onClose={() => setSelectedWorker(null)}
          onUpdate={() => {
            setSelectedWorker(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}

/**
 * WorkerDetailsModal - View-only modal for worker details
 */
function WorkerDetailsModal({ worker, records, onClose }) {
  const { t } = useTranslation();

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-cls-charcoal rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="sticky top-0 bg-white dark:bg-cls-charcoal border-b border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {/* Worker Photo */}
              {worker.photo ? (
                <div className="relative">
                  <img
                    src={`http://localhost:3001/api/drive/photo/1w4zgtci_SzdG_xi5Odk98xQBaxwGzGOh/${worker.photo}`}
                    alt={worker.name}
                    className="w-20 h-20 rounded-full object-cover border-2 border-cls-amber"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.parentElement.nextElementSibling.style.display = 'flex';
                    }}
                  />
                  <div className="hidden w-20 h-20 rounded-full bg-cls-amber flex items-center justify-center text-2xl font-bold text-cls-charcoal border-2 border-cls-amber">
                    {worker.name?.charAt(0) || 'U'}
                  </div>
                </div>
              ) : (
                <div className="w-20 h-20 rounded-full bg-cls-amber flex items-center justify-center text-2xl font-bold text-cls-charcoal border-2 border-cls-amber">
                  {worker.name?.charAt(0) || 'U'}
                </div>
              )}
              <div>
                <h2 className="text-2xl font-anton text-gray-800 dark:text-gray-200">
                  {worker.name}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {worker.id}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6">
          {/* Personal Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
              {t('admin.workers.personalInfo', 'Personal Information')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DetailItem label="First Name" value={worker.firstName} />
              <DetailItem label="Last Name" value={worker.lastName} />
              <DetailItem label="Employee ID" value={worker.employeeId} />
              <DetailItem label="Email" value={worker.email} />
              <DetailItem label="Phone" value={worker.phone} />
              <DetailItem label="Primary Language" value={worker.primaryLanguage} />
            </div>
          </div>

          {/* Work Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
              {t('admin.workers.workInfo', 'Work Information')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DetailItem label="Role" value={worker.role} />
              <DetailItem label="Service Item" value={worker.serviceItem} />
              <DetailItem label="Availability" value={worker.availability}>
                <Badge variant={worker.availability === 'Active' ? 'success' : 'default'}>
                  {worker.availability || 'Not Set'}
                </Badge>
              </DetailItem>
              <DetailItem label="App Access" value={worker.appAccess} />
            </div>
          </div>

          {/* Compensation */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
              {t('admin.workers.compensation', 'Compensation')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DetailItem label="Hourly Rate" value={worker.hourlyRate ? `$${worker.hourlyRate}` : ''} />
              <DetailItem label="Flat Rate Bonus" value={worker.flatRateBonus ? `$${worker.flatRateBonus}` : ''} />
            </div>
          </div>

          {/* System Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
              {t('admin.workers.systemInfo', 'System Information')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DetailItem label="QuickBooks ID" value={worker.qboid} />
              <DetailItem label="W-9 Status" value={worker.w9Status}>
                <Badge variant={worker.w9Status === 'Approved' ? 'success' : 'warning'}>
                  {worker.w9Status || 'Not Submitted'}
                </Badge>
              </DetailItem>
            </div>
          </div>

          {/* Today's Activity */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
              {t('admin.workers.todayActivity', "Today's Activity")}
            </h3>
            {records[worker.id]?.length > 0 ? (
              <div className="space-y-2">
                {records[worker.id].map((record, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-800 dark:text-gray-200">
                        {record.site}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {record.time}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                {t('admin.workers.noClockIns', 'No clock-ins today')}
              </p>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-cls-charcoal border-t border-gray-200 dark:border-gray-700 p-6">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-cls-amber text-cls-charcoal font-medium rounded-lg hover:bg-amber-500 transition-colors"
          >
            {t('common.close', 'Close')}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * DetailItem - Reusable component for displaying worker detail fields
 */
function DetailItem({ label, value, children }) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
        {label}
      </p>
      {children || (
        <p className="text-gray-800 dark:text-gray-200">
          {value || '—'}
        </p>
      )}
    </div>
  );
}

/**
 * AddWorkerModal - Modal for adding new worker
 */
function AddWorkerModal({ onClose, onSuccess }) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    workerId: '',
    employeeId: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'Worker',
    serviceItem: '',
    hourlyRate: '',
    flatRateBonus: '',
    availability: 'Active',
    appAccess: 'Enabled',
    primaryLanguage: 'English',
    w9Status: 'Not Submitted',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      // Generate display name
      const displayName = `${formData.firstName} ${formData.lastName}`.trim();
      
      await sheetsApi.addWorker({
        ...formData,
        displayName,
        applicationId: '',
        workHistory: '',
        photo: '',
        qboid: '',
      });

      onSuccess();
    } catch (err) {
      setError(err.message || 'Failed to add worker');
      setSaving(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-cls-charcoal rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-cls-charcoal border-b border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-anton text-gray-800 dark:text-gray-200">
                {t('admin.workers.addNewWorker', 'Add New Worker')}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Form Content */}
          <div className="p-6 space-y-6">
            {error && (
              <div className="p-4 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-lg">
                <p className="text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}

            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
                Basic Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Worker ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="workerId"
                    value={formData.workerId}
                    onChange={handleChange}
                    required
                    placeholder="e.g., SG-001"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Employee ID
                  </label>
                  <input
                    type="text"
                    name="employeeId"
                    value={formData.employeeId}
                    onChange={handleChange}
                    placeholder="Optional"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="(555) 123-4567"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                  />
                </div>
              </div>
            </div>

            {/* Work Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
                Work Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Role
                  </label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                  >
                    <option value="Worker">Worker</option>
                    <option value="Lead">Lead</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Service Item
                  </label>
                  <input
                    type="text"
                    name="serviceItem"
                    value={formData.serviceItem}
                    onChange={handleChange}
                    placeholder="e.g., Lumper Service"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Hourly Rate
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="hourlyRate"
                    value={formData.hourlyRate}
                    onChange={handleChange}
                    placeholder="0.00"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Flat Rate Bonus
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="flatRateBonus"
                    value={formData.flatRateBonus}
                    onChange={handleChange}
                    placeholder="0.00"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Availability
                  </label>
                  <select
                    name="availability"
                    value={formData.availability}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Primary Language
                  </label>
                  <select
                    name="primaryLanguage"
                    value={formData.primaryLanguage}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                  >
                    <option value="English">English</option>
                    <option value="Spanish">Spanish</option>
                    <option value="Portuguese">Portuguese</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white dark:bg-cls-charcoal border-t border-gray-200 dark:border-gray-700 p-6">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-4 py-2 bg-cls-amber text-cls-charcoal font-medium rounded-lg hover:bg-amber-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? t('common.saving', 'Saving...') : t('common.save', 'Add Worker')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AllWorkersView;
