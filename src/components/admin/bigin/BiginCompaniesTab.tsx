

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import { biginCompanyApi, type BiginCompany, type FetchStatus, type CompanyStats } from '../../../backendservice/api/biginCompanyApi';
import './BiginCompaniesTab.css';

export const BiginCompaniesTab: React.FC = () => {
  const { t } = useTranslation();
  const [companies, setCompanies] = useState<BiginCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchStatus, setFetchStatus] = useState<FetchStatus | null>(null);
  const [stats, setStats] = useState<CompanyStats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [pagination, setPagination] = useState({ total: 0, skip: 0, limit: 50 });
  const [selectedCompany, setSelectedCompany] = useState<BiginCompany | null>(null);

  const loadCompanies = useCallback(async () => {
    setLoading(true);
    const result = await biginCompanyApi.getAll({
      search: searchTerm || undefined,
      city: cityFilter || undefined,
      state: stateFilter || undefined,
      owner: ownerFilter || undefined,
      limit: pagination.limit,
      skip: pagination.skip,
    });

    if (result) {
      setCompanies(result.data);
      setPagination(prev => ({ ...prev, total: result.pagination.total }));
    }
    setLoading(false);
  }, [searchTerm, cityFilter, stateFilter, ownerFilter, pagination.limit, pagination.skip]);

  const loadStats = useCallback(async () => {
    const result = await biginCompanyApi.getStats();
    if (result) {
      setStats(result);
    }
  }, []);

  const loadFetchStatus = useCallback(async () => {
    const result = await biginCompanyApi.getFetchStatus();
    if (result) {
      setFetchStatus(result);
    }
  }, []);

  useEffect(() => {
    loadCompanies();
    loadStats();
    loadFetchStatus();
  }, []);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  useEffect(() => {
    if (fetchStatus?.isRunning) {
      const interval = setInterval(() => {
        loadFetchStatus();
      }, 2000);
      return () => clearInterval(interval);
    } else if (fetchStatus?.lastFetchResult === 'success') {
      
      loadCompanies();
      loadStats();
    }
  }, [fetchStatus?.isRunning, fetchStatus?.lastFetchResult, loadFetchStatus, loadCompanies, loadStats]);

  const handleFetch = async () => {
    const result = await biginCompanyApi.startFetch();
    if (result) {
      loadFetchStatus();
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, skip: 0 }));
    loadCompanies();
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  return (
    <div className="bigin-companies-tab">
      {}
      <div className="bc-header">
        <div className="bc-header-content">
          <h2>{t('adminTools.bigin.companies.title')}</h2>
          <p className="bc-subtitle">{t('adminTools.bigin.companies.subtitle')}</p>
        </div>
        <div className="bc-header-actions">
          <button
            className={`bc-fetch-btn ${fetchStatus?.isRunning ? 'fetching' : ''}`}
            onClick={handleFetch}
            disabled={fetchStatus?.isRunning}
          >
            {fetchStatus?.isRunning ? (
              <>
                <span className="fetch-spinner"></span>
                {t('adminTools.bigin.companies.fetching', { progress: fetchStatus.progress })}
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" />
                </svg>
                {t('adminTools.bigin.companies.fetchCompanies')}
              </>
            )}
          </button>
        </div>
      </div>

      {}
      <div className="bc-stats-grid">
        <div className="bc-stat-card">
          <div className="bc-stat-value">{stats?.total || 0}</div>
          <div className="bc-stat-label">{t('adminTools.bigin.companies.totalCompanies')}</div>
        </div>
        <div className="bc-stat-card">
          <div className="bc-stat-value bc-stat-cities">{stats?.uniqueCities || 0}</div>
          <div className="bc-stat-label">{t('adminTools.bigin.companies.cities')}</div>
        </div>
        <div className="bc-stat-card">
          <div className="bc-stat-value bc-stat-states">{stats?.uniqueStates || 0}</div>
          <div className="bc-stat-label">{t('adminTools.bigin.companies.states')}</div>
        </div>
        <div className="bc-stat-card">
          <div className="bc-stat-value">{stats?.uniqueOwners || 0}</div>
          <div className="bc-stat-label">{t('adminTools.bigin.companies.owners')}</div>
        </div>
      </div>

      {}
      {fetchStatus && (
        <div className={`bc-fetch-status ${fetchStatus.lastFetchResult || ''}`}>
          <div className="bc-fetch-info">
            <span className="bc-fetch-label">{t('adminTools.bigin.companies.lastSync')}</span>
            <span className="bc-fetch-time">{formatDate(fetchStatus.lastFetchAt)}</span>
            {fetchStatus.lastFetchResult && (
              <span className={`bc-fetch-result ${fetchStatus.lastFetchResult}`}>
                {fetchStatus.lastFetchResult === 'success' ? <><FaCheckCircle /> {t('adminTools.bigin.companies.success')}</> : <><FaTimesCircle /> {t('adminTools.bigin.companies.failed')}</>}
              </span>
            )}
            {fetchStatus.totalCompanies > 0 && (
              <span className="bc-total-companies">{t('adminTools.bigin.companies.companiesStored', { count: fetchStatus.totalCompanies })}</span>
            )}
          </div>
          {fetchStatus.isRunning && (
            <div className="bc-fetch-progress">
              <div className="bc-progress-bar">
                <div className="bc-progress-fill" style={{ width: `${fetchStatus.progress}%` }}></div>
              </div>
              <span className="bc-progress-text">{fetchStatus.message}</span>
            </div>
          )}
        </div>
      )}

      {}
      <div className="bc-filters">
        <form onSubmit={handleSearch} className="bc-search-form">
          <input
            type="text"
            placeholder={t('adminTools.bigin.companies.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bc-search-input"
          />
          <button type="submit" className="bc-search-btn">{t('adminTools.bigin.companies.search')}</button>
        </form>

        <select
          value={cityFilter}
          onChange={(e) => {
            setCityFilter(e.target.value);
            setPagination(prev => ({ ...prev, skip: 0 }));
          }}
          className="bc-filter-select"
        >
          <option value="">{t('adminTools.bigin.companies.allCities')}</option>
          {stats?.cities?.map(city => (
            <option key={city} value={city}>{city}</option>
          ))}
        </select>

        <select
          value={stateFilter}
          onChange={(e) => {
            setStateFilter(e.target.value);
            setPagination(prev => ({ ...prev, skip: 0 }));
          }}
          className="bc-filter-select"
        >
          <option value="">{t('adminTools.bigin.companies.allStates')}</option>
          {stats?.states?.map(state => (
            <option key={state} value={state}>{state}</option>
          ))}
        </select>

        <select
          value={ownerFilter}
          onChange={(e) => {
            setOwnerFilter(e.target.value);
            setPagination(prev => ({ ...prev, skip: 0 }));
          }}
          className="bc-filter-select"
        >
          <option value="">{t('adminTools.bigin.companies.allOwners')}</option>
          {stats?.owners?.map(owner => (
            <option key={owner} value={owner}>{owner}</option>
          ))}
        </select>

        <span className="bc-results-count">
          {t('adminTools.bigin.companies.companiesFound', { count: pagination.total })}
        </span>
      </div>

      {}
      {loading ? (
        <div className="bc-loading">
          <div className="bc-loading-spinner"></div>
          <p>{t('adminTools.bigin.companies.loadingCompanies')}</p>
        </div>
      ) : companies.length === 0 ? (
        <div className="bc-empty">
          <div className="bc-empty-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.5">
              <path d="M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4z" />
              <path d="M8 14v3M12 14v3M16 14v3" />
            </svg>
          </div>
          <h3>{t('adminTools.bigin.companies.noCompaniesTitle')}</h3>
          <p>{t('adminTools.bigin.companies.noCompaniesText')}</p>
        </div>
      ) : (
        <div className="bc-table-container">
          <table className="bc-table">
            <thead>
              <tr>
                <th>{t('adminTools.bigin.companies.colCompanyName')}</th>
                <th>{t('adminTools.bigin.companies.colPhone')}</th>
                <th>{t('adminTools.bigin.companies.colAddress')}</th>
                <th>{t('adminTools.bigin.companies.colCity')}</th>
                <th>{t('adminTools.bigin.companies.colState')}</th>
                <th>{t('adminTools.bigin.companies.colOwner')}</th>
                <th>{t('adminTools.bigin.companies.colLastSynced')}</th>
                <th>{t('adminTools.bigin.companies.colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((company) => (
                <tr key={company._id}>
                  <td className="bc-company-name">
                    <strong>{company.companyName}</strong>
                    {company.industry && <span className="bc-industry">{company.industry}</span>}
                  </td>
                  <td className="bc-phone">{company.phone || '-'}</td>
                  <td className="bc-address">{company.street || '-'}</td>
                  <td>{company.city || '-'}</td>
                  <td>{company.state || '-'}</td>
                  <td className="bc-owner">{company.owner || '-'}</td>
                  <td className="bc-synced">{formatDate(company.lastSyncedAt)}</td>
                  <td className="bc-actions">
                    <button
                      className="bc-view-btn"
                      onClick={() => setSelectedCompany(company)}
                    >
                      {t('adminTools.bigin.companies.view')}
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
        <div className="bc-pagination">
          <button
            onClick={() => setPagination(prev => ({ ...prev, skip: Math.max(0, prev.skip - prev.limit) }))}
            disabled={pagination.skip === 0}
            className="bc-page-btn"
          >
            {t('adminTools.bigin.companies.previous')}
          </button>
          <span className="bc-page-info">
            {t('adminTools.bigin.companies.pageInfo', { from: pagination.skip + 1, to: Math.min(pagination.skip + pagination.limit, pagination.total), total: pagination.total })}
          </span>
          <button
            onClick={() => setPagination(prev => ({ ...prev, skip: prev.skip + prev.limit }))}
            disabled={pagination.skip + pagination.limit >= pagination.total}
            className="bc-page-btn"
          >
            {t('adminTools.bigin.companies.next')}
          </button>
        </div>
      )}

      {}
      {selectedCompany && (
        <div className="bc-modal-overlay" onClick={() => setSelectedCompany(null)}>
          <div className="bc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="bc-modal-header">
              <h3>{selectedCompany.companyName}</h3>
              <button className="bc-close-btn" onClick={() => setSelectedCompany(null)}>x</button>
            </div>
            <div className="bc-modal-body">
              <div className="bc-detail-grid">
                <div className="bc-detail-item">
                  <label>{t('adminTools.bigin.companies.biginId')}</label>
                  <span className="bc-mono">{selectedCompany.biginId || '-'}</span>
                </div>
                <div className="bc-detail-item">
                  <label>{t('adminTools.bigin.companies.companyName')}</label>
                  <span>{selectedCompany.companyName}</span>
                </div>
                <div className="bc-detail-item">
                  <label>{t('adminTools.bigin.companies.phone')}</label>
                  <span>{selectedCompany.phone || '-'}</span>
                </div>
                <div className="bc-detail-item">
                  <label>{t('adminTools.bigin.companies.email')}</label>
                  <span>{selectedCompany.email || '-'}</span>
                </div>
                <div className="bc-detail-item">
                  <label>{t('adminTools.bigin.companies.website')}</label>
                  <span>{selectedCompany.website ? (
                    <a href={selectedCompany.website} target="_blank" rel="noopener noreferrer">
                      {selectedCompany.website}
                    </a>
                  ) : '-'}</span>
                </div>
                <div className="bc-detail-item">
                  <label>{t('adminTools.bigin.companies.industry')}</label>
                  <span>{selectedCompany.industry || '-'}</span>
                </div>
                <div className="bc-detail-item">
                  <label>{t('adminTools.bigin.companies.accountType')}</label>
                  <span>{selectedCompany.accountType || '-'}</span>
                </div>
                <div className="bc-detail-item">
                  <label>{t('adminTools.bigin.companies.owner')}</label>
                  <span>{selectedCompany.owner || '-'}</span>
                </div>
                <div className="bc-detail-item full-width">
                  <label>{t('adminTools.bigin.companies.address')}</label>
                  <span>
                    {[
                      selectedCompany.street,
                      selectedCompany.city,
                      selectedCompany.state,
                      selectedCompany.zipCode,
                      selectedCompany.country
                    ].filter(Boolean).join(', ') || '-'}
                  </span>
                </div>
                <div className="bc-detail-item">
                  <label>{t('adminTools.bigin.companies.pipeline')}</label>
                  <span>{selectedCompany.pipeline || '-'}</span>
                </div>
                <div className="bc-detail-item">
                  <label>{t('adminTools.bigin.companies.stage')}</label>
                  <span>{selectedCompany.stage || '-'}</span>
                </div>
                <div className="bc-detail-item full-width">
                  <label>{t('adminTools.bigin.companies.description')}</label>
                  <span>{selectedCompany.description || '-'}</span>
                </div>
                <div className="bc-detail-item">
                  <label>{t('adminTools.bigin.companies.lastSynced')}</label>
                  <span>{formatDate(selectedCompany.lastSyncedAt)}</span>
                </div>
                <div className="bc-detail-item">
                  <label>{t('adminTools.bigin.companies.createdAt')}</label>
                  <span>{formatDate(selectedCompany.createdAt)}</span>
                </div>
              </div>
              {selectedCompany.rawData && Object.keys(selectedCompany.rawData).length > 0 && (
                <div className="bc-raw-data">
                  <label>{t('adminTools.bigin.companies.rawData')}</label>
                  <pre>{JSON.stringify(selectedCompany.rawData, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BiginCompaniesTab;
