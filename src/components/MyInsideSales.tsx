

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { biginAuditApi } from '../backendservice/api/biginAuditApi';
import { useAuthContext } from './auth';
import './MyInsideSales.css';

interface InsideSalesResult {
  salespersonName: string;
  isInsideSales: boolean;
  matchCount: number;
  totalAgreementsByUser?: number;
  agreementCount?: number;
  biginIdCount?: number;
  allBiginIds?: string[];
  agreementDetails?: Array<{
    agreementId?: string;
    biginId: string | null;
    title: string;
    createdAt: string;
    createdBy?: string;
    dealName?: string;
  }>;
  matchedBiginIds?: string[];
  message?: string;
  matchDetails: Array<{
    recordId?: string;
    recordName: string;
    action: string;
    timestamp: string;
    module: string;
  }>;
}

export const MyInsideSales: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<InsideSalesResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const checkEligibility = async () => {
    const salespersonName = user?.fullName || user?.username;

    if (!salespersonName) {
      setError(t('insideSales.notLoggedIn'));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Checking inside sales for:', salespersonName);
      const response = await biginAuditApi.checkInsideSalesEligibility(salespersonName);

      if (response?.success && response.data) {
        setResult(response.data);
        setLastChecked(new Date());
      } else {
        setError(t('insideSales.checkFailed'));
      }
    } catch (err) {
      console.error('Error checking inside sales:', err);
      setError(t('insideSales.checkError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkEligibility();
  }, [user?.fullName, user?.username]);

  return (
    <div className="my-inside-sales">
      {}
      <div className="mis-header">
        <div className="mis-header-content">
          <h1>{t('insideSales.title')}</h1>
          <p className="mis-subtitle">
            {t('insideSales.subtitle')}
          </p>
        </div>
        <button
          className="mis-refresh-btn"
          onClick={checkEligibility}
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="mis-spinner"></span>
              {t('insideSales.checking')}
            </>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 11-2.52-6.25" />
                <path d="M21 3v6h-6" />
              </svg>
              {t('common.refresh')}
            </>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mis-error-card">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Loading State */}
      {loading && !result && (
        <div className="mis-loading-card">
          <div className="mis-spinner-large"></div>
          <p>{t('insideSales.loadingCard')}</p>
        </div>
      )}

      {/* Result Card */}
      {result && (
        <>
          <div className={`mis-status-card ${result.isInsideSales ? 'has-deduction' : 'no-deduction'}`}>
            <div className="mis-status-header">
              <div className="mis-status-icon">
                {result.isInsideSales ? (
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                ) : (
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                )}
              </div>
              <div className="mis-status-info">
                <h2 className={result.isInsideSales ? 'status-has-deduction' : 'status-no-deduction'}>
                  {result.isInsideSales ? t('insideSales.statusHasDeduction') : t('insideSales.statusNoDeduction')}
                </h2>
                <p className="mis-status-details">
                  {t('insideSales.statusDetails', {
                    total: result.totalAgreementsByUser || 0,
                    uploaded: result.agreementCount || 0,
                    matched: result.matchCount,
                  })}
                </p>
                {result.message && (
                  <p className="mis-status-message">{result.message}</p>
                )}
                {lastChecked && (
                  <p className="mis-last-checked">{t('insideSales.lastChecked', { date: formatDate(lastChecked.toISOString()) })}</p>
                )}
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="mis-stats-row">
            <div className="mis-stat-card">
              <div className="mis-stat-value">{result.totalAgreementsByUser || 0}</div>
              <div className="mis-stat-label">{t('insideSales.stats.totalAgreements')}</div>
            </div>
            <div className="mis-stat-card">
              <div className="mis-stat-value">{result.agreementCount || 0}</div>
              <div className="mis-stat-label">{t('insideSales.stats.uploadedToBigin')}</div>
            </div>
            <div className="mis-stat-card">
              <div className="mis-stat-value">{result.matchCount}</div>
              <div className="mis-stat-label">{t('insideSales.stats.foundInAudit')}</div>
            </div>
          </div>

          {}
          {result.matchCount > 0 && result.matchDetails.length > 0 && (
            <div className="mis-section-card">
              <h3>{t('insideSales.matchingRecords.title')}</h3>
              <p className="mis-section-subtitle">
                {t('insideSales.matchingRecords.subtitle')}
              </p>
              <div className="mis-table-wrapper">
                <table className="mis-table">
                  <thead>
                    <tr>
                      <th>{t('insideSales.matchingRecords.biginId')}</th>
                      <th>{t('insideSales.matchingRecords.recordName')}</th>
                      <th>{t('insideSales.matchingRecords.action')}</th>
                      <th>{t('insideSales.matchingRecords.module')}</th>
                      <th>{t('insideSales.matchingRecords.timestamp')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.matchDetails.map((match, idx) => (
                      <tr key={idx}>
                        <td className="mis-monospace">{match.recordId || '-'}</td>
                        <td>{match.recordName || '-'}</td>
                        <td>
                          <span className="mis-action-badge">{match.action}</span>
                        </td>
                        <td>{match.module || '-'}</td>
                        <td>{formatDate(match.timestamp)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* All Agreements */}
          <div className="mis-section-card">
            <h3>{t('insideSales.agreementsTable.title', { total: result.totalAgreementsByUser || 0, uploaded: result.agreementCount || 0 })}</h3>
            <p className="mis-section-subtitle">
              {t('insideSales.agreementsTable.subtitle')}
            </p>
            {result.agreementDetails && result.agreementDetails.length > 0 ? (
              <div className="mis-table-wrapper">
                <table className="mis-table">
                  <thead>
                    <tr>
                      <th>{t('insideSales.agreementsTable.agreementTitle')}</th>
                      <th>{t('insideSales.agreementsTable.biginDealId')}</th>
                      <th>{t('insideSales.agreementsTable.dealName')}</th>
                      <th>{t('insideSales.agreementsTable.createdAt')}</th>
                      <th>{t('insideSales.agreementsTable.status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.agreementDetails.map((agreement, idx) => {
                      const hasBiginId = agreement.biginId && agreement.biginId.trim() !== '';
                      const isMatched = hasBiginId && result.matchedBiginIds?.includes(agreement.biginId!);
                      return (
                        <tr key={idx} className={isMatched ? 'row-matched' : !hasBiginId ? 'row-not-uploaded' : ''}>
                          <td>{agreement.title}</td>
                          <td className="mis-monospace">
                            {hasBiginId ? agreement.biginId : <span className="text-muted">{t('insideSales.agreementsTable.notUploaded')}</span>}
                          </td>
                          <td>{agreement.dealName || '-'}</td>
                          <td>{formatDate(agreement.createdAt)}</td>
                          <td>
                            {!hasBiginId ? (
                              <span className="mis-badge badge-pending">{t('insideSales.agreementsTable.badgeNotUploaded')}</span>
                            ) : isMatched ? (
                              <span className="mis-badge badge-success">{t('insideSales.agreementsTable.badgeFoundInAudit')}</span>
                            ) : (
                              <span className="mis-badge badge-neutral">{t('insideSales.agreementsTable.badgeNotInAudit')}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mis-empty-message">
                {t('insideSales.agreementsTable.empty')}
              </p>
            )}
          </div>

          {/* Info Card */}
          <div className="mis-info-card">
            <h4>{t('insideSales.info.title')}</h4>
            <ul>
              <li>{t('insideSales.info.item1')}</li>
              <li>{t('insideSales.info.item2')}</li>
              <li>{t('insideSales.info.item3Prefix')}<strong>{t('insideSales.info.item3Bold')}</strong></li>
              <li><strong>{t('insideSales.info.item4')}</strong>{t('insideSales.info.item4Suffix')}</li>
              <li><strong>{t('insideSales.info.item5Bold')}</strong>{t('insideSales.info.item5Suffix')}</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
};

export default MyInsideSales;
