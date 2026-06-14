

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FaExternalLinkAlt } from 'react-icons/fa';
import { routestarCustomersApi, type RouteStarCustomer, type CustomerSyncStatus, type CustomerStats } from '../../../backendservice/api/routestarCustomersApi';
import './RouteStarCustomersTab.css';

export const RouteStarCustomersTab: React.FC = () => {
  const { t } = useTranslation();
  const [customers, setCustomers] = useState<RouteStarCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<CustomerSyncStatus | null>(null);
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [pagination, setPagination] = useState({ total: 0, skip: 0, limit: 50 });
  const [selectedCustomer, setSelectedCustomer] = useState<RouteStarCustomer | null>(null);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    const result = await routestarCustomersApi.getAll({
      search: searchTerm || undefined,
      state: stateFilter || undefined,
      isActive: activeFilter === 'all' ? undefined : activeFilter === 'active',
      limit: pagination.limit,
      skip: pagination.skip,
    });

    if (result) {
      setCustomers(result.data);
      setPagination(prev => ({ ...prev, total: result.pagination.total }));
    }
    setLoading(false);
  }, [searchTerm, stateFilter, activeFilter, pagination.limit, pagination.skip]);

  const loadStats = useCallback(async () => {
    const result = await routestarCustomersApi.getStats();
    if (result) {
      setStats(result);
    }
  }, []);

  const loadSyncStatus = useCallback(async () => {
    const result = await routestarCustomersApi.getSyncStatus();
    if (result) {
      setSyncStatus(result);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
    loadStats();
    loadSyncStatus();
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    if (syncStatus?.isRunning) {
      const interval = setInterval(() => {
        loadSyncStatus();
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [syncStatus?.isRunning, loadSyncStatus]);

  const handleSync = async () => {
    const result = await routestarCustomersApi.startSync();
    if (result) {
      loadSyncStatus();
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, skip: 0 }));
    loadCustomers();
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  return (
    <div className="routestar-customers-tab">
      {}
      <div className="rs-header">
        <div className="rs-header-content">
          <h2>{t('adminTools.routestar.title')}</h2>
          <p className="rs-subtitle">{t('adminTools.routestar.subtitle')}</p>
        </div>
        <button
          className={`rs-sync-btn ${syncStatus?.isRunning ? 'syncing' : ''}`}
          onClick={handleSync}
          disabled={syncStatus?.isRunning}
        >
          {syncStatus?.isRunning ? (
            <>
              <span className="sync-spinner"></span>
              {t('adminTools.routestar.syncing', { progress: syncStatus.progress })}
            </>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" />
              </svg>
              {t('adminTools.routestar.syncFromRouteStar')}
            </>
          )}
        </button>
      </div>

      {}
      <div className="rs-stats-grid">
        <div className="rs-stat-card">
          <div className="rs-stat-value">{stats?.total || 0}</div>
          <div className="rs-stat-label">{t('adminTools.routestar.totalCustomers')}</div>
        </div>
        <div className="rs-stat-card">
          <div className="rs-stat-value rs-stat-active">{stats?.active || 0}</div>
          <div className="rs-stat-label">{t('adminTools.routestar.active')}</div>
        </div>
        <div className="rs-stat-card">
          <div className="rs-stat-value rs-stat-inactive">{stats?.inactive || 0}</div>
          <div className="rs-stat-label">{t('adminTools.routestar.inactive')}</div>
        </div>
        <div className="rs-stat-card">
          <div className="rs-stat-value">{stats?.uniqueStates || 0}</div>
          <div className="rs-stat-label">{t('adminTools.routestar.states')}</div>
        </div>
      </div>

      {}
      {syncStatus && (
        <div className={`rs-sync-status ${syncStatus.lastSyncResult || ''}`}>
          <div className="rs-sync-info">
            <span className="rs-sync-label">{t('adminTools.routestar.lastSync')}</span>
            <span className="rs-sync-time">{formatDate(syncStatus.lastSyncAt)}</span>
            {syncStatus.lastSyncResult && (
              <span className={`rs-sync-result ${syncStatus.lastSyncResult}`}>
                {syncStatus.lastSyncResult === 'success' ? `✓ ${t('adminTools.routestar.success')}` :
                 syncStatus.lastSyncResult === 'partial' ? t('adminTools.routestar.partial') : `✗ ${t('adminTools.routestar.failed')}`}
              </span>
            )}
          </div>
          {syncStatus.isRunning && (
            <div className="rs-sync-progress">
              <div className="rs-progress-bar">
                <div className="rs-progress-fill" style={{ width: `${syncStatus.progress}%` }}></div>
              </div>
              <span className="rs-progress-text">{syncStatus.message}</span>
            </div>
          )}
        </div>
      )}

      {}
      <div className="rs-filters">
        <form onSubmit={handleSearch} className="rs-search-form">
          <input
            type="text"
            placeholder={t('adminTools.routestar.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="rs-search-input"
          />
          <button type="submit" className="rs-search-btn">{t('adminTools.routestar.search')}</button>
        </form>

        <select
          value={stateFilter}
          onChange={(e) => {
            setStateFilter(e.target.value);
            setPagination(prev => ({ ...prev, skip: 0 }));
          }}
          className="rs-filter-select"
        >
          <option value="">{t('adminTools.routestar.allStates')}</option>
          {stats?.states.map(state => (
            <option key={state} value={state}>{state}</option>
          ))}
        </select>

        <select
          value={activeFilter}
          onChange={(e) => {
            setActiveFilter(e.target.value);
            setPagination(prev => ({ ...prev, skip: 0 }));
          }}
          className="rs-filter-select"
        >
          <option value="all">{t('adminTools.routestar.allStatus')}</option>
          <option value="active">{t('adminTools.routestar.activeOnly')}</option>
          <option value="inactive">{t('adminTools.routestar.inactiveOnly')}</option>
        </select>

        <span className="rs-results-count">
          {t('adminTools.routestar.customersFound', { count: pagination.total })}
        </span>
      </div>

      {}
      {loading ? (
        <div className="rs-loading">
          <div className="rs-loading-spinner"></div>
          <p>{t('adminTools.routestar.loadingCustomers')}</p>
        </div>
      ) : customers.length === 0 ? (
        <div className="rs-empty">
          <div className="rs-empty-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#c00000" strokeWidth="1.5">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <h3>{t('adminTools.routestar.noCustomersTitle')}</h3>
          <p>{t('adminTools.routestar.noCustomersText')}</p>
        </div>
      ) : (
        <div className="rs-table-container">
          <table className="rs-table">
            <thead>
              <tr>
                <th>{t('adminTools.routestar.colCustomer')}</th>
                <th>{t('adminTools.routestar.colCompany')}</th>
                <th>{t('adminTools.routestar.colAddress')}</th>
                <th>{t('adminTools.routestar.colCity')}</th>
                <th>{t('adminTools.routestar.colState')}</th>
                <th>{t('adminTools.routestar.colPhone')}</th>
                <th>{t('adminTools.routestar.colRoute')}</th>
                <th>{t('adminTools.routestar.colStatus')}</th>
                <th>{t('adminTools.routestar.colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer._id} className={!customer.isActive ? 'inactive-row' : ''}>
                  <td className="rs-customer-name">
                    <strong>{customer.name}</strong>
                  </td>
                  <td>{customer.company || '-'}</td>
                  <td className="rs-address">{customer.address || '-'}</td>
                  <td>{customer.city || '-'}</td>
                  <td>{customer.state || '-'}</td>
                  <td>
                    {customer.phone ? (
                      <a href={`tel:${customer.phone}`} className="rs-phone-link">{customer.phone}</a>
                    ) : '-'}
                  </td>
                  <td>{customer.onRoute || '-'}</td>
                  <td>
                    <span className={`rs-status-badge ${customer.isActive ? 'active' : 'inactive'}`}>
                      {customer.isActive ? t('adminTools.routestar.active') : t('adminTools.routestar.inactive')}
                    </span>
                  </td>
                  <td className="rs-actions">
                    <button
                      className="rs-view-btn"
                      onClick={() => setSelectedCustomer(customer)}
                    >
                      {t('adminTools.routestar.view')}
                    </button>
                    {customer.detailUrl && (
                      <a
                        href={customer.detailUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rs-external-link"
                        title={t('adminTools.routestar.openInRouteStar')}
                      >
                        <FaExternalLinkAlt />
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {}
      {pagination.total > pagination.limit && (
        <div className="rs-pagination">
          <button
            onClick={() => setPagination(prev => ({ ...prev, skip: Math.max(0, prev.skip - prev.limit) }))}
            disabled={pagination.skip === 0}
            className="rs-page-btn"
          >
            {t('adminTools.routestar.previous')}
          </button>
          <span className="rs-page-info">
            {t('adminTools.routestar.pageInfo', { from: pagination.skip + 1, to: Math.min(pagination.skip + pagination.limit, pagination.total), total: pagination.total })}
          </span>
          <button
            onClick={() => setPagination(prev => ({ ...prev, skip: prev.skip + prev.limit }))}
            disabled={pagination.skip + pagination.limit >= pagination.total}
            className="rs-page-btn"
          >
            {t('adminTools.routestar.next')}
          </button>
        </div>
      )}

      {}
      {selectedCustomer && (
        <div className="rs-modal-overlay" onClick={() => setSelectedCustomer(null)}>
          <div className="rs-modal" onClick={(e) => e.stopPropagation()}>
            <div className="rs-modal-header">
              <h3>{selectedCustomer.name}</h3>
              <button className="rs-close-btn" onClick={() => setSelectedCustomer(null)}>×</button>
            </div>
            <div className="rs-modal-body">
              <div className="rs-detail-grid">
                <div className="rs-detail-item">
                  <label>{t('adminTools.routestar.company')}</label>
                  <span>{selectedCustomer.company || '-'}</span>
                </div>
                <div className="rs-detail-item">
                  <label>{t('adminTools.routestar.routeStarId')}</label>
                  <span className="rs-mono">{selectedCustomer.routeStarId}</span>
                </div>
                <div className="rs-detail-item full-width">
                  <label>{t('adminTools.routestar.address')}</label>
                  <span>{selectedCustomer.address || '-'}</span>
                </div>
                <div className="rs-detail-item">
                  <label>{t('adminTools.routestar.city')}</label>
                  <span>{selectedCustomer.city || '-'}</span>
                </div>
                <div className="rs-detail-item">
                  <label>{t('adminTools.routestar.state')}</label>
                  <span>{selectedCustomer.state || '-'}</span>
                </div>
                <div className="rs-detail-item">
                  <label>{t('adminTools.routestar.zipCode')}</label>
                  <span>{selectedCustomer.zipCode || '-'}</span>
                </div>
                <div className="rs-detail-item">
                  <label>{t('adminTools.routestar.phone')}</label>
                  <span>{selectedCustomer.phone || '-'}</span>
                </div>
                <div className="rs-detail-item">
                  <label>{t('adminTools.routestar.email')}</label>
                  <span>{selectedCustomer.email || '-'}</span>
                </div>
                <div className="rs-detail-item">
                  <label>{t('adminTools.routestar.onRoute')}</label>
                  <span>{selectedCustomer.onRoute || '-'}</span>
                </div>
                <div className="rs-detail-item">
                  <label>{t('adminTools.routestar.grouping')}</label>
                  <span>{selectedCustomer.grouping || '-'}</span>
                </div>
                <div className="rs-detail-item">
                  <label>{t('adminTools.routestar.salesRep')}</label>
                  <span>{selectedCustomer.salesRep || '-'}</span>
                </div>
                <div className="rs-detail-item">
                  <label>{t('adminTools.routestar.status')}</label>
                  <span className={`rs-status-badge ${selectedCustomer.isActive ? 'active' : 'inactive'}`}>
                    {selectedCustomer.isActive ? t('adminTools.routestar.active') : t('adminTools.routestar.inactive')}
                  </span>
                </div>
                <div className="rs-detail-item">
                  <label>{t('adminTools.routestar.createdInRouteStar')}</label>
                  <span>{formatDate(selectedCustomer.createdInRouteStar)}</span>
                </div>
                <div className="rs-detail-item">
                  <label>{t('adminTools.routestar.lastSynced')}</label>
                  <span>{formatDate(selectedCustomer.lastSyncedAt)}</span>
                </div>
              </div>
              {selectedCustomer.detailUrl && (
                <div className="rs-modal-actions">
                  <a
                    href={selectedCustomer.detailUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rs-external-btn"
                  >
                    {t('adminTools.routestar.openInRouteStar')} <FaExternalLinkAlt />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RouteStarCustomersTab;
