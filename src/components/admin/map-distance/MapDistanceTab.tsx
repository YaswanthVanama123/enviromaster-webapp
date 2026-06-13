

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { mapDistanceApi, RouteStarCustomerOption, MapDistanceResult, MapDistanceSyncJob, MapDistanceStats } from '../../../backendservice/api/mapDistanceApi';
import { MdSearch, MdDirectionsCar, MdLocationOn, MdStraighten, MdPerson, MdCalendarToday, MdSync, MdCancel, MdStorage, MdHistory, MdCheckCircle, MdError, MdSchedule, MdPlayArrow, MdPause } from 'react-icons/md';
import './MapDistanceTab.css';

type ViewMode = 'fetch' | 'stored' | 'history';

export const MapDistanceTab: React.FC = () => {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<ViewMode>('fetch');

  const [customers, setCustomers] = useState<RouteStarCustomerOption[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<RouteStarCustomerOption | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownSearch, setDropdownSearch] = useState('');
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [results, setResults] = useState<MapDistanceResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchedCustomer, setLastFetchedCustomer] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);

  const [syncStatus, setSyncStatus] = useState<{ isRunning: boolean; isInterrupted: boolean; isPaused: boolean; job: MapDistanceSyncJob | null }>({
    isRunning: false,
    isInterrupted: false,
    isPaused: false,
    job: null
  });
  const [stats, setStats] = useState<MapDistanceStats | null>(null);
  const [syncHistory, setSyncHistory] = useState<MapDistanceSyncJob[]>([]);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadCustomers();
    loadStats();
    checkSyncStatus();
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

      if (syncStatus.job?.jobType === 'single_fetch' && syncStatus.job?.status === 'completed') {
        if (syncStatus.job.fetchedData && syncStatus.job.fetchedData.length > 0) {
          setResults(syncStatus.job.fetchedData);
          setLastFetchedCustomer(syncStatus.job.currentCustomerName || 'Customer');
          setFetchedAt(syncStatus.job.completedAt || new Date().toISOString());
        }
      }
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [syncStatus.isRunning, syncStatus.job?.status]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadCustomers = async () => {
    setLoadingCustomers(true);
    const data = await mapDistanceApi.getCustomers();
    setCustomers(data);
    setLoadingCustomers(false);
  };

  const loadStats = async () => {
    const data = await mapDistanceApi.getStats();
    setStats(data);
  };

  const checkSyncStatus = async () => {
    const status = await mapDistanceApi.getSyncStatus();
    const wasRunning = syncStatus.isRunning;
    const isNowRunning = status.isRunning;

    setSyncStatus({
      isRunning: status.isRunning,
      isInterrupted: status.isInterrupted,
      isPaused: status.isPaused,
      job: status.job
    });

    if (wasRunning && !isNowRunning && status.job) {
      if (status.job.jobType === 'single_fetch' && status.job.status === 'completed') {
        if (status.job.fetchedData && status.job.fetchedData.length > 0) {
          setResults(status.job.fetchedData);
          setLastFetchedCustomer(status.job.currentCustomerName || 'Customer');
          setFetchedAt(status.job.completedAt || new Date().toISOString());
        } else {
          setResults([]);
          setLastFetchedCustomer(status.job.currentCustomerName || 'Customer');
        }
      }
      loadStats();
    }
  };

  const loadSyncHistory = async () => {
    const history = await mapDistanceApi.getSyncHistory();
    setSyncHistory(history);
  };

  const handleSelectCustomer = (customer: RouteStarCustomerOption) => {
    setSelectedCustomer(customer);
    setDropdownOpen(false);
    setDropdownSearch('');
  };

  const handleFetchDistance = async () => {
    if (!selectedCustomer) return;

    setError(null);
    setResults([]);
    setLastFetchedCustomer(null);

    const response = await mapDistanceApi.fetchDistance(selectedCustomer.name);

    if (response.success) {
      
      checkSyncStatus();
    } else {
      setError(response.error || t('adminTools.mapDistance.failedToStartFetch'));
    }
  };

  const handleStartSync = async () => {
    setError(null);
    const result = await mapDistanceApi.startSync();
    if (result.success) {
      checkSyncStatus();
    } else {
      setError(result.error || t('adminTools.mapDistance.failedToStartSync'));
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
      setError(result.error || t('adminTools.mapDistance.failedToPauseSync'));
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
      setError(result.error || t('adminTools.mapDistance.failedToResumeSync'));
    }
  };

  const isJobResumable = (job: MapDistanceSyncJob) => {
    if (job.status === 'paused') return true;
    
    if (job.status === 'running' && job.customerIds && job.processedCustomerIds) {
      return job.processedCustomerIds.length < job.customerIds.length;
    }
    return false;
  };

  const filteredCustomers = customers.filter(customer => {
    if (!dropdownSearch) return true;
    const search = dropdownSearch.toLowerCase();
    return (
      customer.name.toLowerCase().includes(search) ||
      (customer.company && customer.company.toLowerCase().includes(search)) ||
      (customer.city && customer.city.toLowerCase().includes(search))
    );
  });

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
      case 'single_fetch': return t('adminTools.mapDistance.jobTypeSingleFetch');
      case 'full_sync': return t('adminTools.mapDistance.jobTypeFullSync');
      case 'update_sync': return t('adminTools.mapDistance.jobTypeUpdateSync');
      default: return jobType;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <MdCheckCircle size={16} color="#059669" />;
      case 'failed': return <MdError size={16} color="#dc2626" />;
      case 'running': return <MdSync size={16} color="#2563eb" className="md-spin" />;
      case 'cancelled': return <MdCancel size={16} color="#f59e0b" />;
      default: return <MdSchedule size={16} color="#64748b" />;
    }
  };

  const isJobRunning = syncStatus.isRunning;
  const isJobInterrupted = syncStatus.isInterrupted;
  const isJobPaused = syncStatus.isPaused;
  const isSingleFetchRunning = isJobRunning && syncStatus.job?.jobType === 'single_fetch';
  const isBulkSyncRunning = isJobRunning && (syncStatus.job?.jobType === 'full_sync' || syncStatus.job?.jobType === 'update_sync');
  const isBulkSyncInterrupted = isJobInterrupted && (syncStatus.job?.jobType === 'full_sync' || syncStatus.job?.jobType === 'update_sync');
  const isBulkSyncPaused = isJobPaused && (syncStatus.job?.jobType === 'full_sync' || syncStatus.job?.jobType === 'update_sync');

  return (
    <div className="map-distance-tab">
      {}
      <div className="md-header">
        <div className="md-header-top">
          <div>
            <h2>{t('adminTools.mapDistance.title')}</h2>
            <p className="md-subtitle">
              {t('adminTools.mapDistance.subtitle')}
            </p>
          </div>
          <div className="md-header-actions">
            {isBulkSyncRunning ? (
              <>
                <button className="md-pause-btn" onClick={handlePauseSync}>
                  <MdPause size={18} />
                  {t('adminTools.mapDistance.pause')}
                </button>
                <button className="md-cancel-sync-btn" onClick={handleCancelSync}>
                  <MdCancel size={18} />
                  {t('adminTools.mapDistance.cancel')}
                </button>
              </>
            ) : (isBulkSyncInterrupted || isBulkSyncPaused) ? (
              <button className="md-resume-btn" onClick={() => syncStatus.job && handleResumeSync(syncStatus.job._id)}>
                <MdPlayArrow size={18} />
                {t('adminTools.mapDistance.resumeSync', { processed: syncStatus.job?.processedCustomers, total: syncStatus.job?.totalCustomers })}
              </button>
            ) : (
              <button className="md-sync-btn" onClick={handleStartSync} disabled={isJobRunning || isJobInterrupted || isJobPaused}>
                <MdSync size={18} />
                {t('adminTools.mapDistance.syncAllCustomers')}
              </button>
            )}
          </div>
        </div>

        {}
        {stats && (
          <div className="md-stats-bar">
            <div className="md-stat">
              <span className="md-stat-value">{stats.totalRecords.toLocaleString()}</span>
              <span className="md-stat-label">{t('adminTools.mapDistance.totalRecords')}</span>
            </div>
            <div className="md-stat">
              <span className="md-stat-value">{stats.customersWithData.toLocaleString()}</span>
              <span className="md-stat-label">{t('adminTools.mapDistance.customersWithData')}</span>
            </div>
            <div className="md-stat">
              <span className="md-stat-value">{stats.storageSizeFormatted || 'N/A'}</span>
              <span className="md-stat-label">{t('adminTools.mapDistance.storageSize')}</span>
            </div>
            <div className="md-stat">
              <span className="md-stat-value">{stats.avgBytesPerRecord || 0} B</span>
              <span className="md-stat-label">{t('adminTools.mapDistance.avgPerRecord')}</span>
            </div>
            <div className="md-stat">
              <span className="md-stat-value">{stats.lastSyncAt ? formatDate(stats.lastSyncAt) : t('adminTools.mapDistance.never')}</span>
              <span className="md-stat-label">{t('adminTools.mapDistance.lastSync')}</span>
            </div>
          </div>
        )}

        {}
        {isBulkSyncRunning && syncStatus.job && (
          <div className="md-sync-progress">
            <div className="md-sync-progress-header">
              <span className="md-sync-progress-title">
                <MdSync className="md-spin" size={16} />
                {syncStatus.job.jobType === 'full_sync' ? t('adminTools.mapDistance.syncing') : t('adminTools.mapDistance.updating')}: {syncStatus.job.currentCustomerName || t('adminTools.mapDistance.starting')}
              </span>
              <span className="md-sync-progress-count">
                {syncStatus.job.processedCustomers} / {syncStatus.job.totalCustomers}
              </span>
            </div>
            <div className="md-progress-bar">
              <div
                className="md-progress-fill"
                style={{ width: `${getSyncProgress()}%` }}
              />
            </div>
            <div className="md-sync-stats">
              <span className="md-sync-stat success">
                {t('adminTools.mapDistance.successful', { count: syncStatus.job.successfulCustomers })}
              </span>
              <span className="md-sync-stat failed">
                {t('adminTools.mapDistance.failedCount', { count: syncStatus.job.failedCustomers })}
              </span>
              <span className="md-sync-stat records">
                {t('adminTools.mapDistance.recordsCreated', { count: syncStatus.job.recordsCreated })}
              </span>
            </div>
          </div>
        )}

        {}
        {isBulkSyncInterrupted && syncStatus.job && (
          <div className="md-sync-interrupted">
            <div className="md-sync-progress-header">
              <span className="md-sync-progress-title">
                <MdError size={16} color="#f59e0b" />
                {t('adminTools.mapDistance.syncInterrupted', { name: syncStatus.job.currentCustomerName || t('adminTools.mapDistance.unknown') })}
              </span>
              <span className="md-sync-progress-count">
                {syncStatus.job.processedCustomers} / {syncStatus.job.totalCustomers}
              </span>
            </div>
            <div className="md-progress-bar">
              <div
                className="md-progress-fill interrupted"
                style={{ width: `${getSyncProgress()}%` }}
              />
            </div>
            <div className="md-sync-stats">
              <span className="md-sync-stat success">
                {t('adminTools.mapDistance.successful', { count: syncStatus.job.successfulCustomers })}
              </span>
              <span className="md-sync-stat failed">
                {t('adminTools.mapDistance.failedCount', { count: syncStatus.job.failedCustomers })}
              </span>
              <span className="md-sync-stat records">
                {t('adminTools.mapDistance.recordsCreated', { count: syncStatus.job.recordsCreated })}
              </span>
            </div>
            <div className="md-sync-actions">
              <button className="md-resume-btn" onClick={() => handleResumeSync(syncStatus.job!._id)}>
                <MdPlayArrow size={16} />
                {t('adminTools.mapDistance.resumeSyncShort')}
              </button>
              <button className="md-reset-btn" onClick={handleResetStuckJob}>
                <MdCancel size={16} />
                {t('adminTools.mapDistance.cancelAndReset')}
              </button>
            </div>
          </div>
        )}

        {}
        {isBulkSyncPaused && syncStatus.job && (
          <div className="md-sync-paused">
            <div className="md-sync-progress-header">
              <span className="md-sync-progress-title">
                <MdPause size={16} color="#6366f1" />
                {t('adminTools.mapDistance.syncPaused', { name: syncStatus.job.currentCustomerName || t('adminTools.mapDistance.unknown') })}
              </span>
              <span className="md-sync-progress-count">
                {syncStatus.job.processedCustomers} / {syncStatus.job.totalCustomers}
              </span>
            </div>
            <div className="md-progress-bar">
              <div
                className="md-progress-fill paused"
                style={{ width: `${getSyncProgress()}%` }}
              />
            </div>
            <div className="md-sync-stats">
              <span className="md-sync-stat success">
                {t('adminTools.mapDistance.successful', { count: syncStatus.job.successfulCustomers })}
              </span>
              <span className="md-sync-stat failed">
                {t('adminTools.mapDistance.failedCount', { count: syncStatus.job.failedCustomers })}
              </span>
              <span className="md-sync-stat records">
                {t('adminTools.mapDistance.recordsCreated', { count: syncStatus.job.recordsCreated })}
              </span>
            </div>
            <div className="md-sync-actions">
              <button className="md-resume-btn" onClick={() => handleResumeSync(syncStatus.job!._id)}>
                <MdPlayArrow size={16} />
                {t('adminTools.mapDistance.resumeSyncShort')}
              </button>
              <button className="md-reset-btn" onClick={handleResetStuckJob}>
                <MdCancel size={16} />
                {t('adminTools.mapDistance.cancel')}
              </button>
            </div>
          </div>
        )}
      </div>

      {}
      <div className="md-view-tabs">
        <button
          className={`md-view-tab ${viewMode === 'fetch' ? 'active' : ''}`}
          onClick={() => setViewMode('fetch')}
        >
          <MdDirectionsCar size={16} />
          {t('adminTools.mapDistance.liveFetch')}
        </button>
        <button
          className={`md-view-tab ${viewMode === 'stored' ? 'active' : ''}`}
          onClick={() => setViewMode('stored')}
        >
          <MdStorage size={16} />
          {t('adminTools.mapDistance.storedData')}
        </button>
        <button
          className={`md-view-tab ${viewMode === 'history' ? 'active' : ''}`}
          onClick={() => { setViewMode('history'); loadSyncHistory(); }}
        >
          <MdHistory size={16} />
          {t('adminTools.mapDistance.fetchHistory')}
        </button>
      </div>

      {}
      {viewMode === 'fetch' && (
        <>
          {}
          <div className="md-search-section">
            <div className="md-search-group">
              <label className="md-search-label">{t('adminTools.mapDistance.selectCustomer')}</label>
              <div className="md-dropdown" ref={dropdownRef}>
                <button
                  className="md-dropdown-trigger"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  disabled={loadingCustomers || isJobRunning}
                >
                  <span className={selectedCustomer ? 'md-dropdown-value' : 'md-dropdown-placeholder'}>
                    {selectedCustomer ? (
                      <>
                        {selectedCustomer.name}
                        {selectedCustomer.city && ` - ${selectedCustomer.city}`}
                      </>
                    ) : (
                      t('adminTools.mapDistance.selectACustomer')
                    )}
                  </span>
                  <MdSearch size={18} />
                </button>

                {dropdownOpen && (
                  <div className="md-dropdown-menu">
                    <input
                      type="text"
                      className="md-dropdown-search"
                      placeholder={t('adminTools.mapDistance.searchCustomersPlaceholder')}
                      value={dropdownSearch}
                      onChange={(e) => setDropdownSearch(e.target.value)}
                      autoFocus
                    />
                    <div className="md-dropdown-options">
                      {loadingCustomers ? (
                        <div className="md-dropdown-loading">{t('adminTools.mapDistance.loadingCustomers')}</div>
                      ) : filteredCustomers.length === 0 ? (
                        <div className="md-dropdown-empty">{t('adminTools.mapDistance.noCustomersFound')}</div>
                      ) : (
                        filteredCustomers.slice(0, 100).map((customer) => (
                          <div
                            key={customer._id}
                            className={`md-dropdown-option ${selectedCustomer?._id === customer._id ? 'selected' : ''}`}
                            onClick={() => handleSelectCustomer(customer)}
                          >
                            <div className="md-option-name">{customer.name}</div>
                            <div className="md-option-details">
                              {customer.company && <span>{customer.company}</span>}
                              {customer.city && <span>{customer.city}</span>}
                              {customer.state && <span>{customer.state}</span>}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <button
              className="md-fetch-btn"
              onClick={handleFetchDistance}
              disabled={!selectedCustomer || isJobRunning}
            >
              <MdDirectionsCar size={18} />
              {isSingleFetchRunning ? t('adminTools.mapDistance.fetching') : t('adminTools.mapDistance.getDistance')}
            </button>
          </div>

          {}
          {error && (
            <div className="md-error">
              <strong>{t('adminTools.mapDistance.error')}</strong> {error}
            </div>
          )}

          {}
          {isSingleFetchRunning && (
            <div className="md-loading">
              <div className="md-loading-spinner" />
              <div className="md-loading-text">{t('adminTools.mapDistance.fetchingDistanceData')}</div>
              <div className="md-loading-subtext">
                {t('adminTools.mapDistance.automatingRouteStar', { name: syncStatus.job?.currentCustomerName || selectedCustomer?.name })}
              </div>
            </div>
          )}

          {}
          {!isSingleFetchRunning && results.length > 0 && (
            <div className="md-results">
              <div className="md-results-header">
                <h3>{t('adminTools.mapDistance.distanceResultsFor', { name: lastFetchedCustomer })}</h3>
                {fetchedAt && (
                  <span className="md-results-meta">
                    {t('adminTools.mapDistance.fetchedAt', { time: new Date(fetchedAt).toLocaleTimeString() })}
                  </span>
                )}
              </div>

              <div className="md-table-container">
                <table className="md-table">
                  <thead>
                    <tr>
                      <th><MdPerson size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} /> {t('adminTools.mapDistance.colAssignedTo')}</th>
                      <th>{t('adminTools.mapDistance.colFrequency')}</th>
                      <th><MdCalendarToday size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} /> {t('adminTools.mapDistance.colDate')}</th>
                      <th><MdLocationOn size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} /> {t('adminTools.mapDistance.colCustomer')}</th>
                      <th>{t('adminTools.mapDistance.colDay')}</th>
                      <th>{t('adminTools.mapDistance.colStop')}</th>
                      <th><MdStraighten size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} /> {t('adminTools.mapDistance.colDistance')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((result, index) => (
                      <tr key={index}>
                        <td>{result.assignedTo || '-'}</td>
                        <td>{result.frequency || '-'}</td>
                        <td>{result.date || '-'}</td>
                        <td className="md-location-name">{result.customer || '-'}</td>
                        <td>{result.day || '-'}</td>
                        <td>{result.stop || '-'}</td>
                        <td className="md-distance">{result.distance || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {}
          {!isSingleFetchRunning && lastFetchedCustomer && results.length === 0 && !error && (
            <div className="md-empty">
              <div className="md-empty-icon">
                <MdLocationOn size={48} />
              </div>
              <h3>{t('adminTools.mapDistance.noDistanceDataTitle')}</h3>
              <p>{t('adminTools.mapDistance.noDistanceDataText', { name: lastFetchedCustomer })}</p>
            </div>
          )}

          {}
          {!isSingleFetchRunning && !lastFetchedCustomer && results.length === 0 && !error && (
            <div className="md-empty">
              <div className="md-empty-icon">
                <MdDirectionsCar size={48} />
              </div>
              <h3>{t('adminTools.mapDistance.selectACustomerTitle')}</h3>
              <p>{t('adminTools.mapDistance.selectACustomerText')}</p>
            </div>
          )}
        </>
      )}

      {}
      {viewMode === 'stored' && (
        <div className="md-stored-section">
          <div className="md-empty">
            <div className="md-empty-icon">
              <MdStorage size={48} />
            </div>
            <h3>{t('adminTools.mapDistance.storedRecordsTitle')}</h3>
            <p>
              {stats ? (
                <>
                  {stats.totalRecords > 0 ? (
                    t('adminTools.mapDistance.recordsStored', { records: stats.totalRecords.toLocaleString(), customers: stats.customersWithData })
                  ) : (
                    t('adminTools.mapDistance.noRecordsStored')
                  )}
                </>
              ) : (
                t('adminTools.mapDistance.loading')
              )}
            </p>
          </div>
        </div>
      )}

      {}
      {viewMode === 'history' && (
        <div className="md-history-section">
          {syncHistory.length === 0 ? (
            <div className="md-empty">
              <div className="md-empty-icon">
                <MdHistory size={48} />
              </div>
              <h3>{t('adminTools.mapDistance.noFetchHistoryTitle')}</h3>
              <p>{t('adminTools.mapDistance.noFetchHistoryText')}</p>
            </div>
          ) : (
            <div className="md-table-container">
              <table className="md-table">
                <thead>
                  <tr>
                    <th>{t('adminTools.mapDistance.colType')}</th>
                    <th>{t('adminTools.mapDistance.colStatus')}</th>
                    <th>{t('adminTools.mapDistance.colCustomer')}</th>
                    <th>{t('adminTools.mapDistance.colStarted')}</th>
                    <th>{t('adminTools.mapDistance.colCompleted')}</th>
                    <th>{t('adminTools.mapDistance.colRecords')}</th>
                    <th>{t('adminTools.mapDistance.colErrors')}</th>
                    <th>{t('adminTools.mapDistance.colAction')}</th>
                  </tr>
                </thead>
                <tbody>
                  {syncHistory.map((job) => (
                    <tr key={job._id}>
                      <td>
                        <span className={`md-job-type ${job.jobType}`}>
                          {getJobTypeLabel(job.jobType)}
                        </span>
                      </td>
                      <td>
                        <span className={`md-status-badge ${job.status}`}>
                          {getStatusIcon(job.status)}
                          <span style={{ marginLeft: 4 }}>{job.status}</span>
                        </span>
                      </td>
                      <td>
                        {job.jobType === 'single_fetch'
                          ? job.currentCustomerName || '-'
                          : t('adminTools.mapDistance.customersCount', { successful: job.successfulCustomers, total: job.totalCustomers })
                        }
                      </td>
                      <td>{formatDate(job.startedAt)}</td>
                      <td>{formatDate(job.completedAt)}</td>
                      <td>{job.recordsCreated}</td>
                      <td>{job.failedCustomers}</td>
                      <td>
                        {job.status === 'paused' && (
                          <button
                            className="md-resume-btn"
                            onClick={() => handleResumeSync(job._id)}
                            title={t('adminTools.mapDistance.resumeSyncTitle')}
                            disabled={isJobRunning}
                          >
                            <MdPlayArrow size={16} />
                            {t('adminTools.mapDistance.resume')}
                          </button>
                        )}
                        {job.status === 'running' && !syncStatus.isRunning && (
                          <button
                            className="md-resume-btn"
                            onClick={() => handleResumeSync(job._id)}
                            title={t('adminTools.mapDistance.resumeInterruptedTitle')}
                          >
                            <MdPlayArrow size={16} />
                            {t('adminTools.mapDistance.resume')}
                          </button>
                        )}
                        {job.status === 'running' && syncStatus.isRunning && (
                          <button
                            className="md-reset-btn"
                            onClick={handleResetStuckJob}
                            title={t('adminTools.mapDistance.resetStuckTitle')}
                          >
                            <MdCancel size={16} />
                            {t('adminTools.mapDistance.reset')}
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

export default MapDistanceTab;
