

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import { biginAuditApi, type BiginAuditLog, type ScrapeStatus, type AuditStats } from '../../../backendservice/api/biginAuditApi';
import './BiginAuditTab.css';

export const BiginAuditTab: React.FC = () => {
  const { t } = useTranslation();
  const [auditLogs, setAuditLogs] = useState<BiginAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [scrapeStatus, setScrapeStatus] = useState<ScrapeStatus | null>(null);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [pipelineFilter, setPipelineFilter] = useState('');
  const [pagination, setPagination] = useState({ total: 0, skip: 0, limit: 50 });
  const [selectedLog, setSelectedLog] = useState<BiginAuditLog | null>(null);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    message: string;
    saved?: number;
    skipped?: number;
    errors?: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [showDeleteUnnecessaryModal, setShowDeleteUnnecessaryModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteResult, setDeleteResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const loadAuditLogs = useCallback(async () => {
    setLoading(true);
    const result = await biginAuditApi.getAll({
      search: searchTerm || undefined,
      user: userFilter || undefined,
      action: actionFilter || undefined,
      module: moduleFilter || undefined,
      pipeline: pipelineFilter || undefined,
      limit: pagination.limit,
      skip: pagination.skip,
    });

    if (result) {
      setAuditLogs(result.data);
      setPagination(prev => ({ ...prev, total: result.pagination.total }));
    }
    setLoading(false);
  }, [searchTerm, userFilter, actionFilter, moduleFilter, pipelineFilter, pagination.limit, pagination.skip]);

  const loadStats = useCallback(async () => {
    const result = await biginAuditApi.getStats();
    if (result) {
      setStats(result);
    }
  }, []);

  const loadScrapeStatus = useCallback(async () => {
    const result = await biginAuditApi.getScrapeStatus();
    if (result) {
      setScrapeStatus(result);
    }
  }, []);

  useEffect(() => {
    loadAuditLogs();
    loadStats();
    loadScrapeStatus();
  }, []);

  useEffect(() => {
    loadAuditLogs();
  }, [loadAuditLogs]);

  useEffect(() => {
    if (scrapeStatus?.isRunning) {
      const interval = setInterval(() => {
        loadScrapeStatus();
      }, 2000);
      return () => clearInterval(interval);
    } else if (scrapeStatus?.lastScrapeResult === 'success') {
      
      loadAuditLogs();
      loadStats();
    }
  }, [scrapeStatus?.isRunning, scrapeStatus?.lastScrapeResult, loadScrapeStatus, loadAuditLogs, loadStats]);

  const handleScrape = async () => {
    const result = await biginAuditApi.startScrape();
    if (result) {
      loadScrapeStatus();
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, skip: 0 }));
    loadAuditLogs();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadResult(null);

    try {
      const result = await biginAuditApi.uploadCsv(file);
      if (result) {
        setUploadResult({
          success: true,
          message: result.message,
          saved: result.data?.saved,
          skipped: result.data?.skipped,
          errors: result.data?.errors,
        });
        
        loadAuditLogs();
        loadStats();
      } else {
        setUploadResult({
          success: false,
          message: t('adminTools.bigin.audit.uploadFailedMessage'),
        });
      }
    } catch (error) {
      setUploadResult({
        success: false,
        message: t('adminTools.bigin.audit.uploadErrorMessage', { message: (error as Error).message }),
      });
    } finally {
      setUploading(false);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const closeUploadModal = () => {
    setShowUploadModal(false);
    setUploadResult(null);
  };

  const handleDeleteAll = async () => {
    setDeleting(true);
    setDeleteResult(null);
    try {
      const result = await biginAuditApi.deleteAll();
      if (result) {
        setDeleteResult({ success: true, message: result.message });
        loadAuditLogs();
        loadStats();
      } else {
        setDeleteResult({ success: false, message: t('adminTools.bigin.audit.deleteAllFailed') });
      }
    } catch (error) {
      setDeleteResult({ success: false, message: t('adminTools.bigin.audit.deleteAllError') });
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteUnnecessary = async () => {
    setDeleting(true);
    setDeleteResult(null);
    try {
      const result = await biginAuditApi.deleteUnnecessary();
      if (result) {
        setDeleteResult({ success: true, message: result.message });
        loadAuditLogs();
        loadStats();
      } else {
        setDeleteResult({ success: false, message: t('adminTools.bigin.audit.deleteUnnecessaryFailed') });
      }
    } catch (error) {
      setDeleteResult({ success: false, message: t('adminTools.bigin.audit.deleteUnnecessaryError') });
    } finally {
      setDeleting(false);
    }
  };

  const closeDeleteModal = () => {
    setShowDeleteAllModal(false);
    setShowDeleteUnnecessaryModal(false);
    setDeleteResult(null);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getActionColor = (action: string) => {
    const lowerAction = action.toLowerCase();
    if (lowerAction.includes('create') || lowerAction.includes('add')) return 'action-create';
    if (lowerAction.includes('delete') || lowerAction.includes('remove')) return 'action-delete';
    if (lowerAction.includes('update') || lowerAction.includes('edit') || lowerAction.includes('modify')) return 'action-update';
    if (lowerAction.includes('login') || lowerAction.includes('logout')) return 'action-auth';
    return 'action-other';
  };

  return (
    <div className="bigin-audit-tab">
      {}
      <div className="ba-header">
        <div className="ba-header-content">
          <h2>{t('adminTools.bigin.audit.title')}</h2>
          <p className="ba-subtitle">{t('adminTools.bigin.audit.subtitle')}</p>
        </div>
        <div className="ba-header-actions">
          <button
            className="ba-upload-btn"
            onClick={() => setShowUploadModal(true)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            {t('adminTools.bigin.audit.uploadCsv')}
          </button>
          <button
            className={`ba-scrape-btn ${scrapeStatus?.isRunning ? 'scraping' : ''}`}
            onClick={handleScrape}
            disabled={scrapeStatus?.isRunning}
          >
            {scrapeStatus?.isRunning ? (
              <>
                <span className="scrape-spinner"></span>
                {t('adminTools.bigin.audit.scraping', { progress: scrapeStatus.progress })}
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" />
                </svg>
                {t('adminTools.bigin.audit.fetchAuditLogs')}
              </>
            )}
          </button>
          <button
            className="ba-delete-unnecessary-btn"
            onClick={() => setShowDeleteUnnecessaryModal(true)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            {t('adminTools.bigin.audit.deleteUnnecessary')}
          </button>
          <button
            className="ba-delete-all-btn"
            onClick={() => setShowDeleteAllModal(true)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" />
            </svg>
            {t('adminTools.bigin.audit.deleteAll')}
          </button>
        </div>
      </div>

      {}
      <div className="ba-stats-grid">
        <div className="ba-stat-card">
          <div className="ba-stat-value">{stats?.total || 0}</div>
          <div className="ba-stat-label">{t('adminTools.bigin.audit.totalLogs')}</div>
        </div>
        <div className="ba-stat-card">
          <div className="ba-stat-value ba-stat-storage">{formatBytes(stats?.storageSize || 0)}</div>
          <div className="ba-stat-label">{t('adminTools.bigin.audit.storageSize')}</div>
        </div>
        <div className="ba-stat-card">
          <div className="ba-stat-value ba-stat-24h">{stats?.last24Hours || 0}</div>
          <div className="ba-stat-label">{t('adminTools.bigin.audit.last24Hours')}</div>
        </div>
        <div className="ba-stat-card">
          <div className="ba-stat-value ba-stat-7d">{stats?.last7Days || 0}</div>
          <div className="ba-stat-label">{t('adminTools.bigin.audit.last7Days')}</div>
        </div>
        <div className="ba-stat-card">
          <div className="ba-stat-value">{stats?.uniqueUsers || 0}</div>
          <div className="ba-stat-label">{t('adminTools.bigin.audit.uniqueUsers')}</div>
        </div>
      </div>

      {}
      {scrapeStatus && (
        <div className={`ba-scrape-status ${scrapeStatus.lastScrapeResult || ''}`}>
          <div className="ba-scrape-info">
            <span className="ba-scrape-label">{t('adminTools.bigin.audit.lastScrape')}</span>
            <span className="ba-scrape-time">{formatDate(scrapeStatus.lastScrapeAt)}</span>
            {scrapeStatus.lastScrapeResult && (
              <span className={`ba-scrape-result ${scrapeStatus.lastScrapeResult}`}>
                {scrapeStatus.lastScrapeResult === 'success' ? <><FaCheckCircle /> {t('adminTools.bigin.audit.success')}</> : <><FaTimesCircle /> {t('adminTools.bigin.audit.failed')}</>}
              </span>
            )}
            {scrapeStatus.totalLogs > 0 && (
              <span className="ba-total-logs">{t('adminTools.bigin.audit.logsStored', { count: scrapeStatus.totalLogs })}</span>
            )}
          </div>
          {scrapeStatus.isRunning && (
            <div className="ba-scrape-progress">
              <div className="ba-progress-bar">
                <div className="ba-progress-fill" style={{ width: `${scrapeStatus.progress}%` }}></div>
              </div>
              <span className="ba-progress-text">{scrapeStatus.message}</span>
            </div>
          )}
        </div>
      )}

      {}
      <div className="ba-filters">
        <form onSubmit={handleSearch} className="ba-search-form">
          <input
            type="text"
            placeholder={t('adminTools.bigin.audit.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="ba-search-input"
          />
          <button type="submit" className="ba-search-btn">{t('adminTools.bigin.audit.search')}</button>
        </form>

        <select
          value={userFilter}
          onChange={(e) => {
            setUserFilter(e.target.value);
            setPagination(prev => ({ ...prev, skip: 0 }));
          }}
          className="ba-filter-select"
        >
          <option value="">{t('adminTools.bigin.audit.allUsers')}</option>
          {stats?.users.map(user => (
            <option key={user} value={user}>{user}</option>
          ))}
        </select>

        <select
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPagination(prev => ({ ...prev, skip: 0 }));
          }}
          className="ba-filter-select"
        >
          <option value="">{t('adminTools.bigin.audit.allActions')}</option>
          {stats?.actions.map(action => (
            <option key={action} value={action}>{action}</option>
          ))}
        </select>

        <select
          value={moduleFilter}
          onChange={(e) => {
            setModuleFilter(e.target.value);
            setPagination(prev => ({ ...prev, skip: 0 }));
          }}
          className="ba-filter-select"
        >
          <option value="">{t('adminTools.bigin.audit.allModules')}</option>
          {stats?.modules.map(module => (
            <option key={module} value={module}>{module}</option>
          ))}
        </select>

        <select
          value={pipelineFilter}
          onChange={(e) => {
            setPipelineFilter(e.target.value);
            setPagination(prev => ({ ...prev, skip: 0 }));
          }}
          className="ba-filter-select"
        >
          <option value="">{t('adminTools.bigin.audit.allPipelines')}</option>
          {stats?.pipelines?.map(pipeline => (
            <option key={pipeline} value={pipeline}>{pipeline}</option>
          ))}
        </select>

        <span className="ba-results-count">
          {t('adminTools.bigin.audit.logsFound', { count: pagination.total })}
        </span>
      </div>

      {}
      {loading ? (
        <div className="ba-loading">
          <div className="ba-loading-spinner"></div>
          <p>{t('adminTools.bigin.audit.loadingLogs')}</p>
        </div>
      ) : auditLogs.length === 0 ? (
        <div className="ba-empty">
          <div className="ba-empty-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <h3>{t('adminTools.bigin.audit.noLogsTitle')}</h3>
          <p>{t('adminTools.bigin.audit.noLogsText')}</p>
        </div>
      ) : (
        <div className="ba-table-container">
          <table className="ba-table">
            <thead>
              <tr>
                <th>{t('adminTools.bigin.audit.colTimestamp')}</th>
                <th>{t('adminTools.bigin.audit.colUser')}</th>
                <th>{t('adminTools.bigin.audit.colAction')}</th>
                <th>{t('adminTools.bigin.audit.colModule')}</th>
                <th>{t('adminTools.bigin.audit.colRecord')}</th>
                <th>{t('adminTools.bigin.audit.colDetails')}</th>
                <th>{t('adminTools.bigin.audit.colIpAddress')}</th>
                <th>{t('adminTools.bigin.audit.colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log) => (
                <tr key={log._id}>
                  <td className="ba-timestamp">{formatDate(log.timestamp)}</td>
                  <td className="ba-user">
                    <strong>{log.user}</strong>
                    {log.userEmail && <span className="ba-email">{log.userEmail}</span>}
                  </td>
                  <td>
                    <span className={`ba-action-badge ${getActionColor(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td>{log.module || '-'}</td>
                  <td className="ba-record">{log.recordName || '-'}</td>
                  <td className="ba-details">{log.details || '-'}</td>
                  <td className="ba-ip">{log.ipAddress || '-'}</td>
                  <td className="ba-actions">
                    <button
                      className="ba-view-btn"
                      onClick={() => setSelectedLog(log)}
                    >
                      {t('adminTools.bigin.audit.view')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {}
      {pagination.total > pagination.limit && (
        <div className="ba-pagination">
          <button
            onClick={() => setPagination(prev => ({ ...prev, skip: Math.max(0, prev.skip - prev.limit) }))}
            disabled={pagination.skip === 0}
            className="ba-page-btn"
          >
            {t('adminTools.bigin.audit.previous')}
          </button>
          <span className="ba-page-info">
            {t('adminTools.bigin.audit.pageInfo', { from: pagination.skip + 1, to: Math.min(pagination.skip + pagination.limit, pagination.total), total: pagination.total })}
          </span>
          <button
            onClick={() => setPagination(prev => ({ ...prev, skip: prev.skip + prev.limit }))}
            disabled={pagination.skip + pagination.limit >= pagination.total}
            className="ba-page-btn"
          >
            {t('adminTools.bigin.audit.next')}
          </button>
        </div>
      )}

      {}
      {selectedLog && (
        <div className="ba-modal-overlay" onClick={() => setSelectedLog(null)}>
          <div className="ba-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ba-modal-header">
              <h3>{t('adminTools.bigin.audit.logDetailsTitle')}</h3>
              <button className="ba-close-btn" onClick={() => setSelectedLog(null)}>x</button>
            </div>
            <div className="ba-modal-body">
              <div className="ba-detail-grid">
                <div className="ba-detail-item">
                  <label>{t('adminTools.bigin.audit.timestamp')}</label>
                  <span>{formatDate(selectedLog.timestamp)}</span>
                </div>
                <div className="ba-detail-item">
                  <label>{t('adminTools.bigin.audit.user')}</label>
                  <span>{selectedLog.user}</span>
                </div>
                {selectedLog.userEmail && (
                  <div className="ba-detail-item">
                    <label>{t('adminTools.bigin.audit.userEmail')}</label>
                    <span>{selectedLog.userEmail}</span>
                  </div>
                )}
                <div className="ba-detail-item">
                  <label>{t('adminTools.bigin.audit.action')}</label>
                  <span className={`ba-action-badge ${getActionColor(selectedLog.action)}`}>
                    {selectedLog.action}
                  </span>
                </div>
                <div className="ba-detail-item">
                  <label>{t('adminTools.bigin.audit.module')}</label>
                  <span>{selectedLog.module || '-'}</span>
                </div>
                <div className="ba-detail-item">
                  <label>{t('adminTools.bigin.audit.recordName')}</label>
                  <span>{selectedLog.recordName || '-'}</span>
                </div>
                <div className="ba-detail-item">
                  <label>{t('adminTools.bigin.audit.recordId')}</label>
                  <span className="ba-mono">{selectedLog.recordId || '-'}</span>
                </div>
                <div className="ba-detail-item">
                  <label>{t('adminTools.bigin.audit.ipAddress')}</label>
                  <span>{selectedLog.ipAddress || '-'}</span>
                </div>
                <div className="ba-detail-item full-width">
                  <label>{t('adminTools.bigin.audit.details')}</label>
                  <span>{selectedLog.details || '-'}</span>
                </div>
                <div className="ba-detail-item">
                  <label>{t('adminTools.bigin.audit.biginId')}</label>
                  <span className="ba-mono">{selectedLog.biginId || '-'}</span>
                </div>
                <div className="ba-detail-item">
                  <label>{t('adminTools.bigin.audit.scrapedAt')}</label>
                  <span>{formatDate(selectedLog.scrapedAt)}</span>
                </div>
              </div>
              {selectedLog.rawData && Object.keys(selectedLog.rawData).length > 0 && (
                <div className="ba-raw-data">
                  <label>{t('adminTools.bigin.audit.rawData')}</label>
                  <pre>{JSON.stringify(selectedLog.rawData, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {}
      {showUploadModal && (
        <div className="ba-modal-overlay" onClick={closeUploadModal}>
          <div className="ba-modal ba-upload-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ba-modal-header">
              <h3>{t('adminTools.bigin.audit.uploadModalTitle')}</h3>
              <button className="ba-close-btn" onClick={closeUploadModal}>x</button>
            </div>
            <div className="ba-modal-body">
              <div className="ba-upload-area">
                <div className="ba-upload-icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
                <h4>{t('adminTools.bigin.audit.uploadFileTitle')}</h4>
                <p className="ba-upload-hint">
                  {t('adminTools.bigin.audit.uploadHint')}
                </p>
                <div className="ba-csv-columns">
                  <span>{t('adminTools.bigin.audit.colDoneBy')}</span>
                  <span>{t('adminTools.bigin.audit.colAction')}</span>
                  <span>{t('adminTools.bigin.audit.colModule')}</span>
                  <span>{t('adminTools.bigin.audit.recordName')}</span>
                  <span>{t('adminTools.bigin.audit.colRelatedModule')}</span>
                  <span>{t('adminTools.bigin.audit.colRelatedName')}</span>
                  <span>{t('adminTools.bigin.audit.colAccountName')}</span>
                  <span>{t('adminTools.bigin.audit.colAuditedTime')}</span>
                  <span>{t('adminTools.bigin.audit.colPipeline')}</span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="ba-file-input"
                  id="csv-upload"
                  disabled={uploading}
                />
                <label htmlFor="csv-upload" className={`ba-file-label ${uploading ? 'disabled' : ''}`}>
                  {uploading ? (
                    <>
                      <span className="scrape-spinner"></span>
                      {t('adminTools.bigin.audit.uploading')}
                    </>
                  ) : (
                    <>{t('adminTools.bigin.audit.chooseCsvFile')}</>
                  )}
                </label>
              </div>

              {uploadResult && (
                <div className={`ba-upload-result ${uploadResult.success ? 'success' : 'error'}`}>
                  <div className="ba-result-icon">
                    {uploadResult.success ? <FaCheckCircle /> : <FaTimesCircle />}
                  </div>
                  <div className="ba-result-content">
                    <strong>{uploadResult.success ? t('adminTools.bigin.audit.uploadSuccessful') : t('adminTools.bigin.audit.uploadFailed')}</strong>
                    <p>{uploadResult.message}</p>
                    {uploadResult.success && (
                      <div className="ba-result-stats">
                        <span className="ba-stat-saved">{t('adminTools.bigin.audit.saved', { count: uploadResult.saved })}</span>
                        <span className="ba-stat-skipped">{t('adminTools.bigin.audit.skipped', { count: uploadResult.skipped })}</span>
                        {uploadResult.errors ? (
                          <span className="ba-stat-errors">{t('adminTools.bigin.audit.errors', { count: uploadResult.errors })}</span>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {}
      {showDeleteAllModal && (
        <div className="ba-modal-overlay" onClick={closeDeleteModal}>
          <div className="ba-modal ba-delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ba-modal-header ba-modal-header-danger">
              <h3>{t('adminTools.bigin.audit.deleteAllTitle')}</h3>
              <button className="ba-close-btn" onClick={closeDeleteModal}>x</button>
            </div>
            <div className="ba-modal-body">
              {!deleteResult ? (
                <div className="ba-delete-warning">
                  <div className="ba-warning-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                  </div>
                  <h4>{t('adminTools.bigin.audit.areYouSure')}</h4>
                  <p><Trans i18nKey="adminTools.bigin.audit.deleteAllWarning" values={{ count: stats?.total || 0 }} components={[<span />, <strong />]} /></p>
                  <div className="ba-delete-actions">
                    <button className="ba-cancel-btn" onClick={closeDeleteModal} disabled={deleting}>
                      {t('adminTools.bigin.audit.cancel')}
                    </button>
                    <button className="ba-confirm-delete-btn" onClick={handleDeleteAll} disabled={deleting}>
                      {deleting ? (
                        <>
                          <span className="scrape-spinner"></span>
                          {t('adminTools.bigin.audit.deleting')}
                        </>
                      ) : (
                        t('adminTools.bigin.audit.yesDeleteAll')
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className={`ba-delete-result ${deleteResult.success ? 'success' : 'error'}`}>
                  <div className="ba-result-icon">
                    {deleteResult.success ? <FaCheckCircle /> : <FaTimesCircle />}
                  </div>
                  <div className="ba-result-content">
                    <strong>{deleteResult.success ? t('adminTools.bigin.audit.deletionSuccessful') : t('adminTools.bigin.audit.deletionFailed')}</strong>
                    <p>{deleteResult.message}</p>
                  </div>
                  <button className="ba-close-result-btn" onClick={closeDeleteModal}>{t('adminTools.bigin.audit.close')}</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {}
      {showDeleteUnnecessaryModal && (
        <div className="ba-modal-overlay" onClick={closeDeleteModal}>
          <div className="ba-modal ba-delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ba-modal-header ba-modal-header-warning">
              <h3>{t('adminTools.bigin.audit.deleteUnnecessaryTitle')}</h3>
              <button className="ba-close-btn" onClick={closeDeleteModal}>x</button>
            </div>
            <div className="ba-modal-body">
              {!deleteResult ? (
                <div className="ba-delete-warning">
                  <div className="ba-warning-icon ba-warning-icon-orange">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2">
                      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </div>
                  <h4>{t('adminTools.bigin.audit.deleteUnnecessaryQuestion')}</h4>
                  <p><Trans i18nKey="adminTools.bigin.audit.deleteUnnecessaryWarning" components={[<span />, <strong />, <span />, <strong />]} /></p>
                  <p className="ba-keep-note">{t('adminTools.bigin.audit.deleteUnnecessaryNote')}</p>
                  <div className="ba-delete-actions">
                    <button className="ba-cancel-btn" onClick={closeDeleteModal} disabled={deleting}>
                      {t('adminTools.bigin.audit.cancel')}
                    </button>
                    <button className="ba-confirm-delete-unnecessary-btn" onClick={handleDeleteUnnecessary} disabled={deleting}>
                      {deleting ? (
                        <>
                          <span className="scrape-spinner"></span>
                          {t('adminTools.bigin.audit.deleting')}
                        </>
                      ) : (
                        t('adminTools.bigin.audit.yesDeleteUnnecessary')
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className={`ba-delete-result ${deleteResult.success ? 'success' : 'error'}`}>
                  <div className="ba-result-icon">
                    {deleteResult.success ? <FaCheckCircle /> : <FaTimesCircle />}
                  </div>
                  <div className="ba-result-content">
                    <strong>{deleteResult.success ? t('adminTools.bigin.audit.deletionSuccessful') : t('adminTools.bigin.audit.deletionFailed')}</strong>
                    <p>{deleteResult.message}</p>
                  </div>
                  <button className="ba-close-result-btn" onClick={closeDeleteModal}>{t('adminTools.bigin.audit.close')}</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BiginAuditTab;
