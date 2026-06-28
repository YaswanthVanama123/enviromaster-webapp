import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaSync, FaHourglassHalf, FaChevronDown, FaChevronRight } from 'react-icons/fa';
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

function fmtMoney2(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n || 0);
}

interface GlobalCommissionSummaryProps {
  showDetectButton?: boolean;
  addedToPayroll?: boolean;
  payrollPeriodLabel?: string;
}

export function GlobalCommissionSummary({
  showDetectButton = true,
  addedToPayroll = false,
  payrollPeriodLabel,
}: GlobalCommissionSummaryProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [expandedServices, setExpandedServices] = useState<Record<number, boolean>>({});

  const { quotaLevel, quotaLevelData, baseCommissionRate, isRouteStarMapped, isNewLocation, setIsNewLocation, isLocationTypeAuto } = useServicesContext();
  const commissionRate = baseCommissionRate;

  const global = useGlobalCommission(commissionRate);
  const { detectAccountTypes, isDetecting, error, isCompanyMapped } = useAccountTypeDetection();

  const quotaDisplay = QUOTA_LEVEL_DISPLAY[quotaLevel];
  const quotaLabel = t(`serviceComponents.commissionSummary.quota.${quotaLevel}`);
  const quotaLevelRate =
    global.commissionTierBreakdown.find(t => t.level === quotaLevel)?.rate ?? commissionRate;

  const blendedQuotaRate =
    global.agreementMultiplier > 0
      ? global.effectiveCommissionRate / (global.agreementMultiplier / 100)
      : global.effectiveCommissionRate;
  const hasTierBreakdown = global.quotaTierBreakdown.some(t => t.quotaCredit > 0);
  const hasCommissionTiers = global.commissionTierBreakdown.some(t => t.base > 0);

  const displayItems = global.groups.map(g => ({
    serviceName: g.serviceNames.join(', '),
    accountType: g.accountType,
    reason: null as string | null,
    farTiers: g.farTiers,
    commissionTiers: g.commissionTiers,
    priceRatio: g.priceRatio,
    pricingMultiplier: g.pricingMultiplier,
    pricingTierLabel: g.pricingTierLabel,
    visitsPerYear: g.visitsPerYear,
    revenueDeduction: g.revenueDeduction,
    commissionableRevenue: g.commissionableRevenue,
    anchorBonus: g.anchorBonus,
    frequencyLabel: g.frequencyLabel,
    formatted: {
      weeklyCommission: fmtMoney2(g.weeklyCommission),
      annualCommission: fmtMoney2(g.annualCommission),
      priceRatio: `${(g.priceRatio * 100).toFixed(1)}%`,
      pricingMultiplier: `${g.pricingMultiplier.toFixed(2)}×`,
      commissionableRevenue: fmtMoney2(g.commissionableRevenue),
      annualOriginalRevenue: fmtMoney2(g.annualOriginalRevenue),
      perVisitRevenue: fmtMoney2(g.perVisitRevenue),
      adjustedAnnualRevenue: fmtMoney2(g.perVisitRevenue * g.pricingMultiplier),
      revenueDeduction: fmtMoney2(g.revenueDeduction),
      perVisitCommission: fmtMoney2(g.perVisitCommission),
    },
  }));

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
            <span>{t("serviceComponents.commissionSummary.title")}</span>
          </div>
          {showDetectButton && (
            <button
              className="commission-summary__redetect-btn"
              onClick={() => detectAccountTypes()}
              disabled={isDetecting}
            >
              <span><FaSync /></span>
              {isDetecting ? t("serviceComponents.commissionSummary.connecting") : t("serviceComponents.commissionSummary.connectToBigin")}
            </button>
          )}
        </div>
        <div className="commission-summary__warning">
          {t("serviceComponents.commissionSummary.connectToBiginWarning")}
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
            <span>{t("serviceComponents.commissionSummary.title")}</span>
          </div>
        </div>
        <div className="commission-summary__warning">
          {t("serviceComponents.commissionSummary.notMappedWarning")}
        </div>
        {error && <div className="commission-summary__error">{error}</div>}
      </div>
    );
  }

  return (
    <div className="commission-summary">
      {addedToPayroll && (
        <div
          style={{
            background: "#ede9fe",
            color: "#5b21b6",
            border: "1px solid #c4b5fd",
            borderRadius: 8,
            padding: "10px 14px",
            marginBottom: 12,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          🔒 This agreement is already in payroll{payrollPeriodLabel ? ` (${payrollPeriodLabel})` : ""}. Changing it now will not change the payroll amount.
        </div>
      )}
      {}
      <div className="commission-summary__header">
        <div className="commission-summary__title">
          <span>{t("serviceComponents.commissionSummary.title")}</span>
          <span className="commission-summary__service-count">
            {t("serviceComponents.commissionSummary.serviceCount", { count: global.serviceCount })}
          </span>
          {}
          <span
            className="commission-summary__quota-badge"
            style={{ backgroundColor: quotaDisplay.bgColor, color: quotaDisplay.color }}
          >
            {t("serviceComponents.commissionSummary.quotaBadge", { label: quotaLabel, rate: quotaLevelRate })}
          </span>
          {isDetecting && (
            <span className="commission-summary__detecting">
              <span className="animate-spin"><FaHourglassHalf /></span>
              {t("serviceComponents.commissionSummary.detecting")}
            </span>
          )}
        </div>

        {showDetectButton && isCompanyMapped && !isDetecting && (
          <button
            className="commission-summary__redetect-btn"
            onClick={() => detectAccountTypes()}
          >
            <span><FaSync /></span>
            {t("serviceComponents.commissionSummary.redetect")}
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
      <label className="commission-summary__newloc">
        <input
          type="checkbox"
          checked={isNewLocation}
          disabled={isLocationTypeAuto}
          onChange={(e) => setIsNewLocation(e.target.checked)}
        />
        <span className="commission-summary__newloc-text">
          <span className="commission-summary__newloc-title">{t("serviceComponents.commissionSummary.newLocationTitle")}</span>
          <span className="commission-summary__newloc-hint">
            {isLocationTypeAuto
              ? `Auto-detected from Bigin pipelines: ${isNewLocation ? "New location" : "Existing location"}`
              : t("serviceComponents.commissionSummary.newLocationHint")}
          </span>
        </span>
      </label>

      {}
      <div className="commission-summary__totals">
        <div className="commission-summary__total-item">
          <div className="commission-summary__total-label">{t("serviceComponents.commissionSummary.weekly")}</div>
          <div className="commission-summary__total-value">
            {global.formatted.totalWeeklyCommission}
          </div>
        </div>
        <div className="commission-summary__total-item">
          <div className="commission-summary__total-label">{t("serviceComponents.commissionSummary.annual")}</div>
          <div className="commission-summary__total-value">
            {global.formatted.totalAnnualCommission}
          </div>
        </div>

        {}
        <button
          className="commission-summary__toggle-btn"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? t("serviceComponents.commissionSummary.hideDetails") : t("serviceComponents.commissionSummary.showDetails")}
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
            {t("serviceComponents.commissionSummary.quotaTierBreakdown")}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px' }}>
            {t("serviceComponents.commissionSummary.quotaCreditIntro", {
              credit: fmtMoney(global.totalQuotaCredit),
              prior: fmtMoney(global.priorQuotaCredit),
              target: fmtMoney(global.quotaTarget),
            })}
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
                  {t("serviceComponents.commissionSummary.tierAtRate", { label: t(`serviceComponents.commissionSummary.quota.${tier.level}`), rate: tier.rate })}
                </span>
                <span style={{ color: '#334155' }}>
                  {t("serviceComponents.commissionSummary.tierCalc", { credit: fmtMoney(tier.quotaCredit), rate: tier.rate, commission: fmtMoney(tier.commission) })}
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
            {t("serviceComponents.commissionSummary.serviceBreakdown")}
          </div>

          {displayItems.map((service, index) => {
            const colors = service.accountType ? ACCOUNT_TYPE_COLORS[service.accountType] : { bg: '#f3f4f6', text: '#6b7280' };
            const serviceTiers = (service.commissionTiers || []).filter(tier => tier.base > 0);
            const hasServiceTiers = serviceTiers.length > 0;
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
                      {isServiceExpanded ? <FaChevronDown /> : <FaChevronRight />}
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
                      <div className="service-row__commission-label">{t("serviceComponents.commissionSummary.weekly")}</div>
                      <div className="service-row__commission-value">
                        {service.formatted.weeklyCommission}
                      </div>
                    </div>
                    <div className="service-row__commission-item">
                      <div className="service-row__commission-label">{t("serviceComponents.commissionSummary.annual")}</div>
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
                        {t("serviceComponents.commissionSummary.revenueCalculation")}
                      </div>
                      <div className="service-details__list">
                        {service.farTiers ? (
                          <>
                            <div className="service-details__row">
                              <span className="service-details__label">{t("serviceComponents.commissionSummary.originalPerVisit")}</span>
                              <span className="service-details__value">{fmtMoney2(service.farTiers.originalPerVisit)}</span>
                            </div>
                            <div className="service-details__row">
                              <span className="service-details__label">{t("serviceComponents.commissionSummary.currentPerVisit")}</span>
                              <span className="service-details__value">{fmtMoney2(service.farTiers.currentPerVisit)}</span>
                            </div>
                            <div className="service-details__row">
                              <span className="service-details__label">{t("serviceComponents.commissionSummary.priceRatio")}</span>
                              <span className="service-details__value">{`${(service.farTiers.priceRatio * 100).toFixed(1)}%`}</span>
                            </div>
                            <div className="service-details__row">
                              <span className="service-details__label">{t("serviceComponents.commissionSummary.pricingTier")}</span>
                              <span className="service-details__value" style={{ fontWeight: 600 }}>{service.pricingTierLabel}</span>
                            </div>
                            <div className="service-details__row">
                              <span className="service-details__label">{t("serviceComponents.commissionSummary.pricingMultiplier")}</span>
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
                                  {t("serviceComponents.commissionSummary.adjustedPerVisit", { revenue: fmtMoney2(service.farTiers.currentPerVisit), multiplier: service.formatted.pricingMultiplier })}
                                </span>
                                <span className="service-details__value">{fmtMoney2(service.farTiers.adjustedPerVisit)}</span>
                              </div>
                            )}
                            {service.farTiers.priorPerVisit >= 0 && (
                              <div className="service-details__row">
                                <span className="service-details__label">{t("serviceComponents.commissionSummary.priorSameLocationPerVisit")}</span>
                                <span className="service-details__value">{fmtMoney2(service.farTiers.priorPerVisit)}</span>
                              </div>
                            )}
                            <div className="service-details__row">
                              <span className="service-details__label">{t("serviceComponents.commissionSummary.combinedPerVisit")}</span>
                              <span className="service-details__value" style={{ fontWeight: 600 }}>{fmtMoney2(service.farTiers.combinedPerVisit)}</span>
                            </div>

                            <div className="service-details__row">
                              <span className="service-details__label">
                                {t("serviceComponents.commissionSummary.farTierNoComm", { from: fmtMoney2(0), to: fmtMoney2(service.farTiers.pitThreshold) })}
                              </span>
                              <span className="service-details__value service-details__value--red">
                                {fmtMoney2(0)}/visit
                              </span>
                            </div>
                            {service.farTiers.anchorThreshold > service.farTiers.pitThreshold && (
                              <div className="service-details__row">
                                <span className="service-details__label">
                                  {t("serviceComponents.commissionSummary.farTierNormal", { from: fmtMoney2(service.farTiers.pitThreshold), to: fmtMoney2(service.farTiers.anchorThreshold) })}
                                </span>
                                <span className="service-details__value">
                                  {fmtMoney2(service.farTiers.normalPerVisit)}/visit
                                </span>
                              </div>
                            )}
                            <div className="service-details__row">
                              <span className="service-details__label">
                                {t("serviceComponents.commissionSummary.farTierAnchor", { anchor: fmtMoney2(service.farTiers.anchorThreshold) })}
                              </span>
                              <span className="service-details__value service-details__value--green">
                                {fmtMoney2(service.farTiers.anchorPerVisit)} × 1.5 = {fmtMoney2(service.farTiers.anchorPerVisit * 1.5)}/visit
                              </span>
                            </div>

                            <div className="service-details__row service-details__total-row">
                              <span className="service-details__total-label">{t("serviceComponents.commissionSummary.commissionablePerVisit")}</span>
                              <span className="service-details__total-value">{fmtMoney2(service.farTiers.commissionablePerVisit)}</span>
                            </div>
                            <div className="service-details__row">
                              <span className="service-details__label">
                                {t("serviceComponents.commissionSummary.annualCommissionableFromPerVisit", { perVisit: fmtMoney2(service.farTiers.commissionablePerVisit), visits: service.visitsPerYear })}
                              </span>
                              <span className="service-details__value">{service.formatted.commissionableRevenue}</span>
                            </div>
                          </>
                        ) : (
                          <>
                        <div className="service-details__row">
                          <span className="service-details__label">{t("serviceComponents.commissionSummary.originalAnnualRedline")}</span>
                          <span className="service-details__value">{service.formatted.annualOriginalRevenue}</span>
                        </div>
                        <div className="service-details__row">
                          <span className="service-details__label">{t("serviceComponents.commissionSummary.currentAnnualRevenue")}</span>
                          <span className="service-details__value">{service.formatted.perVisitRevenue}</span>
                        </div>

                        {}
                        <div className="service-details__row">
                          <span className="service-details__label">
                            {t("serviceComponents.commissionSummary.priceRatio")}
                          </span>
                          <span className="service-details__value">{service.formatted.priceRatio}</span>
                        </div>
                        <div className="service-details__row">
                          <span className="service-details__label">{t("serviceComponents.commissionSummary.pricingTier")}</span>
                          <span
                            className="service-details__value"
                            style={{ fontWeight: 600 }}
                          >
                            {service.pricingTierLabel}
                          </span>
                        </div>
                        <div className="service-details__row">
                          <span className="service-details__label">
                            {t("serviceComponents.commissionSummary.pricingMultiplier")}
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
                              {t("serviceComponents.commissionSummary.adjustedAnnual", { revenue: service.formatted.perVisitRevenue, multiplier: service.formatted.pricingMultiplier })}
                            </span>
                            <span className="service-details__value">
                              {service.formatted.adjustedAnnualRevenue}
                            </span>
                          </div>
                        )}

                        {service.revenueDeduction > 0 && (
                          <div className="service-details__row">
                            <span className="service-details__label">
                              {t("serviceComponents.commissionSummary.accountTypeDeduction", { type: service.accountType, perVisit: fmtMoney(service.visitsPerYear > 0 ? service.revenueDeduction / service.visitsPerYear : 0), visits: service.visitsPerYear })}
                            </span>
                            <span className="service-details__value service-details__value--red">
                              -{service.formatted.revenueDeduction}
                            </span>
                          </div>
                        )}

                        {service.anchorBonus > 0 && (
                          <div className="service-details__row">
                            <span className="service-details__label">{t("serviceComponents.commissionSummary.anchorBonus")}</span>
                            <span className="service-details__value service-details__value--green">
                              +${service.anchorBonus.toFixed(2)}
                            </span>
                          </div>
                        )}

                        <div className="service-details__row service-details__total-row">
                          <span className="service-details__total-label">{t("serviceComponents.commissionSummary.commissionableRevenue")}</span>
                          <span className="service-details__total-value">{service.formatted.commissionableRevenue}</span>
                        </div>
                          </>
                        )}
                      </div>
                    </div>

                    {}
                    <div className="service-details__section">
                      <div className="service-details__section-title">
                        {t("serviceComponents.commissionSummary.commissionRateCalculation")}
                      </div>
                      <div className="service-details__list">
                        {hasServiceTiers ? (
                          serviceTiers
                            .map(tier => (
                              <div className="service-details__row" key={tier.level}>
                                <span className="service-details__label">{t("serviceComponents.commissionSummary.tierRate", { label: t(`serviceComponents.commissionSummary.quota.${tier.level}`) })}</span>
                                <span
                                  className="service-details__value"
                                  style={{ color: QUOTA_TIER_LEVEL_COLOR[tier.level], fontWeight: 600 }}
                                >
                                  {t("serviceComponents.commissionSummary.tierRateCalc", { rate: tier.rate, multiplier: global.agreementMultiplier, effective: tier.effectiveRate.toFixed(2) })}
                                </span>
                              </div>
                            ))
                        ) : (
                          <>
                            <div className="service-details__row">
                              <span className="service-details__label">
                                {t("serviceComponents.commissionSummary.baseCommissionRate", { label: quotaLabel })}
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
                                {t("serviceComponents.commissionSummary.effectiveRate", { rate: commissionRate, multiplier: global.agreementMultiplier })}
                              </span>
                              <span className="service-details__total-value service-details__value--blue">
                                {global.effectiveCommissionRate.toFixed(2)}%
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                      <div
                        className="service-details__multiplier-note"
                        style={{
                          display: 'inline-block',
                          marginTop: 8,
                          padding: '6px 12px',
                          fontSize: 12,
                          fontWeight: 600,
                          lineHeight: 1.4,
                          color: '#1d4ed8',
                          background: '#eff6ff',
                          border: '1px solid #bfdbfe',
                          borderRadius: 9999,
                        }}
                      >
                        {t("serviceComponents.commissionSummary.multiplierNote", {
                          multiplier: global.agreementMultiplier,
                          term: t(`serviceComponents.commissionSummary.term.${global.agreementTerm}`),
                        })}
                      </div>
                    </div>

                    {}
                    <div className="service-details__section">
                      <div className="service-details__section-title">
                        {t("serviceComponents.commissionSummary.commissionCalculation")}
                      </div>
                      <div className="service-details__list service-details__list--green">
                        {hasServiceTiers ? (
                          serviceTiers
                            .map(tier => {
                              const tierBase = tier.base;
                              const tierCommission = tier.commission;
                              return (
                                <div className="service-details__row" key={tier.level}>
                                  <span className="service-details__label">
                                    {t("serviceComponents.commissionSummary.tierCommissionLabel", { label: t(`serviceComponents.commissionSummary.quota.${tier.level}`), base: fmtMoney(tierBase), rate: tier.effectiveRate.toFixed(2) })}
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
                              {t("serviceComponents.commissionSummary.perVisitCommissionLabel", { revenue: service.formatted.commissionableRevenue, rate: global.effectiveCommissionRate.toFixed(2) })}
                            </span>
                            <span className="service-details__value service-details__value--green">
                              {service.formatted.perVisitCommission}
                            </span>
                          </div>
                        )}

                        <div className="service-details__row service-details__total-row">
                          <span className="service-details__total-label">
                            {hasCommissionTiers ? t("serviceComponents.commissionSummary.annualCommissionSumOfTiers") : t("serviceComponents.commissionSummary.annualCommission")}
                          </span>
                          <span className="service-details__total-value service-details__value--green">
                            {service.formatted.annualCommission}
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
                          {t("serviceComponents.commissionSummary.accountType", { type: service.accountType })}
                        </div>
                        {service.reason && (
                          <div className="service-details__account-reason">
                            {service.reason}
                          </div>
                        )}
                        {service.accountType === 'Anchor' && (
                          <div className="service-details__account-explanation">
                            {t("serviceComponents.commissionSummary.anchorExplanation")}
                          </div>
                        )}
                        {service.accountType === 'Bread5' && (
                          <div className="service-details__account-explanation">
                            {t("serviceComponents.commissionSummary.bread5Explanation")}
                          </div>
                        )}
                        {service.accountType === 'Bread15' && (
                          <div className="service-details__account-explanation">
                            {t("serviceComponents.commissionSummary.bread15Explanation")}
                          </div>
                        )}
                        {service.accountType === 'Pit' && (
                          <div className="service-details__account-explanation">
                            {t("serviceComponents.commissionSummary.pitExplanation")}
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
            {t("serviceComponents.commissionSummary.rate", { blended: blendedQuotaRate.toFixed(2), multiplier: global.agreementMultiplier, effective: global.effectiveCommissionRate.toFixed(2) })}
          </div>
        </div>
      )}

      {}
      {!expanded && (
        <div className="commission-summary__rate-footer">
          {t("serviceComponents.commissionSummary.rate", { blended: blendedQuotaRate.toFixed(2), multiplier: global.agreementMultiplier, effective: global.effectiveCommissionRate.toFixed(2) })}
        </div>
      )}
    </div>
  );
}

export default GlobalCommissionSummary;
