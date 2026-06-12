import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthContext } from './auth';
import { pdfApi } from '../backendservice/api/pdfApi';
import { quotaApi } from '../backendservice/api/quotaApi';
import './MyCommissions.css';

type QuotaLevel = 'below' | 'above' | 'double';

const QUOTA_LEVEL_CONFIG: Record<QuotaLevel, { label: string; rate: number; color: string; bgColor: string }> = {
  below: { label: 'Below Quota', rate: 3, color: '#dc2626', bgColor: '#fee2e2' },
  above: { label: 'Above Quota', rate: 6, color: '#059669', bgColor: '#d1fae5' },
  double: { label: 'Double Quota', rate: 9, color: '#7c3aed', bgColor: '#ede9fe' },
};

const formatQuotaLevel = (quotaLevel: string | null | undefined): string => {
  if (!quotaLevel) return '';
  const level = quotaLevel.toLowerCase() as QuotaLevel;
  const config = QUOTA_LEVEL_CONFIG[level];
  if (config) {
    return `${config.label} (${config.rate}%)`;
  }
  
  return quotaLevel.charAt(0).toUpperCase() + quotaLevel.slice(1);
};

interface CommissionBreakdown {
  baseRate: number;
  agreementTerm: string;
  multiplier: number;
  accountTypeAdjustment: number;
  greenlineBonus: number;
  insideSalesDeduction: number;
  quotaLevel?: string | null;
}

interface CommissionData {
  rate: number;
  weekly: number;
  monthly: number;
  annual: number;
  total: number;
  breakdown: CommissionBreakdown;
}

interface AgreementCommission {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  startDate: string | null;
  contractMonths: number;
  monthlyValue: number;
  contractValue: number;
  commission: CommissionData;
}

interface CommissionTotals {
  totalAgreements: number;
  totalWeeklyCommission: number;
  totalMonthlyCommission: number;
  totalAnnualCommission: number;
  totalContractCommission: number;
  totalContractValue: number;
  averageCommissionRate: number;
}

interface StatusSummary {
  count: number;
  commission: number;
}

interface CommissionsResponse {
  success: boolean;
  user: string;
  totals: CommissionTotals;
  byStatus: {
    draft: StatusSummary;
    saved: StatusSummary;
    pending: StatusSummary;
    approved: StatusSummary;
    active: StatusSummary;
  };
  commissions: AgreementCommission[];
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft: { bg: '#f3f4f6', text: '#6b7280' },
  saved: { bg: '#dbeafe', text: '#1d4ed8' },
  pending_approval: { bg: '#fef3c7', text: '#92400e' },
  approved_salesman: { bg: '#d1fae5', text: '#065f46' },
  approved_admin: { bg: '#064e3b', text: '#ffffff' },
  active: { bg: '#dcfce7', text: '#16a34a' },
};

const STATUS_I18N_KEYS: Record<string, string> = {
  draft: 'draft',
  saved: 'saved',
  pending_approval: 'pending',
  approved_salesman: 'approved',
  approved_admin: 'adminApproved',
  active: 'active',
};

function formatMoney(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatPercent(value: number): string {
  return value.toFixed(2);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

type TimePeriod = 'all' | 'weekly' | '14days' | 'monthly' | 'quarterly' | 'annually' | 'custom';

const TIME_PERIOD_LABELS: Record<TimePeriod, string> = {
  all: 'All Time',
  weekly: 'This Week',
  '14days': 'Last 14 Days',
  monthly: 'This Month',
  quarterly: 'This Quarter',
  annually: 'This Year',
  custom: 'Date Range',
};

function isWithinTimePeriod(
  dateStr: string | null,
  period: TimePeriod,
  customStartDate?: string | null,
  customEndDate?: string | null
): boolean {
  if (period === 'all') return true;
  if (!dateStr) return false;

  const date = new Date(dateStr);
  const now = new Date();

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (period) {
    case 'weekly': {
      
      const startOfWeek = new Date(startOfToday);
      startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
      return date >= startOfWeek;
    }
    case '14days': {
      const fourteenDaysAgo = new Date(startOfToday);
      fourteenDaysAgo.setDate(startOfToday.getDate() - 14);
      return date >= fourteenDaysAgo;
    }
    case 'monthly': {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return date >= startOfMonth;
    }
    case 'quarterly': {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const startOfQuarter = new Date(now.getFullYear(), currentQuarter * 3, 1);
      return date >= startOfQuarter;
    }
    case 'annually': {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      return date >= startOfYear;
    }
    case 'custom': {
      if (!customStartDate && !customEndDate) return true;
      const startDate = customStartDate ? new Date(customStartDate) : null;
      const endDate = customEndDate ? new Date(customEndDate + 'T23:59:59') : null;

      if (startDate && endDate) {
        return date >= startDate && date <= endDate;
      } else if (startDate) {
        return date >= startDate;
      } else if (endDate) {
        return date <= endDate;
      }
      return true;
    }
    default:
      return true;
  }
}

export default function MyCommissions() {
  const { t } = useTranslation();
  const { user } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CommissionsResponse | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [currentQuotaLevel, setCurrentQuotaLevel] = useState<QuotaLevel>('above');
  const [quotaPercentage, setQuotaPercentage] = useState<number | null>(null);
  const [quotaTarget, setQuotaTarget] = useState<number | null>(null);
  const [actualSales, setActualSales] = useState<number | null>(null);
  const [quotaLoading, setQuotaLoading] = useState(true);

  useEffect(() => {
    async function fetchQuotaLevel() {
      if (!user?.username) {
        setQuotaLoading(false);
        return;
      }
      try {
        console.log('[MyCommissions] Fetching quota for:', user.username);
        const result = await quotaApi.getCurrentLevel(user.username);
        console.log('[MyCommissions] Quota result:', result);
        if (result) {
          setCurrentQuotaLevel((result.quotaLevel as QuotaLevel) || 'above');
          setQuotaPercentage(result.quotaPercentage || 0);
          setQuotaTarget(result.quotaTarget || null);
          setActualSales(result.actualSales || null);
        }
      } catch (err) {
        console.error('Failed to fetch quota level:', err);
      } finally {
        setQuotaLoading(false);
      }
    }
    fetchQuotaLevel();
  }, [user?.username]);

  useEffect(() => {
    async function fetchCommissions() {
      try {
        setLoading(true);
        setError(null);
        const response = await pdfApi.getUserCommissions();
        setData(response);
      } catch (err: any) {
        setError(err.message || t('commissions.fetchError'));
      } finally {
        setLoading(false);
      }
    }
    fetchCommissions();
  }, []);

  const filteredCommissions = useMemo(() => {
    if (!data?.commissions) return [];

    return data.commissions.filter(c => {
      
      let statusMatch = true;
      if (statusFilter !== 'all') {
        if (statusFilter === 'approved') {
          statusMatch = c.status === 'approved_salesman' || c.status === 'approved_admin';
        } else {
          statusMatch = c.status === statusFilter;
        }
      }

      const dateToCheck = c.startDate || c.createdAt;
      const timeMatch = isWithinTimePeriod(dateToCheck, timePeriod, customStartDate, customEndDate);

      return statusMatch && timeMatch;
    });
  }, [data?.commissions, statusFilter, timePeriod, customStartDate, customEndDate]);

  const timeFilteredCommissions = useMemo(() => {
    if (!data?.commissions) return [];

    return data.commissions.filter(c => {
      const dateToCheck = c.startDate || c.createdAt;
      return isWithinTimePeriod(dateToCheck, timePeriod, customStartDate, customEndDate);
    });
  }, [data?.commissions, timePeriod, customStartDate, customEndDate]);

  const filteredByStatus = useMemo(() => {
    const counts: Record<string, { count: number; commission: number }> = {
      draft: { count: 0, commission: 0 },
      saved: { count: 0, commission: 0 },
      pending: { count: 0, commission: 0 },
      approved: { count: 0, commission: 0 },
      active: { count: 0, commission: 0 },
    };

    timeFilteredCommissions.forEach((agreement) => {
      const commission = agreement.commission || {};
      const annualCommission = commission.annual ?? (commission.monthly ? commission.monthly * 12 : 0);

      let statusKey = 'draft';
      if (agreement.status === 'saved') statusKey = 'saved';
      else if (agreement.status === 'pending_approval') statusKey = 'pending';
      else if (agreement.status === 'approved_salesman' || agreement.status === 'approved_admin') statusKey = 'approved';
      else if (agreement.status === 'active' || agreement.status === 'finalized') statusKey = 'active';

      counts[statusKey].count += 1;
      counts[statusKey].commission += annualCommission;
    });

    return counts;
  }, [timeFilteredCommissions]);

  const filteredTotals = useMemo(() => {
    let totalAnnualCommission = 0;
    let totalMonthlyCommission = 0;
    let totalContractValue = 0;
    let totalRateSum = 0;
    let agreementsWithRate = 0;

    filteredCommissions.forEach((agreement) => {
      const commission = agreement.commission || {};
      const annualCommission = commission.annual ?? (commission.monthly ? commission.monthly * 12 : 0);
      const monthlyCommission = commission.monthly ?? 0;
      const rate = commission.rate ?? 0;

      totalAnnualCommission += annualCommission;
      totalMonthlyCommission += monthlyCommission;
      totalContractValue += agreement.contractValue || 0;

      if (rate > 0) {
        totalRateSum += rate;
        agreementsWithRate++;
      }
    });

    return {
      totalAgreements: filteredCommissions.length,
      totalAnnualCommission,
      totalMonthlyCommission,
      totalContractValue,
      averageCommissionRate: agreementsWithRate > 0 ? totalRateSum / agreementsWithRate : 0,
    };
  }, [filteredCommissions]);

  if (loading) {
    return (
      <div className="my-commissions">
        <div className="my-commissions__loading">
          <div className="my-commissions__spinner" />
          <p>{t('commissions.loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-commissions">
        <div className="my-commissions__error">
          <h2>{t('commissions.error')}</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="my-commissions">
        <div className="my-commissions__empty">
          <h2>{t('commissions.noData')}</h2>
          <p>{t('commissions.noDataMessage')}</p>
        </div>
      </div>
    );
  }

  const totals: CommissionTotals = data.totals || {
    totalAgreements: 0,
    totalWeeklyCommission: 0,
    totalMonthlyCommission: 0,
    totalAnnualCommission: 0,
    totalContractCommission: 0,
    totalContractValue: 0,
    averageCommissionRate: 0,
  };

  const byStatus = data.byStatus || {
    draft: { count: 0, commission: 0 },
    saved: { count: 0, commission: 0 },
    pending: { count: 0, commission: 0 },
    approved: { count: 0, commission: 0 },
    active: { count: 0, commission: 0 },
  };

  return (
    <div className="my-commissions">
      <header className="my-commissions__header">
        <div className="my-commissions__title-row">
          <h1>{t('commissions.title')}</h1>
          <span className="my-commissions__user-badge">
            {user?.fullName || user?.username}
          </span>
          {}
          {!quotaLoading && (
            <span
              className="my-commissions__quota-badge"
              style={{
                backgroundColor: QUOTA_LEVEL_CONFIG[currentQuotaLevel].bgColor,
                color: QUOTA_LEVEL_CONFIG[currentQuotaLevel].color,
              }}
              title={t('commissions.quotaBadgeTitle', {
                actual: actualSales !== null ? formatMoney(actualSales) : '—',
                target: quotaTarget !== null ? formatMoney(quotaTarget) : '—',
                rate: QUOTA_LEVEL_CONFIG[currentQuotaLevel].rate,
              })}
            >
              {t(`commissions.quotaLevel.${currentQuotaLevel}`)} ({QUOTA_LEVEL_CONFIG[currentQuotaLevel].rate}%)
              {quotaPercentage !== null && (
                <span className="my-commissions__quota-pct">
                  · {quotaPercentage.toFixed(0)}%
                </span>
              )}
            </span>
          )}
        </div>
        <p className="my-commissions__subtitle">
          {t('commissions.subtitle')}
        </p>
        <p className="my-commissions__rate-note">
          {t('commissions.rateNote', { rate: QUOTA_LEVEL_CONFIG[currentQuotaLevel].rate })}
          {actualSales !== null && quotaTarget !== null && (
            <>{t('commissions.rateNoteMonth', { actual: formatMoney(actualSales), target: formatMoney(quotaTarget) })}</>
          )}
        </p>
      </header>

      {/* Time Period Filter Tabs */}
      <div className="my-commissions__time-filter">
        <div className="my-commissions__time-tabs">
          {(Object.keys(TIME_PERIOD_LABELS) as TimePeriod[]).map((period) => (
            <button
              key={period}
              className={`my-commissions__time-tab ${timePeriod === period ? 'active' : ''}`}
              onClick={() => setTimePeriod(period)}
            >
              {t(`commissions.timePeriod.${period}`)}
            </button>
          ))}
        </div>

        {/* Custom Date Range Inputs */}
        {timePeriod === 'custom' && (
          <div className="my-commissions__date-range">
            <div className="my-commissions__date-input-group">
              <label>{t('commissions.dateRange.from')}</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="my-commissions__date-input"
              />
            </div>
            <span className="my-commissions__date-separator">{t('commissions.dateRange.separator')}</span>
            <div className="my-commissions__date-input-group">
              <label>{t('commissions.dateRange.to')}</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="my-commissions__date-input"
              />
            </div>
            {(customStartDate || customEndDate) && (
              <button
                className="my-commissions__date-clear"
                onClick={() => {
                  setCustomStartDate('');
                  setCustomEndDate('');
                }}
              >
                {t('commissions.dateRange.clear')}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="my-commissions__summary-grid">
        <div className="my-commissions__summary-card my-commissions__summary-card--primary">
          <div className="my-commissions__summary-icon">$</div>
          <div className="my-commissions__summary-content">
            <span className="my-commissions__summary-label">{t('commissions.summary.annualCommission')}</span>
            <span className="my-commissions__summary-value">
              {formatMoney(filteredTotals.totalAnnualCommission)}
            </span>
          </div>
        </div>

        <div className="my-commissions__summary-card">
          <div className="my-commissions__summary-icon">M</div>
          <div className="my-commissions__summary-content">
            <span className="my-commissions__summary-label">{t('commissions.summary.monthlyCommission')}</span>
            <span className="my-commissions__summary-value">
              {formatMoney(filteredTotals.totalMonthlyCommission)}
            </span>
          </div>
        </div>

        <div className="my-commissions__summary-card">
          <div className="my-commissions__summary-icon">#</div>
          <div className="my-commissions__summary-content">
            <span className="my-commissions__summary-label">{t('commissions.summary.totalAgreements')}</span>
            <span className="my-commissions__summary-value">
              {filteredTotals.totalAgreements}
            </span>
          </div>
        </div>

        <div className="my-commissions__summary-card">
          <div className="my-commissions__summary-icon">%</div>
          <div className="my-commissions__summary-content">
            <span className="my-commissions__summary-label">{t('commissions.summary.avgCommissionRate')}</span>
            <span className="my-commissions__summary-value">
              {formatPercent(filteredTotals.averageCommissionRate)}%
            </span>
          </div>
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="my-commissions__status-breakdown">
        <h3>{t('commissions.status.title')}</h3>
        <div className="my-commissions__status-chips">
          <button
            className={`my-commissions__status-chip ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            {t('commissions.status.all', { count: timeFilteredCommissions.length })}
          </button>
          {Object.entries(filteredByStatus).map(([key, value]) => (
            value.count > 0 && (
              <button
                key={key}
                className={`my-commissions__status-chip ${statusFilter === key ? 'active' : ''}`}
                onClick={() => setStatusFilter(key)}
              >
                {t(`commissions.status.${key}`)} ({value.count})
                <span className="my-commissions__chip-amount">
                  {formatMoney(value.commission)}
                </span>
              </button>
            )
          ))}
        </div>
      </div>

      {/* Agreements List */}
      <div className="my-commissions__list">
        <h3>{t('commissions.agreements', { count: filteredCommissions.length })}</h3>

        {filteredCommissions.length === 0 ? (
          <div className="my-commissions__no-results">
            <p>{t('commissions.noResults')}</p>
          </div>
        ) : (
          <div className="my-commissions__agreements">
            {filteredCommissions.map((agreement) => {
              const statusStyle = STATUS_COLORS[agreement.status] || STATUS_COLORS.draft;
              const isExpanded = expandedId === agreement.id;

              // Safe access to commission data with defaults
              const commission = agreement.commission || {};
              const breakdown = commission.breakdown || {};
              const annualCommission = commission.annual ?? (commission.monthly ? commission.monthly * 12 : 0);
              const rate = commission.rate ?? 0;
              const monthly = commission.monthly ?? 0;

              return (
                <div
                  key={agreement.id}
                  className={`my-commissions__agreement ${isExpanded ? 'expanded' : ''}`}
                >
                  <div
                    className="my-commissions__agreement-header"
                    onClick={() => setExpandedId(isExpanded ? null : agreement.id)}
                  >
                    <div className="my-commissions__agreement-info">
                      <h4 className="my-commissions__agreement-title">{agreement.title}</h4>
                      <div className="my-commissions__agreement-meta">
                        <span
                          className="my-commissions__status-badge"
                          style={{
                            backgroundColor: statusStyle.bg,
                            color: statusStyle.text
                          }}
                        >
                          {STATUS_I18N_KEYS[agreement.status] ? t(`commissions.status.${STATUS_I18N_KEYS[agreement.status]}`) : agreement.status}
                        </span>
                        <span className="my-commissions__meta-sep">·</span>
                        <span>{t('commissions.months', { count: agreement.contractMonths })}</span>
                        <span className="my-commissions__meta-sep">·</span>
                        <span>{formatDate(agreement.createdAt)}</span>
                      </div>
                    </div>

                    <div className="my-commissions__agreement-amounts">
                      <div className="my-commissions__amount-item">
                        <span className="my-commissions__amount-label">{t('commissions.contractValue')}</span>
                        <span className="my-commissions__amount-value">
                          {formatMoney(agreement.contractValue)}
                        </span>
                      </div>
                      <div className="my-commissions__amount-item my-commissions__amount-item--commission">
                        <span className="my-commissions__amount-label">{t('commissions.annualCommissionLabel')}</span>
                        <span className="my-commissions__amount-value">
                          {formatMoney(annualCommission)}
                        </span>
                        <span className="my-commissions__rate-badge">
                          {formatPercent(rate)}%
                        </span>
                      </div>
                    </div>

                    <div className="my-commissions__expand-icon">
                      {isExpanded ? '−' : '+'}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="my-commissions__agreement-details">
                      <div className="my-commissions__breakdown">
                        <h5>{t('commissions.breakdown.title')}</h5>
                        <div className="my-commissions__breakdown-grid">
                          <div className="my-commissions__breakdown-item">
                            <span>{t('commissions.breakdown.monthlyValue')}</span>
                            <span>{formatMoney(agreement.monthlyValue)}</span>
                          </div>
                          <div className="my-commissions__breakdown-item">
                            <span>{t('commissions.breakdown.baseRate', { term: breakdown.agreementTerm || t('commissions.months', { count: agreement.contractMonths }) })}</span>
                            <span>{formatPercent(breakdown.baseRate ?? rate)}%</span>
                          </div>
                          {breakdown.quotaLevel && (
                            <div className={`my-commissions__breakdown-item my-commissions__breakdown-item--quota my-commissions__breakdown-item--quota-${breakdown.quotaLevel.toLowerCase().replace(/\s+/g, '-')}`}>
                              <span>{t('commissions.breakdown.quotaLevel')}</span>
                              <span>{QUOTA_LEVEL_CONFIG[breakdown.quotaLevel.toLowerCase() as QuotaLevel] ? `${t(`commissions.quotaLevel.${breakdown.quotaLevel.toLowerCase()}`)} (${QUOTA_LEVEL_CONFIG[breakdown.quotaLevel.toLowerCase() as QuotaLevel].rate}%)` : formatQuotaLevel(breakdown.quotaLevel)}</span>
                            </div>
                          )}
                          <div className="my-commissions__breakdown-item">
                            <span>{t('commissions.breakdown.multiplier')}</span>
                            <span>{formatPercent(breakdown.multiplier ?? 100)}%</span>
                          </div>
                          {(breakdown.accountTypeAdjustment ?? 0) !== 0 && (
                            <div className="my-commissions__breakdown-item">
                              <span>{t('commissions.breakdown.accountTypeAdjustment')}</span>
                              <span>{(breakdown.accountTypeAdjustment ?? 0) > 0 ? '+' : ''}{formatPercent(breakdown.accountTypeAdjustment ?? 0)}%</span>
                            </div>
                          )}
                          {(breakdown.greenlineBonus ?? 0) > 0 && (
                            <div className="my-commissions__breakdown-item my-commissions__breakdown-item--bonus">
                              <span>{t('commissions.breakdown.greenlineBonus')}</span>
                              <span>+{formatPercent(breakdown.greenlineBonus ?? 0)}%</span>
                            </div>
                          )}
                          {(breakdown.insideSalesDeduction ?? 0) !== 0 && (
                            <div className="my-commissions__breakdown-item my-commissions__breakdown-item--deduction">
                              <span>{t('commissions.breakdown.insideSalesDeduction')}</span>
                              <span>{formatPercent(breakdown.insideSalesDeduction ?? 0)}%</span>
                            </div>
                          )}
                          <div className="my-commissions__breakdown-item my-commissions__breakdown-item--total">
                            <span>{t('commissions.breakdown.finalRate')}</span>
                            <span>{formatPercent(rate)}%</span>
                          </div>
                          <div className="my-commissions__breakdown-item my-commissions__breakdown-item--total">
                            <span>{t('commissions.breakdown.monthlyCommission')}</span>
                            <span>{formatMoney(monthly)}</span>
                          </div>
                          <div className="my-commissions__breakdown-item my-commissions__breakdown-item--total">
                            <span>{t('commissions.breakdown.annualCommission')}</span>
                            <span>{formatMoney(annualCommission)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
