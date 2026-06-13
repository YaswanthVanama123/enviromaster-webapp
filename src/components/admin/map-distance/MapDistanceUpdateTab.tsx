

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { mapDistanceApi, MapDistanceSyncJob, MapDistanceStats, MapDistanceRecord, RouteStarCustomerOption } from '../../../backendservice/api/mapDistanceApi';
import { MdRefresh, MdCancel, MdStorage, MdHistory, MdPerson, MdCalendarToday, MdLocationOn, MdStraighten, MdCheckCircle, MdError, MdSchedule, MdSync, MdPlayArrow, MdPause, MdFilterList, MdClose, MdExpandMore, MdDeleteForever } from 'react-icons/md';
import './MapDistanceUpdateTab.css';

export const MapDistanceUpdateTab: React.FC = () => {
  const { t } = useTranslation();
  const [syncStatus, setSyncStatus] = useState<{ isRunning: boolean; isInterrupted: boolean; isPaused: boolean; job: MapDistanceSyncJob | null }>({
    isRunning: false,
    isInterrupted: false,
    isPaused: false,
    job: null
  });
  const [stats, setStats] = useState<MapDistanceStats | null>(null);
  const [syncHistory, setSyncHistory] = useState<MapDistanceSyncJob[]>([]);
  const [storedRecords, setStoredRecords] = useState<MapDistanceRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'records' | 'history'>('records');

  const [customersWithData, setCustomersWithData] = useState<RouteStarCustomerOption[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [filterSearch, setFilterSearch] = useState('');
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadStats();
    checkSyncStatus();
    loadStoredRecords(1);
    loadCustomersWithData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setFilterDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (syncStatus.isRunning) {
      pollIntervalRef.current = setInterval(() => {
        checkSyncStatus();
      }, 2000);
    } else if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
      
      loadStats();
      loadStoredRecords(currentPage);
      loadCustomersWithData();
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [syncStatus.isRunning]);

  const loadStats = async () => {
    const data = await mapDistanceApi.getStats();
    setStats(data);
  };

  const checkSyncStatus = async () => {
    const status = await mapDistanceApi.getSyncStatus();
    setSyncStatus({
      isRunning: status.isRunning,
      isInterrupted: status.isInterrupted,
      isPaused: status.isPaused,
      job: status.job
    });
  };

  const loadSyncHistory = async () => {
    const history = await mapDistanceApi.getSyncHistory();
    setSyncHistory(history);
  };

  const loadCustomersWithData = async () => {
    const customers = await mapDistanceApi.getCustomersWithData();
    setCustomersWithData(customers);
  };

  const loadStoredRecords = async (page: number, customerId?: string | null) => {
    const filterCustomerId = customerId !== undefined ? customerId : selectedCustomerId;
    const result = await mapDistanceApi.getStoredRecords({
      page,
      limit: 50,
      customerId: filterCustomerId || undefined
    });
    setStoredRecords(result.records);
    setTotalRecords(result.total);
    setCurrentPage(page);
  };

  const handleCustomerFilterSelect = (customerId: string | null) => {
    setSelectedCustomerId(customerId);
    setFilterDropdownOpen(false);
    setFilterSearch('');
    loadStoredRecords(1, customerId);
  };

  const getSelectedCustomerName = () => {
    if (!selectedCustomerId) return t('adminTools.mapDistanceUpdate.allCustomers');
    const customer = customersWithData.find(c => c._id === selectedCustomerId);
    return customer?.name || t('adminTools.mapDistanceUpdate.unknown');
  };

  const filteredCustomers = customersWithData.filter(c =>
    c.name.toLowerCase().includes(filterSearch.toLowerCase()) ||
    (c.company && c.company.toLowerCase().includes(filterSearch.toLowerCase())) ||
    (c.city && c.city.toLowerCase().includes(filterSearch.toLowerCase()))
  );

  const handleDeleteAllRecords = async () => {
    setIsDeleting(true);
    setError(null);
    const result = await mapDistanceApi.deleteAllRecords();
    setIsDeleting(false);
    setShowDeleteConfirm(false);

    if (result.success) {
      
      loadStats();
      loadStoredRecords(1);
      loadCustomersWithData();
      checkSyncStatus();
      setSelectedCustomerId(null);
    } else {
      setError(result.error || t('adminTools.mapDistanceUpdate.failedToDelete'));
    }
  };

  const handleStartUpdateSync = async () => {
    setError(null);
    const result = await mapDistanceApi.startUpdateSync();
    if (result.success) {
      checkSyncStatus();
    } else {
      setError(result.error || t('adminTools.mapDistanceUpdate.failedToStartUpdate'));
    }
  };

  const handleCancelSync = async () => {
    const result = await mapDistanceApi.cancelSync();
    if (result.success) {
      checkSyncStatus();
      loadSyncHistory();
    }
  };

  const handlePauseSync = async () => {
    const result = await mapDistanceApi.pauseSync();
    if (result.success) {
      checkSyncStatus();
      loadSyncHistory();
    } else {
      setError(result.error || t('adminTools.mapDistanceUpdate.failedToPauseSync'));
    }
  };

  const handleResetStuckJob = async () => {
    const result = await mapDistanceApi.resetStuckJobs();
    if (result.success) {
      checkSyncStatus();
      loadSyncHistory();
    }
  };

  const handleResumeSync = async (jobId: string) => {
    setError(null);
    const result = await mapDistanceApi.resumeSync(jobId);
    if (result.success) {
      checkSyncStatus();
    } else {
      setError(result.error || t('adminTools.mapDistanceUpdate.failedToResumeSync'));
    }
  };

  const getSyncProgress = () => {
    if (!syncStatus.job) return 0;
    const { processedCustomers, totalCustomers } = syncStatus.job;
    if (totalCustomers === 0) return 0;
    return Math.round((processedCustomers / totalCustomers) * 100);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString();
  };

  const getJobTypeLabel = (jobType: string) => {
    switch (jobType) {
      case 'single_fetch': return t('adminTools.mapDistanceUpdate.jobTypeSingleFetch');
      case 'full_sync': return t('adminTools.mapDistanceUpdate.jobTypeFullSync');
      case 'update_sync': return t('adminTools.mapDistanceUpdate.jobTypeUpdateSync');
      default: return jobType;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <MdCheckCircle size={16} color="#059669" />;
      case 'failed': return <MdError size={16} color="#dc2626" />;
      case 'running': return <MdSync size={16} color="#2563eb" className="mdu-spin" />;
      case 'cancelled': return <MdCancel size={16} color="#f59e0b" />;
      default: return <MdSchedule size={16} color="#64748b" />;
    }
  };

  const totalPages = Math.ceil(totalRecords / 50);
  const isJobRunning = syncStatus.isRunning;
  const isJobInterrupted = syncStatus.isInterrupted;
  const isJobPaused = syncStatus.isPaused;
  const isUpdateSyncRunning = isJobRunning && syncStatus.job?.jobType === 'update_sync';
  const isUpdateSyncInterrupted = isJobInterrupted && syncStatus.job?.jobType === 'update_sync';
  const isUpdateSyncPaused = isJobPaused && syncStatus.job?.jobType === 'update_sync';

  return (
    <div className="md-update-tab">
      {}
      <div className="mdu-header">
        <div className="mdu-header-top">
          <div>
            <h2>{t('adminTools.mapDistanceUpdate.title')}</h2>
            <p className="mdu-subtitle">
              {t('adminTools.mapDistanceUpdate.subtitle')}
            </p>
          </div>
          <div className="mdu-header-actions">
            {isUpdateSyncRunning ? (
              <>
                <button className="mdu-pause-btn" onClick={handlePauseSync}>
                  <MdPause size={18} />
                  {t('adminTools.mapDistanceUpdate.pause')}
                </button>
                <button className="mdu-cancel-btn" onClick={handleCancelSync}>
                  <MdCancel size={18} />
                  {t('adminTools.mapDistanceUpdate.cancel')}
                </button>
              </>
            ) : (isUpdateSyncInterrupted || isUpdateSyncPaused) ? (
              <button className="mdu-resume-btn" onClick={() => syncStatus.job && handleResumeSync(syncStatus.job._id)}>
                <MdPlayArrow size={18} />
                {t('adminTools.mapDistanceUpdate.resumeUpdate', { processed: syncStatus.job?.processedCustomers, total: syncStatus.job?.totalCustomers })}
              </button>
            ) : (
              <>
                <button
                  className="mdu-update-btn"
                  onClick={handleStartUpdateSync}
                  disabled={!stats || stats.customersWithData === 0 || isJobRunning || isJobInterrupted || isJobPaused}
                >
                  <MdRefresh size={18} />
                  {stats && stats.customersWithData > 0
                    ? t('adminTools.mapDistanceUpdate.updateAllData', { count: stats.customersWithData })
                    : t('adminTools.mapDistanceUpdate.noDataToUpdate')
                  }
                </button>
                <button
                  className="mdu-delete-btn"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={!stats || stats.totalRecords === 0 || isJobRunning}
                  title={t('adminTools.mapDistanceUpdate.deleteAllTitle')}
                >
                  <MdDeleteForever size={18} />
                  {t('adminTools.mapDistanceUpdate.deleteAll')}
                </button>
              </>
            )}
          </div>
        </div>

        {}
        {showDeleteConfirm && (
          <div className="mdu-modal-overlay">
            <div className="mdu-modal">
              <div className="mdu-modal-header">
                <MdDeleteForever size={24} color="#dc2626" />
                <h3>{t('adminTools.mapDistanceUpdate.deleteRecordsTitle')}</h3>
              </div>
              <p className="mdu-modal-text">
                {t('adminTools.mapDistanceUpdate.deleteRecordsText', { count: stats?.totalRecords.toLocaleString() })}
              </p>
              <div className="mdu-modal-actions">
                <button
                  className="mdu-modal-cancel"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                >
                  {t('adminTools.mapDistanceUpdate.cancel')}
                </button>
                <button
                  className="mdu-modal-delete"
                  onClick={handleDeleteAllRecords}
                  disabled={isDeleting}
                >
                  {isDeleting ? t('adminTools.mapDistanceUpdate.deleting') : t('adminTools.mapDistanceUpdate.yesDeleteAll')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats Bar */}
        {stats && (
          <div className="mdu-stats-bar">
            <div className="mdu-stat">
              <span className="mdu-stat-value">{stats.totalRecords.toLocaleString()}</span>
              <span className="mdu-stat-label">{t('adminTools.mapDistanceUpdate.totalRecords')}</span>
            </div>
            <div className="mdu-stat">
              <span className="mdu-stat-value">{stats.customersWithData.toLocaleString()}</span>
              <span className="mdu-stat-label">{t('adminTools.mapDistanceUpdate.customersWithData')}</span>
            </div>
            <div className="mdu-stat">
              <span className="mdu-stat-value">{stats.lastSyncAt ? formatDate(stats.lastSyncAt) : t('adminTools.mapDistanceUpdate.never')}</span>
              <span className="mdu-stat-label">{t('adminTools.mapDistanceUpdate.lastSync')}</span>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mdu-error">
            <strong>{t('adminTools.mapDistanceUpdate.error')}</strong> {error}
          </div>
        )}

        {/* Sync Progress */}
        {isUpdateSyncRunning && syncStatus.job && (
          <div className="mdu-sync-progress">
            <div className="mdu-sync-progress-header">
              <span className="mdu-sync-progress-title">
                <MdRefresh className="mdu-spin" size={16} />
                {t('adminTools.mapDistanceUpdate.updating', { name: syncStatus.job.currentCustomerName || t('adminTools.mapDistanceUpdate.starting') })}
              </span>
              <span className="mdu-sync-progress-count">
                {syncStatus.job.processedCustomers} / {syncStatus.job.totalCustomers}
              </span>
            </div>
            <div className="mdu-progress-bar">
              <div
                className="mdu-progress-fill"
                style={{ width: `${getSyncProgress()}%` }}
              />
            </div>
            <div className="mdu-sync-stats">
              <span className="mdu-sync-stat success">
                {t('adminTools.mapDistanceUpdate.successful', { count: syncStatus.job.successfulCustomers })}
              </span>
              <span className="mdu-sync-stat failed">
                {t('adminTools.mapDistanceUpdate.failedCount', { count: syncStatus.job.failedCustomers })}
              </span>
              <span className="mdu-sync-stat records">
                {t('adminTools.mapDistanceUpdate.recordsUpdated', { count: syncStatus.job.recordsCreated })}
              </span>
            </div>
          </div>
        )}

        {/* Interrupted Sync - Show Resume Option */}
        {isUpdateSyncInterrupted && syncStatus.job && (
          <div className="mdu-sync-interrupted">
            <div className="mdu-sync-progress-header">
              <span className="mdu-sync-progress-title">
                <MdError size={16} color="#f59e0b" />
                {t('adminTools.mapDistanceUpdate.updateInterrupted', { name: syncStatus.job.currentCustomerName || t('adminTools.mapDistanceUpdate.unknown') })}
              </span>
              <span className="mdu-sync-progress-count">
                {syncStatus.job.processedCustomers} / {syncStatus.job.totalCustomers}
              </span>
            </div>
            <div className="mdu-progress-bar">
              <div
                className="mdu-progress-fill interrupted"
                style={{ width: `${getSyncProgress()}%` }}
              />
            </div>
            <div className="mdu-sync-stats">
              <span className="mdu-sync-stat success">
                {t('adminTools.mapDistanceUpdate.successful', { count: syncStatus.job.successfulCustomers })}
              </span>
              <span className="mdu-sync-stat failed">
                {t('adminTools.mapDistanceUpdate.failedCount', { count: syncStatus.job.failedCustomers })}
              </span>
              <span className="mdu-sync-stat records">
                {t('adminTools.mapDistanceUpdate.recordsUpdated', { count: syncStatus.job.recordsCreated })}
              </span>
            </div>
            <div className="mdu-sync-actions">
              <button className="mdu-resume-btn" onClick={() => handleResumeSync(syncStatus.job!._id)}>
                <MdPlayArrow size={16} />
                {t('adminTools.mapDistanceUpdate.resumeUpdateShort')}
              </button>
              <button className="mdu-reset-btn" onClick={handleResetStuckJob}>
                <MdCancel size={16} />
                {t('adminTools.mapDistanceUpdate.cancelAndReset')}
              </button>
            </div>
          </div>
        )}

        {/* Paused Sync - Show Resume Option */}
        {isUpdateSyncPaused && syncStatus.job && (
          <div className="mdu-sync-paused">
            <div className="mdu-sync-progress-header">
              <span className="mdu-sync-progress-title">
                <MdPause size={16} color="#6366f1" />
                {t('adminTools.mapDistanceUpdate.updatePaused', { name: syncStatus.job.currentCustomerName || t('adminTools.mapDistanceUpdate.unknown') })}
              </span>
              <span className="mdu-sync-progress-count">
                {syncStatus.job.processedCustomers} / {syncStatus.job.totalCustomers}
              </span>
            </div>
            <div className="mdu-progress-bar">
              <div
                className="mdu-progress-fill paused"
                style={{ width: `${getSyncProgress()}%` }}
              />
            </div>
            <div className="mdu-sync-stats">
              <span className="mdu-sync-stat success">
                {t('adminTools.mapDistanceUpdate.successful', { count: syncStatus.job.successfulCustomers })}
              </span>
              <span className="mdu-sync-stat failed">
                {t('adminTools.mapDistanceUpdate.failedCount', { count: syncStatus.job.failedCustomers })}
              </span>
              <span className="mdu-sync-stat records">
                {t('adminTools.mapDistanceUpdate.recordsUpdated', { count: syncStatus.job.recordsCreated })}
              </span>
            </div>
            <div className="mdu-sync-actions">
              <button className="mdu-resume-btn" onClick={() => handleResumeSync(syncStatus.job!._id)}>
                <MdPlayArrow size={16} />
                {t('adminTools.mapDistanceUpdate.resumeUpdateShort')}
              </button>
              <button className="mdu-reset-btn" onClick={handleResetStuckJob}>
                <MdCancel size={16} />
                {t('adminTools.mapDistanceUpdate.cancel')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* View Tabs */}
      <div className="mdu-view-tabs">
        <button
          className={`mdu-view-tab ${viewMode === 'records' ? 'active' : ''}`}
          onClick={() => setViewMode('records')}
        >
          <MdStorage size={16} />
          {t('adminTools.mapDistanceUpdate.storedRecords')}
        </button>
        <button
          className={`mdu-view-tab ${viewMode === 'history' ? 'active' : ''}`}
          onClick={() => { setViewMode('history'); loadSyncHistory(); }}
        >
          <MdHistory size={16} />
          {t('adminTools.mapDistanceUpdate.updateHistory')}
        </button>
      </div>

      {/* Stored Records View */}
      {viewMode === 'records' && (
        <div className="mdu-records-section">
          {/* Customer Filter */}
          {customersWithData.length > 0 && (
            <div className="mdu-filter-section">
              <div className="mdu-filter-label">
                <MdFilterList size={16} />
                {t('adminTools.mapDistanceUpdate.selectSourceCustomer')}
              </div>
              <div className="mdu-filter-dropdown" ref={filterDropdownRef}>
                <button
                  className="mdu-filter-trigger"
                  onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
                >
                  <span className="mdu-filter-value">
                    {getSelectedCustomerName()}
                  </span>
                  <MdExpandMore size={20} className={filterDropdownOpen ? 'mdu-rotate' : ''} />
                </button>

                {filterDropdownOpen && (
                  <div className="mdu-filter-menu">
                    <input
                      type="text"
                      className="mdu-filter-search"
                      placeholder={t('adminTools.mapDistanceUpdate.searchCustomersPlaceholder')}
                      value={filterSearch}
                      onChange={(e) => setFilterSearch(e.target.value)}
                      autoFocus
                    />
                    <div className="mdu-filter-options">
                      <div
                        className={`mdu-filter-option ${selectedCustomerId === null ? 'selected' : ''}`}
                        onClick={() => handleCustomerFilterSelect(null)}
                      >
                        <span className="mdu-option-name">{t('adminTools.mapDistanceUpdate.allCustomers')}</span>
                        <span className="mdu-option-details">{t('adminTools.mapDistanceUpdate.customersWithDataCount', { count: customersWithData.length })}</span>
                      </div>
                      {filteredCustomers.map(customer => (
                        <div
                          key={customer._id}
                          className={`mdu-filter-option ${selectedCustomerId === customer._id ? 'selected' : ''}`}
                          onClick={() => handleCustomerFilterSelect(customer._id)}
                        >
                          <span className="mdu-option-name">{customer.name}</span>
                          <span className="mdu-option-details">
                            {customer.city && <span>{customer.city}</span>}
                            {customer.company && <span>{customer.company}</span>}
                          </span>
                        </div>
                      ))}
                      {filteredCustomers.length === 0 && filterSearch && (
                        <div className="mdu-filter-empty">{t('adminTools.mapDistanceUpdate.noCustomersFound')}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              {selectedCustomerId && (
                <button
                  className="mdu-filter-clear"
                  onClick={() => handleCustomerFilterSelect(null)}
                  title={t('adminTools.mapDistanceUpdate.clearFilterTitle')}
                >
                  <MdClose size={16} />
                  {t('adminTools.mapDistanceUpdate.clear')}
                </button>
              )}
            </div>
          )}

          {storedRecords.length === 0 ? (
            <div className="mdu-empty">
              <div className="mdu-empty-icon">
                <MdStorage size={48} />
              </div>
              <h3>{selectedCustomerId ? t('adminTools.mapDistanceUpdate.noDistanceDataTitle') : t('adminTools.mapDistanceUpdate.noStoredRecordsTitle')}</h3>
              <p>
                {selectedCustomerId
                  ? t('adminTools.mapDistanceUpdate.noDistanceDataText', { name: getSelectedCustomerName() })
                  : t('adminTools.mapDistanceUpdate.noStoredRecordsText')
                }
              </p>
              {selectedCustomerId && (
                <button
                  className="mdu-filter-clear"
                  style={{ marginTop: '16px' }}
                  onClick={() => handleCustomerFilterSelect(null)}
                >
                  <MdClose size={16} />
                  {t('adminTools.mapDistanceUpdate.clearSelection')}
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="mdu-records-header">
                <span>
                  {selectedCustomerId
                    ? t('adminTools.mapDistanceUpdate.showingFiltered', { shown: storedRecords.length, total: totalRecords, name: getSelectedCustomerName() })
                    : t('adminTools.mapDistanceUpdate.showingAll', { shown: storedRecords.length, total: totalRecords })
                  }
                </span>
                {totalPages > 1 && (
                  <div className="mdu-pagination">
                    <button
                      onClick={() => loadStoredRecords(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      {t('adminTools.mapDistanceUpdate.previous')}
                    </button>
                    <span>{t('adminTools.mapDistanceUpdate.pageOf', { current: currentPage, total: totalPages })}</span>
                    <button
                      onClick={() => loadStoredRecords(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      {t('adminTools.mapDistanceUpdate.next')}
                    </button>
                  </div>
                )}
              </div>
              <div className="mdu-table-container">
                <table className="mdu-table">
                  <thead>
                    <tr>
                      <th><MdLocationOn size={14} /> {t('adminTools.mapDistanceUpdate.colDestinationCustomer')}</th>
                      <th><MdPerson size={14} /> {t('adminTools.mapDistanceUpdate.colAssignedTo')}</th>
                      <th>{t('adminTools.mapDistanceUpdate.colFrequency')}</th>
                      <th><MdCalendarToday size={14} /> {t('adminTools.mapDistanceUpdate.colDate')}</th>
                      <th>{t('adminTools.mapDistanceUpdate.colDay')}</th>
                      <th>{t('adminTools.mapDistanceUpdate.colStop')}</th>
                      <th><MdStraighten size={14} /> {t('adminTools.mapDistanceUpdate.colDistance')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {storedRecords.map((record) => (
                      <tr key={record._id}>
                        <td className="mdu-customer-cell">
                          <div className="mdu-customer-name">{record.destinationCustomerName || '-'}</div>
                        </td>
                        <td>{record.assignedTo || '-'}</td>
                        <td>{record.frequency || '-'}</td>
                        <td>{record.serviceDate ? new Date(record.serviceDate).toLocaleDateString() : '-'}</td>
                        <td>{record.dayOfWeek || '-'}</td>
                        <td>{record.stopNumber || '-'}</td>
                        <td className="mdu-distance">
                          {record.distanceMiles ? t('adminTools.mapDistanceUpdate.miles', { value: record.distanceMiles.toFixed(2) }) : record.distanceRaw || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Update History View */}
      {viewMode === 'history' && (
        <div className="mdu-history-section">
          {syncHistory.length === 0 ? (
            <div className="mdu-empty">
              <div className="mdu-empty-icon">
                <MdHistory size={48} />
              </div>
              <h3>{t('adminTools.mapDistanceUpdate.noUpdateHistoryTitle')}</h3>
              <p>{t('adminTools.mapDistanceUpdate.noUpdateHistoryText')}</p>
            </div>
          ) : (
            <div className="mdu-table-container">
              <table className="mdu-table">
                <thead>
                  <tr>
                    <th>{t('adminTools.mapDistanceUpdate.colType')}</th>
                    <th>{t('adminTools.mapDistanceUpdate.colStatus')}</th>
                    <th>{t('adminTools.mapDistanceUpdate.colStarted')}</th>
                    <th>{t('adminTools.mapDistanceUpdate.colCompleted')}</th>
                    <th>{t('adminTools.mapDistanceUpdate.colCustomers')}</th>
                    <th>{t('adminTools.mapDistanceUpdate.colRecords')}</th>
                    <th>{t('adminTools.mapDistanceUpdate.colErrors')}</th>
                    <th>{t('adminTools.mapDistanceUpdate.colAction')}</th>
                  </tr>
                </thead>
                <tbody>
                  {syncHistory.map((job) => (
                    <tr key={job._id}>
                      <td>
                        <span className={`mdu-job-type ${job.jobType}`}>
                          {getJobTypeLabel(job.jobType)}
                        </span>
                      </td>
                      <td>
                        <span className={`mdu-status-badge ${job.status}`}>
                          {getStatusIcon(job.status)}
                          <span style={{ marginLeft: 4 }}>{job.status}</span>
                        </span>
                      </td>
                      <td>{formatDate(job.startedAt)}</td>
                      <td>{formatDate(job.completedAt)}</td>
                      <td>{job.successfulCustomers}/{job.totalCustomers}</td>
                      <td>{job.recordsCreated}</td>
                      <td>{job.failedCustomers}</td>
                      <td>
                        {job.status === 'paused' && (
                          <button
                            className="mdu-resume-btn"
                            onClick={() => handleResumeSync(job._id)}
                            title={t('adminTools.mapDistanceUpdate.resumeSyncTitle')}
                            disabled={isJobRunning}
                          >
                            <MdPlayArrow size={16} />
                            {t('adminTools.mapDistanceUpdate.resume')}
                          </button>
                        )}
                        {job.status === 'running' && !syncStatus.isRunning && (
                          <button
                            className="mdu-resume-btn"
                            onClick={() => handleResumeSync(job._id)}
                            title={t('adminTools.mapDistanceUpdate.resumeInterruptedTitle')}
                          >
                            <MdPlayArrow size={16} />
                            {t('adminTools.mapDistanceUpdate.resume')}
                          </button>
                        )}
                        {job.status === 'running' && syncStatus.isRunning && (
                          <button
                            className="mdu-reset-btn"
                            onClick={handleResetStuckJob}
                            title={t('adminTools.mapDistanceUpdate.resetStuckTitle')}
                          >
                            <MdCancel size={16} />
                            {t('adminTools.mapDistanceUpdate.reset')}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MapDistanceUpdateTab;
