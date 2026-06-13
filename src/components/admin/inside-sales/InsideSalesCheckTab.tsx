

import React, { useState, useEffect } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { biginAuditApi } from '../../../backendservice/api/biginAuditApi';
import { userManagementApi } from '../../../backendservice/api/userManagementApi';
import './InsideSalesCheckTab.css';

interface Employee {
  id: string;
  username: string;
  fullName: string;
  email: string | null;
  role: string;
  isActive: boolean;
}

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

export const InsideSalesCheckTab: React.FC = () => {
  const { t } = useTranslation();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<InsideSalesResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const response = await userManagementApi.listUsers({ role: 'employee', limit: 200 });
        if (response?.users) {
          setEmployees(response.users.filter(u => u.role === 'employee'));
        }
      } catch (err) {
        console.error('Error loading employees:', err);
        setError(t('adminTools.insideSales.failedToLoadEmployees'));
      } finally {
        setLoading(false);
      }
    };

    loadEmployees();
  }, []);

  const handleCheck = async () => {
    if (!selectedEmployee) {
      setError(t('adminTools.insideSales.pleaseSelectEmployee'));
      return;
    }

    const employee = employees.find(e => e.id === selectedEmployee);
    if (!employee) return;

    setChecking(true);
    setError(null);
    setResult(null);

    try {
      
      const nameToCheck = employee.fullName || employee.username;
      console.log('Checking inside sales for:', nameToCheck);

      const response = await biginAuditApi.checkInsideSalesEligibility(nameToCheck);

      if (response?.success && response.data) {
        setResult(response.data);
      } else {
        setError(t('adminTools.insideSales.checkFailed'));
      }
    } catch (err) {
      console.error('Error checking inside sales:', err);
      setError(t('adminTools.insideSales.checkError'));
    } finally {
      setChecking(false);
    }
  };

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

  return (
    <div className="inside-sales-check-tab">
      {}
      <div className="isc-header">
        <div className="isc-header-content">
          <h2>{t('adminTools.insideSales.title')}</h2>
          <p className="isc-subtitle">{t('adminTools.insideSales.subtitle')}</p>
        </div>
      </div>

      {/* Selection Card */}
      <div className="isc-selection-card">
        <div className="isc-selection-row">
          <div className="isc-select-group">
            <label htmlFor="employee-select">{t('adminTools.insideSales.selectEmployee')}</label>
            <select
              id="employee-select"
              value={selectedEmployee}
              onChange={(e) => {
                setSelectedEmployee(e.target.value);
                setResult(null);
                setError(null);
              }}
              disabled={loading || checking}
            >
              <option value="">{t('adminTools.insideSales.selectAnEmployee')}</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.fullName || emp.username} {emp.email ? `(${emp.email})` : ''}
                </option>
              ))}
            </select>
          </div>
          <button
            className="isc-check-btn"
            onClick={handleCheck}
            disabled={!selectedEmployee || checking}
          >
            {checking ? (
              <>
                <span className="isc-spinner"></span>
                {t('adminTools.insideSales.checking')}
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
                {t('adminTools.insideSales.checkEligibility')}
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="isc-error">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        )}
      </div>

      {/* Result Card */}
      {result && (
        <div className={`isc-result-card ${result.isInsideSales ? 'has-deduction' : 'no-deduction'}`}>
          <div className="isc-result-header">
            <div className="isc-result-icon">
              {result.isInsideSales ? (
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              ) : (
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              )}
            </div>
            <div className="isc-result-status">
              <h3>{result.salespersonName}</h3>
              <p className="isc-status-text">
                {result.isInsideSales ? (
                  <span className="status-has-deduction">{t('adminTools.insideSales.statusHasDeduction')}</span>
                ) : (
                  <span className="status-no-deduction">{t('adminTools.insideSales.statusNoDeduction')}</span>
                )}
              </p>
              <p className="isc-match-count">
                {result.totalAgreementsByUser !== undefined && (
                  <>{t('adminTools.insideSales.totalAgreements', { count: result.totalAgreementsByUser })} • </>
                )}
                {result.agreementCount !== undefined && (
                  <>{t('adminTools.insideSales.withBiginId', { count: result.agreementCount })} • </>
                )}
                {t('adminTools.insideSales.auditRecordsMatched', { count: result.matchCount })}
              </p>
              {result.message && (
                <p className="isc-match-count" style={{ fontStyle: 'italic' }}>{result.message}</p>
              )}
            </div>
          </div>

          {result.matchCount > 0 && result.matchDetails.length > 0 && (
            <div className="isc-match-details">
              <h4>{t('adminTools.insideSales.matchingAuditRecords')}</h4>
              <div className="isc-matches-table">
                <table>
                  <thead>
                    <tr>
                      <th>{t('adminTools.insideSales.colBiginId')}</th>
                      <th>{t('adminTools.insideSales.colRecordName')}</th>
                      <th>{t('adminTools.insideSales.colAction')}</th>
                      <th>{t('adminTools.insideSales.colModule')}</th>
                      <th>{t('adminTools.insideSales.colTimestamp')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.matchDetails.map((match, idx) => (
                      <tr key={idx}>
                        <td>{match.recordId || '-'}</td>
                        <td>{match.recordName || '-'}</td>
                        <td>
                          <span className="isc-action-badge">{match.action}</span>
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

          {/* Agreements with Bigin IDs */}
          <div className="isc-match-details" style={{ marginTop: '20px' }}>
            <h4>{t('adminTools.insideSales.employeesAgreements', { total: result.totalAgreementsByUser || 0, uploaded: result.agreementCount || 0 })}</h4>
            {result.agreementDetails && result.agreementDetails.length > 0 ? (
              <div className="isc-matches-table">
                <table>
                  <thead>
                    <tr>
                      <th>{t('adminTools.insideSales.colAgreementTitle')}</th>
                      <th>{t('adminTools.insideSales.colBiginDealId')}</th>
                      <th>{t('adminTools.insideSales.colDealName')}</th>
                      <th>{t('adminTools.insideSales.colCreatedAt')}</th>
                      <th>{t('adminTools.insideSales.colStatus')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.agreementDetails.map((agreement, idx) => {
                      const hasBiginId = agreement.biginId && agreement.biginId.trim() !== '';
                      const isMatched = hasBiginId && result.matchedBiginIds?.includes(agreement.biginId!);
                      return (
                        <tr key={idx} style={{ backgroundColor: isMatched ? '#dcfce7' : !hasBiginId ? '#fef3c7' : 'transparent' }}>
                          <td>{agreement.title}</td>
                          <td style={{ fontFamily: 'monospace', fontSize: '13px' }}>
                            {hasBiginId ? agreement.biginId : <span style={{ color: '#9ca3af' }}>{t('adminTools.insideSales.notUploaded')}</span>}
                          </td>
                          <td>{agreement.dealName || '-'}</td>
                          <td>{formatDate(agreement.createdAt)}</td>
                          <td>
                            {!hasBiginId ? (
                              <span className="isc-action-badge" style={{ background: '#fef3c7', color: '#d97706' }}>
                                {t('adminTools.insideSales.statusNotUploaded')}
                              </span>
                            ) : isMatched ? (
                              <span className="isc-action-badge" style={{ background: '#dcfce7', color: '#059669' }}>
                                {t('adminTools.insideSales.statusFoundInAudit')}
                              </span>
                            ) : (
                              <span className="isc-action-badge" style={{ background: '#f1f5f9', color: '#64748b' }}>
                                {t('adminTools.insideSales.statusNotInAudit')}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: '#64748b', fontStyle: 'italic', marginTop: '12px' }}>
                {t('adminTools.insideSales.noAgreements')}
              </p>
            )}
          </div>
        </div>
      )}

      {}
      <div className="isc-info-card">
        <h4>{t('adminTools.insideSales.howItWorks')}</h4>
        <ul>
          <li>{t('adminTools.insideSales.howItWorks1')}</li>
          <li>{t('adminTools.insideSales.howItWorks2')}</li>
          <li>{t('adminTools.insideSales.howItWorks3')}</li>
          <li><Trans i18nKey="adminTools.insideSales.howItWorks4" components={{ 1: <strong /> }} /></li>
          <li><Trans i18nKey="adminTools.insideSales.howItWorks5" components={{ 1: <strong /> }} /></li>
        </ul>
      </div>
    </div>
  );
};

export default InsideSalesCheckTab;
