

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { companyMappingApi, CompanyMapping } from '../../../backendservice/api/companyMappingApi';
import { accountTypeApi, MapboxDetectionResult, DestinationResult } from '../../../backendservice/api/accountTypeApi';
import { getAccountTypeColor, getAccountTypeBgColor } from '../../../backendservice/types/accountType.types';
import { MdSearch, MdDirectionsCar, MdLocationOn, MdBusiness, MdSchedule } from 'react-icons/md';
import './AccountTypeDetectorTab.css';

const FREQUENCY_OPTIONS = [
  { value: '', labelKey: 'adminTools.accountType.frequency.all' },
  { value: '1', labelKey: 'adminTools.accountType.frequency.weekly' },
  { value: '2', labelKey: 'adminTools.accountType.frequency.biWeekly' },
  { value: '3', labelKey: 'adminTools.accountType.frequency.monthly' },
  { value: '14', labelKey: 'adminTools.accountType.frequency.biMonthly' },
  { value: '4', labelKey: 'adminTools.accountType.frequency.quarterly' },
  { value: '5', labelKey: 'adminTools.accountType.frequency.biAnnual' },
  { value: '6', labelKey: 'adminTools.accountType.frequency.annual' },
  { value: '7', labelKey: 'adminTools.accountType.frequency.oneTime' },
];

interface CompanyOption {
  biginId: string;
  biginCompanyName: string;
  routeStarCustomerName: string | null;
}

export const AccountTypeDetectorTab: React.FC = () => {
  const { t } = useTranslation();
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [selectedFrequency, setSelectedFrequency] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [detecting, setDetecting] = useState(false);
  const [result, setResult] = useState<MapboxDetectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCompanies = async () => {
      setLoadingCompanies(true);
      try {
        const response = await companyMappingApi.getAll({ status: 'mapped', limit: 1000 });
        if (response && response.data) {
          const options: CompanyOption[] = response.data.map((m: CompanyMapping) => ({
            biginId: m.biginId,
            biginCompanyName: m.biginCompanyName,
            routeStarCustomerName: m.routeStarCustomerName
          }));
          setCompanies(options);
        }
      } catch (err) {
        console.error('Error fetching companies:', err);
        setError(t('adminTools.accountType.failedToLoadCompanies'));
      } finally {
        setLoadingCompanies(false);
      }
    };

    fetchCompanies();
  }, []);

  const filteredCompanies = useMemo(() => {
    if (!searchTerm) return companies;
    const lower = searchTerm.toLowerCase();
    return companies.filter(
      c => c.biginCompanyName.toLowerCase().includes(lower) ||
           (c.routeStarCustomerName && c.routeStarCustomerName.toLowerCase().includes(lower))
    );
  }, [companies, searchTerm]);

  const handleDetect = async () => {
    if (!selectedCompanyId) {
      setError(t('adminTools.accountType.pleaseSelectCompany'));
      return;
    }

    setDetecting(true);
    setError(null);
    setResult(null);

    try {
      const frequency = selectedFrequency ? parseInt(selectedFrequency, 10) : undefined;
      const detectionResult = await accountTypeApi.detectWithMapbox(selectedCompanyId, frequency);
      setResult(detectionResult);
      if (!detectionResult.success && detectionResult.error) {
        setError(detectionResult.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('adminTools.accountType.detectionFailed'));
    } finally {
      setDetecting(false);
    }
  };

  const selectedCompany = companies.find(c => c.biginId === selectedCompanyId);

  return (
    <div className="account-type-detector-tab">
      <div className="detector-header">
        <h2>{t('adminTools.accountType.title')}</h2>
        <p className="detector-description">
          {t('adminTools.accountType.description')}
        </p>
      </div>

      <div className="detector-controls">
        <div className="company-selector">
          <label htmlFor="company-search">{t('adminTools.accountType.selectBiginCompany')}</label>
          <div className="search-input-wrapper">
            <MdSearch className="search-icon" />
            <input
              type="text"
              id="company-search"
              placeholder={t('adminTools.accountType.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={loadingCompanies}
            />
          </div>
          <select
            value={selectedCompanyId}
            onChange={(e) => {
              setSelectedCompanyId(e.target.value);
              setResult(null);
              setError(null);
            }}
            disabled={loadingCompanies}
            size={Math.min(10, filteredCompanies.length + 1)}
          >
            <option value="">{t('adminTools.accountType.selectACompany')}</option>
            {filteredCompanies.map(company => (
              <option key={company.biginId} value={company.biginId}>
                {company.biginCompanyName}
                {company.routeStarCustomerName && ` → ${company.routeStarCustomerName}`}
              </option>
            ))}
          </select>
          {loadingCompanies && <span className="loading-text">{t('adminTools.accountType.loadingCompanies')}</span>}
        </div>

        <div className="frequency-selector">
          <label htmlFor="frequency-select">
            <MdSchedule className="label-icon" />
            {t('adminTools.accountType.filterByFrequency')}
          </label>
          <select
            id="frequency-select"
            value={selectedFrequency}
            onChange={(e) => {
              setSelectedFrequency(e.target.value);
              setResult(null);
              setError(null);
            }}
            className="frequency-dropdown"
          >
            {FREQUENCY_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {t(opt.labelKey)}
              </option>
            ))}
          </select>
        </div>

        <button
          className="detect-button"
          onClick={handleDetect}
          disabled={!selectedCompanyId || detecting}
        >
          {detecting ? (
            <>
              <span className="spinner"></span>
              {t('adminTools.accountType.detecting')}
            </>
          ) : (
            <>
              <MdDirectionsCar size={20} />
              {t('adminTools.accountType.detectAccountType')}
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="error-message">
          <strong>{t('adminTools.accountType.error')}</strong> {error}
        </div>
      )}

      {result && result.success && (
        <div className="detection-result">
          <div className="result-header">
            <div className="company-info">
              <div className="info-row">
                <MdBusiness className="info-icon" />
                <div>
                  <span className="label">{t('adminTools.accountType.biginCompany')}</span>
                  <span className="value">{result.biginCompany}</span>
                </div>
              </div>
              <div className="info-row">
                <MdLocationOn className="info-icon" />
                <div>
                  <span className="label">{t('adminTools.accountType.mappedTo')}</span>
                  <span className="value">{result.routeStarCustomer}</span>
                </div>
              </div>
              <div className="info-row address-row">
                <span className="label">{t('adminTools.accountType.address')}</span>
                <span className="value">{result.fromAddress || 'N/A'}</span>
              </div>
            </div>
          </div>

          {result.destinations && result.destinations.length > 0 && (
            <div className="destinations-section">
              <h4>{t('adminTools.accountType.nearestDestinations')}</h4>
              <div className="destinations-table">
                <div className="table-header">
                  <span>#</span>
                  <span>{t('adminTools.accountType.colCustomer')}</span>
                  <span>{t('adminTools.accountType.colStoredDistance')}</span>
                  <span>{t('adminTools.accountType.colMapboxDistance')}</span>
                  <span>{t('adminTools.accountType.colDrivingTime')}</span>
                </div>
                {result.destinations.map((dest: DestinationResult, idx: number) => (
                  <div key={idx} className={`table-row ${idx === 0 ? 'nearest' : ''}`}>
                    <span className="row-num">{idx + 1}</span>
                    <span className="dest-name">{dest.destination}</span>
                    <span>{dest.storedDistanceMiles?.toFixed(1) || '-'} {t('adminTools.accountType.miles')}</span>
                    <span>{dest.mapboxDistanceMiles?.toFixed(1) || '-'} {t('adminTools.accountType.miles')}</span>
                    <span className="driving-time">
                      {dest.drivingTimeMinutes ? (
                        <>
                          <MdDirectionsCar className="time-icon" />
                          {dest.drivingTimeMinutes.toFixed(1)} {t('adminTools.accountType.minutes')}
                        </>
                      ) : dest.error || '-'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="account-type-result">
            <div className="result-label">{t('adminTools.accountType.accountTypeLabel')}</div>
            <div
              className="account-type-badge"
              style={{
                backgroundColor: getAccountTypeBgColor(result.accountType || 'Pit'),
                color: getAccountTypeColor(result.accountType || 'Pit')
              }}
            >
              {result.accountType}
            </div>
            <div className="result-reason">
              {result.reason}
            </div>
          </div>

          {result.thresholds && (
            <div className="thresholds-info">
              <span>{t('adminTools.accountType.thresholds', { bread5: result.thresholds.bread5MaxMinutes, bread15: result.thresholds.bread15MaxMinutes })}</span>
            </div>
          )}
        </div>
      )}

      {result && !result.success && !error && (
        <div className="no-result">
          <p>{result.error || t('adminTools.accountType.couldNotDetect')}</p>
          {result.biginCompany && <p>{t('adminTools.accountType.company', { name: result.biginCompany })}</p>}
          {result.routeStarCustomer && <p>{t('adminTools.accountType.mappedTo')} {result.routeStarCustomer}</p>}
        </div>
      )}
    </div>
  );
};

export default AccountTypeDetectorTab;
