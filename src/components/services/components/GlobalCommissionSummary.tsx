import React, { useState } from 'react';
import { useGlobalCommission } from '../hooks/useServiceCommission';
import { useAccountTypeDetection } from '../hooks/useAccountTypeDetection';
import { useServicesContext, QuotaLevel, QUOTA_COMMISSION_RATES } from '../ServicesContext';
import type { AccountType } from '../../../backendservice/api/accountTypeApi';
import './GlobalCommissionSummary.css';

const ACCOUNT_TYPE_COLORS: Record<AccountType, { bg: string; text: string }> = {
  Anchor: { bg: '#fef3c7', text: '#92400e' },
  Bread5: { bg: '#d1fae5', text: '#065f46' },
  Bread15: { bg: '#dbeafe', text: '#1e40af' },
  Pit: { bg: '#fee2e2', text: '#991b1b' },
};

const QUOTA_LEVEL_DISPLAY: Record<QuotaLevel, { label: string; color: string; bgColor: string }> = {
  below: { label: 'Below Quota', color: '#dc2626', bgColor: '#fee2e2' },
  above: { label: 'Above Quota', color: '#059669', bgColor: '#d1fae5' },
  double: { label: 'Double Quota', color: '#7c3aed', bgColor: '#ede9fe' },
};

const QUOTA_TIER_LEVEL_COLOR: Record<'below' | 'above' | 'double', string> = {
  below: '#dc2626',
  above: '#059669',
  double: '#7c3aed',
};

function fmtMoney(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n || 0);
}

interface GlobalCommissionSummaryProps {
  showDetectButton?: boolean;
}

export function GlobalCommissionSummary({
  showDetectButton = true,
}: GlobalCommissionSummaryProps) {
  const [expanded, setExpanded] = useState(false);
  const [expandedServices, setExpandedServices] = useState<Record<number, boolean>>({});

  const { quotaLevel, quotaLevelData, baseCommissionRate, isRouteStarMapped } = useServicesContext();
  const commissionRate = baseCommissionRate;

  const global = useGlobalCommission(commissionRate);
  const { detectAccountTypes, isDetecting, error, isCompanyMapped } = useAccountTypeDetection();

  const quotaDisplay = QUOTA_LEVEL_DISPLAY[quotaLevel];

  const blendedQuotaRate =
    global.agreementMultiplier > 0
      ? global.effectiveCommissionRate / (global.agreementMultiplier / 100)
      : global.effectiveCommissionRate;
  const hasTierBreakdown = global.quotaTierBreakdown.some(t => t.quotaCredit > 0);
  const hasCommissionTiers = global.commissionTierBreakdown.some(t => t.base > 0);

  const toggleServiceExpand = (index: number) => {
    setExpandedServices(prev => ({ ...prev, [index]: !prev[index] }));
  };

  if (global.serviceCount === 0) {
    return null;
  }

  // Commission is only calculated / shown / saved when the agreement is connected
  // to Bigin. Otherwise show a message and nothing else.
  if (!isCompanyMapped) {
    return (
      <div className="commission-summary">
        <div className="commission-summary__header">
          <div className="commission-summary__title">
            <span>Commission Summary</span>
          </div>
          {showDetectButton && (
            <button
              className="commission-summary__redetect-btn"
              onClick={() => detectAccountTypes()}
              disabled={isDetecting}
            >
              <span>🔄</span>
              {isDetecting ? 'Connecting…' : 'Connect to Bigin'}
            </button>
          )}
        </div>
        <div className="commission-summary__warning">
          Please connect to Bigin to calculate commission.
        </div>
        {error && <div className="commission-summary__error">{error}</div>}
      </div>
    );
  }

  // Commission/quota only count once this Bigin company is mapped to a RouteStar
  // customer. Until then, don't calculate anything — prompt to map.
  if (!isRouteStarMapped) {
    return (
      <div className="commission-summary">
        <div className="commission-summary__header">
          <div className="commission-summary__title">
            <span>Commission Summary</span>
          </div>
        </div>
        <div className="commission-summary__warning">
          This company isn't mapped to a RouteStar customer yet. Map it under
          Pricing Details → Company Mapping to calculate commission and count it toward quota.
        </div>
        {error && <div className="commission-summary__error">{error}</div>}
      </div>
    );
  }

  return (
    <div className="commission-summary">
      {}
      <div className="commission-summary__header">
        <div className="commission-summary__title">
          <span>Commission Summary</span>
          <span className="commission-summary__service-count">
            ({global.serviceCount} service{global.serviceCount !== 1 ? 's' : ''})
          </span>
          {}
          <span
            className="commission-summary__quota-badge"
            style={{ backgroundColor: quotaDisplay.bgColor, color: quotaDisplay.color }}
          >
            {quotaDisplay.label} ({commissionRate}%)
          </span>
          {isDetecting && (
            <span className="commission-summary__detecting">
              <span className="animate-spin">⏳</span>
              Detecting...
            </span>
          )}
        </div>

        {showDetectButton && isCompanyMapped && !isDetecting && (
          <button
            className="commission-summary__redetect-btn"
            onClick={() => detectAccountTypes()}
          >
            <span>🔄</span>
            Re-detect
          </button>
        )}
      </div>

      {}
      {error && (
        <div className="commission-summary__error">
          {error}
        </div>
      )}

      {}
      {!isCompanyMapped && (
        <div className="commission-summary__warning">
          Connect to Bigin to detect account types automatically
        </div>
      )}

      {}
      <div className="commission-summary__totals">
        <div className="commission-summary__total-item">
          <div className="commission-summary__total-label">Weekly</div>
          <div className="commission-summary__total-value">
            {global.formatted.totalWeeklyCommission}
          </div>
        </div>
        <div className="commission-summary__total-item">
          <div className="commission-summary__total-label">Annual</div>
          <div className="commission-summary__total-value">
            {global.formatted.totalAnnualCommission}
          </div>
        </div>

        {}
        <button
          className="commission-summary__toggle-btn"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Hide Details' : 'Show Details'}
          <span style={{ fontSize: '10px' }}>{expanded ? '▲' : '▼'}</span>
        </button>
      </div>

      {global.quotaTierBreakdown.length > 0 && (
        <div
          style={{
            margin: '12px 0',
            padding: '12px',
            borderRadius: '8px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
          }}
        >
          <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '6px' }}>
            Quota Tier Breakdown
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px' }}>
            This agreement adds {fmtMoney(global.totalQuotaCredit)} of quota credit on top of{' '}
            {fmtMoney(global.priorQuotaCredit)} already earned this week (weekly target{' '}
            {fmtMoney(global.quotaTarget)}). It is split across rate tiers as:
          </div>
          {global.quotaTierBreakdown
            .filter(tier => tier.quotaCredit > 0)
            .map(tier => (
              <div
                key={tier.level}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '4px 0',
                  fontSize: '12px',
                  borderBottom: '1px dashed #e2e8f0',
                }}
              >
                <span style={{ color: QUOTA_TIER_LEVEL_COLOR[tier.level], fontWeight: 600 }}>
                  {tier.label} @ {tier.rate}%
                </span>
                <span style={{ color: '#334155' }}>
                  {fmtMoney(tier.quotaCredit)} × {tier.rate}% = {fmtMoney(tier.commission)}
                </span>
              </div>
            ))}
        </div>
      )}

      {}
      {expanded && (
        <div className="commission-summary__expanded">
          {}
          <div className="commission-summary__breakdown-title">
            Service Breakdown
          </div>

          {global.services.map((service, index) => {
            const colors = service.accountType ? ACCOUNT_TYPE_COLORS[service.accountType] : { bg: '#f3f4f6', text: '#6b7280' };
            const serviceShare =
              global.totalCommissionableRevenue > 0
                ? service.commissionableRevenue / global.totalCommissionableRevenue
                : 0;
            const isServiceExpanded = expandedServices[index] || false;

            return (
              <div key={index} className="service-row">
                {}
                <div
                  className="service-row__header"
                  onClick={() => toggleServiceExpand(index)}
                >
                  <div className="service-row__info">
                    <span className="service-row__expand-icon">
                      {isServiceExpanded ? '▼' : '▶'}
                    </span>
                    <span className="service-row__name">
                      {service.serviceName}
                    </span>
                    {service.accountType && (
                      <span
                        className="service-row__badge"
                        style={{ backgroundColor: colors.bg, color: colors.text }}
                      >
                        {service.accountType}
                      </span>
                    )}
                    <span className="service-row__frequency">
                      {service.frequencyLabel}
                    </span>
                  </div>
                  <div className="service-row__commissions">
                    <div className="service-row__commission-item">
                      <div className="service-row__commission-label">Weekly</div>
                      <div className="service-row__commission-value">
                        {service.formatted.weeklyCommission}
                      </div>
                    </div>
                    <div className="service-row__commission-item">
                      <div className="service-row__commission-label">Annual</div>
                      <div className="service-row__commission-value">
                        {service.formatted.annualCommission}
                      </div>
                    </div>
                  </div>
                </div>

                {}
                {isServiceExpanded && (
                  <div className="service-details">
                    {}
                    <div className="service-details__section">
                      <div className="service-details__section-title">
                        Revenue Calculation
                      </div>
                      <div className="service-details__list">
                        <div className="service-details__row">
                          <span className="service-details__label">Original Annual (Redline):</span>
                          <span className="service-details__value">{service.formatted.annualOriginalRevenue}</span>
                        </div>
                        <div className="service-details__row">
                          <span className="service-details__label">Current Annual Revenue:</span>
                          <span className="service-details__value">{service.formatted.perVisitRevenue}</span>
                        </div>

                        {}
                        <div className="service-details__row">
                          <span className="service-details__label">
                            Price Ratio (Current ÷ Redline):
                          </span>
                          <span className="service-details__value">{service.formatted.priceRatio}</span>
                        </div>
                        <div className="service-details__row">
                          <span className="service-details__label">Pricing Tier:</span>
                          <span
                            className="service-details__value"
                            style={{ fontWeight: 600 }}
                          >
                            {service.pricingTierLabel}
                          </span>
                        </div>
                        <div className="service-details__row">
                          <span className="service-details__label">
                            Pricing Multiplier:
                          </span>
                          <span
                            className={`service-details__value${
                              service.pricingMultiplier > 1
                                ? ' service-details__value--green'
                                : service.pricingMultiplier < 1
                                ? ' service-details__value--red'
                                : ''
                            }`}
                          >
                            {service.formatted.pricingMultiplier}
                          </span>
                        </div>
                        {service.pricingMultiplier !== 1 && (
                          <div className="service-details__row">
                            <span className="service-details__label">
                              Adjusted Annual ({service.formatted.perVisitRevenue} × {service.formatted.pricingMultiplier}):
                            </span>
                            <span className="service-details__value">
                              {service.formatted.adjustedAnnualRevenue}
                            </span>
                          </div>
                        )}

                        {service.revenueDeduction > 0 && (
                          <div className="service-details__row">
                            <span className="service-details__label">
                              Account Type Deduction ({service.accountType}: {fmtMoney(service.visitsPerYear > 0 ? service.revenueDeduction / service.visitsPerYear : 0)}/visit × {service.visitsPerYear} visits):
                            </span>
                            <span className="service-details__value service-details__value--red">
                              -{service.formatted.revenueDeduction}
                            </span>
                          </div>
                        )}

                        {service.anchorBonus > 0 && (
                          <div className="service-details__row">
                            <span className="service-details__label">Anchor Bonus (150% on excess over $200):</span>
                            <span className="service-details__value service-details__value--green">
                              +${service.anchorBonus.toFixed(2)}
                            </span>
                          </div>
                        )}

                        <div className="service-details__row service-details__total-row">
                          <span className="service-details__total-label">Commissionable Revenue:</span>
                          <span className="service-details__total-value">{service.formatted.commissionableRevenue}</span>
                        </div>
                      </div>
                    </div>

                    {}
                    <div className="service-details__section">
                      <div className="service-details__section-title">
                        Commission Rate Calculation
                      </div>
                      <div className="service-details__list">
                        {hasCommissionTiers ? (
                          global.commissionTierBreakdown
                            .filter(tier => tier.base > 0)
                            .map(tier => (
                              <div className="service-details__row" key={tier.level}>
                                <span className="service-details__label">{tier.label} Rate:</span>
                                <span
                                  className="service-details__value"
                                  style={{ color: QUOTA_TIER_LEVEL_COLOR[tier.level], fontWeight: 600 }}
                                >
                                  {tier.rate}% × {global.agreementMultiplier}% = {tier.effectiveRate.toFixed(2)}%
                                </span>
                              </div>
                            ))
                        ) : (
                          <>
                            <div className="service-details__row">
                              <span className="service-details__label">
                                Base Commission Rate ({quotaDisplay.label}):
                              </span>
                              <span
                                className="service-details__value"
                                style={{ color: quotaDisplay.color, fontWeight: 600 }}
                              >
                                {commissionRate}%
                              </span>
                            </div>
                            <div className="service-details__row service-details__total-row">
                              <span className="service-details__total-label">
                                Effective Rate ({commissionRate}% × {global.agreementMultiplier}%):
                              </span>
                              <span className="service-details__total-value service-details__value--blue">
                                {global.effectiveCommissionRate.toFixed(2)}%
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {}
                    <div className="service-details__section">
                      <div className="service-details__section-title">
                        Commission Calculation
                      </div>
                      <div className="service-details__list service-details__list--green">
                        {hasCommissionTiers ? (
                          global.commissionTierBreakdown
                            .filter(tier => tier.base > 0)
                            .map(tier => {
                              const tierBase = tier.base * serviceShare;
                              const tierCommission = tier.commission * serviceShare;
                              return (
                                <div className="service-details__row" key={tier.level}>
                                  <span className="service-details__label">
                                    {tier.label} ({fmtMoney(tierBase)} × {tier.effectiveRate.toFixed(2)}%):
                                  </span>
                                  <span
                                    className="service-details__value"
                                    style={{ color: QUOTA_TIER_LEVEL_COLOR[tier.level], fontWeight: 600 }}
                                  >
                                    {fmtMoney(tierCommission)}
                                  </span>
                                </div>
                              );
                            })
                        ) : (
                          <div className="service-details__row">
                            <span className="service-details__label">
                              Per-Visit Commission ({service.formatted.commissionableRevenue} × {global.effectiveCommissionRate.toFixed(2)}%):
                            </span>
                            <span className="service-details__value service-details__value--green">
                              {service.formatted.perVisitCommission}
                            </span>
                          </div>
                        )}

                        <div className="service-details__row service-details__total-row">
                          <span className="service-details__total-label">
                            Annual Commission{hasCommissionTiers ? ' (sum of tiers)' : ''}:
                          </span>
                          <span className="service-details__total-value service-details__value--green">
                            {service.formatted.annualCommission}
                          </span>
                        </div>

                        <div className="service-details__row">
                          <span className="service-details__label">Frequency:</span>
                          <span className="service-details__value">
                            {service.frequencyLabel} ({service.visitsPerYear} visits/year)
                          </span>
                        </div>

                        <div className="service-details__row">
                          <span className="service-details__label">
                            Per-Visit Commission ({service.formatted.annualCommission} ÷ {service.visitsPerYear} visits):
                          </span>
                          <span className="service-details__value service-details__value--green">
                            {service.formatted.perVisitCommission}
                          </span>
                        </div>

                        <div className="service-details__row">
                          <span className="service-details__label">
                            Weekly Commission ({service.formatted.annualCommission} ÷ 52 weeks):
                          </span>
                          <span className="service-details__total-value service-details__value--green">
                            {service.formatted.weeklyCommission}
                          </span>
                        </div>
                      </div>
                    </div>

                    {}
                    {service.accountType && (
                      <div
                        className="service-details__account-info"
                        style={{ backgroundColor: colors.bg, color: colors.text }}
                      >
                        <div className="service-details__account-title">
                          Account Type: {service.accountType}
                        </div>
                        {service.reason && (
                          <div className="service-details__account-reason">
                            {service.reason}
                          </div>
                        )}
                        {service.accountType === 'Anchor' && (
                          <div className="service-details__account-explanation">
                            High-value account ($200+/visit). No deduction + 150% bonus on excess revenue.
                          </div>
                        )}
                        {service.accountType === 'Bread5' && (
                          <div className="service-details__account-explanation">
                            Within 5 min drive to anchor. $50 revenue deduction applied.
                          </div>
                        )}
                        {service.accountType === 'Bread15' && (
                          <div className="service-details__account-explanation">
                            5-15 min drive to anchor. $75 revenue deduction applied.
                          </div>
                        )}
                        {service.accountType === 'Pit' && (
                          <div className="service-details__account-explanation">
                            Over 15 min drive to anchor. $100 revenue deduction applied.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {}
          <div className="commission-summary__rate-footer">
            Rate: {blendedQuotaRate.toFixed(2)}% × {global.agreementMultiplier}% = {global.effectiveCommissionRate.toFixed(2)}%
          </div>
        </div>
      )}

      {}
      {!expanded && (
        <div className="commission-summary__rate-footer">
          Rate: {blendedQuotaRate.toFixed(2)}% × {global.agreementMultiplier}% = {global.effectiveCommissionRate.toFixed(2)}%
        </div>
      )}
    </div>
  );
}

export default GlobalCommissionSummary;
