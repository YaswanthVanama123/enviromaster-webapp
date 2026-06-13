import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaHourglassHalf, FaExclamationTriangle } from 'react-icons/fa';
import { useServiceCommission } from '../hooks/useServiceCommission';
import type { AccountType } from '../../../backendservice/api/accountTypeApi';

const ACCOUNT_TYPE_COLORS: Record<AccountType, { bg: string; text: string; border: string }> = {
  Anchor: { bg: '#fef3c7', text: '#92400e', border: '#fbbf24' },
  Bread5: { bg: '#d1fae5', text: '#065f46', border: '#34d399' },
  Bread15: { bg: '#dbeafe', text: '#1e40af', border: '#60a5fa' },
  Pit: { bg: '#fee2e2', text: '#991b1b', border: '#f87171' },
};

interface ServiceCommissionBadgeProps {
  serviceData: any;
  showDetails?: boolean;
  commissionRate?: number;
}

export function ServiceCommissionBadge({
  serviceData,
  showDetails = true,
  commissionRate = 6,
}: ServiceCommissionBadgeProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const commission = useServiceCommission({
    serviceData,
    commissionRate,
  });

  if (!serviceData?.isActive || commission.isOneTime) {
    return null;
  }

  if (!commission.accountType) {
    return (
      <div className="commission-badge commission-badge--pending">
        <span className="commission-badge__icon"><FaHourglassHalf /></span>
        <span className="commission-badge__text">{t("serviceComponents.commissionBadge.detecting")}</span>
      </div>
    );
  }

  const colors = ACCOUNT_TYPE_COLORS[commission.accountType];

  const badgeStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 500,
    backgroundColor: colors.bg,
    color: colors.text,
    border: `1px solid ${colors.border}`,
    cursor: showDetails ? 'pointer' : 'default',
  };

  const detailsStyle: React.CSSProperties = {
    marginTop: '8px',
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    fontSize: '12px',
    lineHeight: 1.5,
  };

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '4px',
  };

  const labelStyle: React.CSSProperties = {
    color: '#6b7280',
  };

  const valueStyle: React.CSSProperties = {
    fontWeight: 500,
    color: '#111827',
  };

  return (
    <div className="commission-badge-wrapper" style={{ marginTop: '8px' }}>
      <div
        style={badgeStyle}
        onClick={() => showDetails && setExpanded(!expanded)}
        role={showDetails ? 'button' : undefined}
        tabIndex={showDetails ? 0 : undefined}
      >
        <span>{commission.accountType}</span>
        <span style={{ fontWeight: 600 }}>
          {commission.formatted.perVisitCommission}{t("serviceComponents.commissionBadge.perVisit")}
        </span>
        {showDetails && (
          <span style={{ fontSize: '10px', opacity: 0.7 }}>
            {expanded ? '▲' : '▼'}
          </span>
        )}
      </div>

      {expanded && showDetails && (
        <div style={detailsStyle}>
          <div style={rowStyle}>
            <span style={labelStyle}>{t("serviceComponents.commissionBadge.perVisitRevenue")}</span>
            <span style={valueStyle}>{commission.formatted.perVisitRevenue}</span>
          </div>

          {commission.revenueDeduction > 0 && (
            <div style={rowStyle}>
              <span style={labelStyle}>{t("serviceComponents.commissionBadge.accountTypeDeduction")}</span>
              <span style={{ ...valueStyle, color: '#dc2626' }}>
                -{commission.formatted.revenueDeduction}
              </span>
            </div>
          )}

          {commission.anchorBonus > 0 && (
            <div style={rowStyle}>
              <span style={labelStyle}>{t("serviceComponents.commissionBadge.anchorBonus")}</span>
              <span style={{ ...valueStyle, color: '#059669' }}>
                +${commission.anchorBonus.toFixed(2)}
              </span>
            </div>
          )}

          <div style={rowStyle}>
            <span style={labelStyle}>{t("serviceComponents.commissionBadge.commissionableRevenue")}</span>
            <span style={valueStyle}>{commission.formatted.commissionableRevenue}</span>
          </div>

          <div style={{ ...rowStyle, borderTop: '1px solid #e5e7eb', paddingTop: '4px', marginTop: '4px' }}>
            <span style={labelStyle}>{t("serviceComponents.commissionBadge.commissionRate")}</span>
            <span style={valueStyle}>{commission.commissionRate}%</span>
          </div>

          <div style={rowStyle}>
            <span style={labelStyle}>{t("serviceComponents.commissionBadge.perVisitCommission")}</span>
            <span style={{ ...valueStyle, color: '#059669' }}>
              {commission.formatted.perVisitCommission}
            </span>
          </div>

          <div style={rowStyle}>
            <span style={labelStyle}>{t("serviceComponents.commissionBadge.annualCommission")}</span>
            <span style={{ ...valueStyle, color: '#059669', fontWeight: 600 }}>
              {commission.formatted.annualCommission}
            </span>
          </div>

          <div style={{ ...rowStyle, marginTop: '8px', borderTop: '1px solid #e5e7eb', paddingTop: '8px' }}>
            <span style={labelStyle}>{t("serviceComponents.commissionBadge.frequency")}</span>
            <span style={valueStyle}>
              {t("serviceComponents.commissionBadge.frequencyVisits", { label: commission.frequencyLabel, visits: commission.visitsPerYear })}
            </span>
          </div>

          {commission.drivingTimeMinutes !== null && (
            <div style={rowStyle}>
              <span style={labelStyle}>{t("serviceComponents.commissionBadge.drivingTime")}</span>
              <span style={valueStyle}>
                {t("serviceComponents.commissionBadge.drivingTimeValue", { minutes: commission.drivingTimeMinutes.toFixed(1) })}
                {commission.nearestDestination && t("serviceComponents.commissionBadge.drivingTimeTo", { destination: commission.nearestDestination })}
              </span>
            </div>
          )}

          {commission.reason && (
            <div style={{ marginTop: '8px', fontSize: '11px', color: '#6b7280', fontStyle: 'italic' }}>
              {commission.reason}
            </div>
          )}

          {commission.usedFallback && (
            <div style={{ marginTop: '4px', fontSize: '11px', color: '#f59e0b' }}>
              <FaExclamationTriangle /> {t("serviceComponents.commissionBadge.usingEstimated")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ServiceCommissionBadge;
