import React from "react";
import { useTranslation } from "react-i18next";
import type { CommissionCalculationResult } from "../../../backendservice/types/commission.types";

interface CommissionResultDisplayProps {
  result: CommissionCalculationResult;
}

export const CommissionResultDisplay: React.FC<CommissionResultDisplayProps> = ({
  result,
}) => {
  const { t } = useTranslation();
  const { breakdown, effectiveBaseRate, finalCommissionRate, weeklyCommission, annualCommission, input } = result;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number, showSign = false) => {
    const sign = showSign && value > 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}%`;
  };

  return (
    <div className="commission-result">
      <div className="result-header">
        <h3>{t("adminCommissionTools.resultDisplay.title")}</h3>
        <span style={{ fontSize: "13px", color: "#6b7280" }}>
          {t("adminCommissionTools.resultDisplay.calculatedAt", { time: new Date(result.calculatedAt).toLocaleString() })}
        </span>
      </div>

      {}
      <div className="result-main">
        <div className="result-card">
          <div className="result-card-label">{t("adminCommissionTools.resultDisplay.finalCommissionRate")}</div>
          <div className="result-card-value rate">
            {formatPercent(finalCommissionRate)}
          </div>
        </div>

        <div className="result-card">
          <div className="result-card-label">{t("adminCommissionTools.resultDisplay.weeklyCommission")}</div>
          <div className="result-card-value">
            {formatCurrency(weeklyCommission)}
          </div>
        </div>

        <div className="result-card">
          <div className="result-card-label">{t("adminCommissionTools.resultDisplay.annualCommission")}</div>
          <div className="result-card-value">
            {formatCurrency(annualCommission)}
          </div>
        </div>
      </div>

      {}
      <div className="result-breakdown">
        <h4>{t("adminCommissionTools.resultDisplay.calculationBreakdown")}</h4>
        <div className="breakdown-grid">
          <div className="breakdown-item">
            <span className="breakdown-label">{t("adminCommissionTools.resultDisplay.baseRate", { level: input.quotaLevel })}</span>
            <span className="breakdown-value positive">
              {formatPercent(breakdown.baseRate)}
            </span>
          </div>

          <div className="breakdown-item">
            <span className="breakdown-label">{t("adminCommissionTools.resultDisplay.agreementMultiplier", { term: input.agreementTerm })}</span>
            <span className="breakdown-value">
              {breakdown.agreementMultiplier}%
            </span>
          </div>

          <div className="breakdown-item">
            <span className="breakdown-label">{t("adminCommissionTools.resultDisplay.accountType", { type: input.accountType })}</span>
            <span
              className={`breakdown-value ${
                breakdown.accountTypeAdjustment < 0 ? "negative" : ""
              }`}
            >
              {formatPercent(breakdown.accountTypeAdjustment, true)}
            </span>
          </div>

          <div className="breakdown-item">
            <span className="breakdown-label">{t("adminCommissionTools.resultDisplay.pricingLine", { line: input.pricingLine })}</span>
            <span
              className={`breakdown-value ${
                breakdown.greenlineBonus > 0 ? "positive" : ""
              }`}
            >
              {formatPercent(breakdown.greenlineBonus, true)}
            </span>
          </div>

          {input.businessType === "renewal" && (
            <div className="breakdown-item">
              <span className="breakdown-label">
                {t("adminCommissionTools.resultDisplay.renewalBonus", { years: input.yearsAsCustomer })}
              </span>
              <span
                className={`breakdown-value ${
                  breakdown.renewalBonus > 0 ? "positive" : ""
                }`}
              >
                {formatPercent(breakdown.renewalBonus, true)}
              </span>
            </div>
          )}

          {input.isInsideSales && (
            <div className="breakdown-item">
              <span className="breakdown-label">{t("adminCommissionTools.resultDisplay.insideSalesDeduction")}</span>
              <span className="breakdown-value negative">
                {formatPercent(breakdown.insideSalesDeduction, true)}
              </span>
            </div>
          )}

          <div className="breakdown-item" style={{ backgroundColor: "#e0f2fe" }}>
            <span className="breakdown-label" style={{ fontWeight: 600 }}>
              {t("adminCommissionTools.resultDisplay.effectiveBaseRate")}
            </span>
            <span className="breakdown-value" style={{ color: "#0369a1" }}>
              {formatPercent(effectiveBaseRate)}
            </span>
          </div>
        </div>

        <div
          style={{
            marginTop: "16px",
            padding: "12px",
            backgroundColor: "#f0fdf4",
            borderRadius: "8px",
            fontSize: "13px",
            color: "#166534",
          }}
        >
          <strong>{t("adminCommissionTools.resultDisplay.formula")}</strong>{" "}
          {t("adminCommissionTools.resultDisplay.formulaText", { effective: formatPercent(effectiveBaseRate), multiplier: breakdown.agreementMultiplier })}{" "}
          <strong>{formatPercent(finalCommissionRate)}</strong>
          <br />
          <strong>{t("adminCommissionTools.resultDisplay.weekly")}</strong>{" "}
          {t("adminCommissionTools.resultDisplay.weeklyText", { annual: formatCurrency(annualCommission) })}{" "}
          <strong>{formatCurrency(weeklyCommission)}</strong>
        </div>
      </div>
    </div>
  );
};
