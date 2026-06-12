import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { FaDollarSign, FaExclamationTriangle } from "react-icons/fa";
import { commissionApi } from "../../../backendservice/api/commissionApi";
import {
  resolveCommissionRules,
  type ResolvedCommissionRules,
  type AccountType,
  type AgreementTerm,
  type QuotaLevel,
  type BusinessType,
  type ServiceFrequency,
} from "../../../backendservice/types/commission.types";
import { computeGlobalCommission } from "../../services/hooks/useServiceCommission";
import { FREQUENCY_TO_BACKEND } from "../../services/hooks/useAccountTypeDetection";

interface CommissionCalculatorProps {
  onRecordSaved?: () => void;
}

const ACCOUNT_TYPES: { value: AccountType; labelKey: string; descKey: string }[] = [
  { value: "Anchor", labelKey: "anchor", descKey: "anchorDesc" },
  { value: "Bread5", labelKey: "bread5", descKey: "bread5Desc" },
  { value: "Bread15", labelKey: "bread15", descKey: "bread15Desc" },
  { value: "Pit", labelKey: "pit", descKey: "pitDesc" },
];

const FREQUENCIES: { value: ServiceFrequency; labelKey: string }[] = [
  { value: "weekly", labelKey: "weekly" },
  { value: "biweekly", labelKey: "biweekly" },
  { value: "monthly", labelKey: "monthly" },
  { value: "quarterly", labelKey: "quarterly" },
  { value: "one-time", labelKey: "oneTime" },
];

const QUOTA_LEVELS: { value: QuotaLevel; labelKey: string; rate: number }[] = [
  { value: "below", labelKey: "below", rate: 3 },
  { value: "above", labelKey: "above", rate: 6 },
  { value: "double", labelKey: "double", rate: 9 },
];

const BUSINESS_TYPES: { value: BusinessType; labelKey: string }[] = [
  { value: "new", labelKey: "new" },
  { value: "renewal", labelKey: "renewal" },
];

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

const formatPercent = (n: number, digits = 2) => `${n.toFixed(digits)}%`;

export const CommissionCalculator: React.FC<CommissionCalculatorProps> = ({ onRecordSaved }) => {
  const { t } = useTranslation();

  const [customerName, setCustomerName] = useState<string>("");
  const [salesPersonName, setSalesPersonName] = useState<string>("");

  const [currentContract, setCurrentContract] = useState<string>("");
  const [originalContract, setOriginalContract] = useState<string>("");
  const [contractMonths, setContractMonths] = useState<string>("36");

  const [frequency, setFrequency] = useState<ServiceFrequency>("weekly");

  const [accountType, setAccountType] = useState<AccountType>("Anchor");

  const [isNewLocation, setIsNewLocation] = useState<boolean>(true);

  const [quotaLevel, setQuotaLevel] = useState<QuotaLevel>("below");
  const [repActualSalesBefore, setRepActualSalesBefore] = useState<string>("0");
  const [isInsideSales, setIsInsideSales] = useState<boolean>(false);

  const [businessType, setBusinessType] = useState<BusinessType>("new");
  const [yearsAsCustomer, setYearsAsCustomer] = useState<string>("0");
  const [totalRenewalValue, setTotalRenewalValue] = useState<string>("0");

  const [activeRules, setActiveRules] = useState<ResolvedCommissionRules>(() =>
    resolveCommissionRules(null),
  );

  useEffect(() => {
    let cancelled = false;
    commissionApi
      .getActiveRules()
      .then(response => {
        if (cancelled) return;
        if (response?.data) setActiveRules(resolveCommissionRules(response.data));
      })
      .catch(err =>
        console.error("[RULES] Calculator failed to load active commission rules:", err),
      );
    return () => {
      cancelled = true;
    };
  }, []);

  const result = useMemo(() => {
    const rules = activeRules;
    const current = parseFloat(currentContract) || 0;
    const original = parseFloat(originalContract) || current;
    const months = Math.max(1, parseFloat(contractMonths) || 12);
    const positionBefore = parseFloat(repActualSalesBefore) || 0;
    const yearsCust = parseFloat(yearsAsCustomer) || 0;
    const renewalValue = parseFloat(totalRenewalValue) || 0;

    if (current <= 0) return null;

    // Build a synthetic single-service agreement and run the EXACT form-filling
    // engine (computeGlobalCommission) so the calculator matches it 1:1.
    const freqNum = FREQUENCY_TO_BACKEND[frequency] ?? FREQUENCY_TO_BACKEND[frequency.replace("-", "")] ?? 3;
    const servicesState: Record<string, any> = {
      calc: {
        isActive: true,
        frequency,
        contractTotal: current,
        originalContractTotal: original,
      },
    };
    const accountTypeCache: Record<number, any> = {
      [freqNum]: { accountType, confidence: "high", reason: null },
    };
    // baseCommissionRate from the chosen quota level (the engine still derives
    // the progressive tier rate from priorQuotaCredit; this is the no-target fallback).
    const baseCommissionRate = rules.quotaRates[quotaLevel];

    const global = computeGlobalCommission(
      servicesState,
      accountTypeCache,
      months,
      baseCommissionRate,
      rules,
      positionBefore,
    );

    const svc = global.services[0];
    if (!svc) return null;

    const annualCommission = global.totalAnnualCommission;
    const weeklyCommission = global.totalWeeklyCommission;
    const tiers = global.commissionTierBreakdown;
    const below = tiers.find(t => t.level === "below");
    const above = tiers.find(t => t.level === "above");
    const dbl = tiers.find(t => t.level === "double");

    let renewalBonusRate = 0;
    let renewalBonusAmount = 0;
    if (businessType === "renewal" && yearsCust >= rules.renewalMinYears) {
      renewalBonusRate = rules.renewalBonusRate;
      renewalBonusAmount = renewalValue * (renewalBonusRate / 100);
    }

    return {
      input: {
        currentContract: current,
        originalContract: original,
        contractMonths: months,
        frequency,
        accountType,
        isNewLocation,
        quotaLevel,
        repActualSalesBefore: positionBefore,
        isInsideSales,
        businessType,
        yearsAsCustomer: yearsCust,
        totalRenewalValue: renewalValue,
        customerName,
        salesPersonName,
      },

      monthlyValue: svc.perVisitRevenue / 12,
      currentContract12Months: svc.perVisitRevenue,
      originalContract12Months: svc.annualOriginalRevenue,

      priceRatio: svc.priceRatio,
      pricingTier: svc.pricingTierLabel,
      pricingMultiplier: svc.pricingMultiplier,
      requiresApproval: false,

      agreementTerm: (months >= 36 ? "3-year" : months >= 12 ? "1-year" : "MTM-with-install") as AgreementTerm,
      agreementMultiplier: global.agreementMultiplier,

      visitsPerYear: svc.visitsPerYear,
      adjustedAnnual: svc.adjustedAnnualRevenue,

      revenueDeduction: svc.revenueDeduction,
      anchorBonus: svc.anchorBonus,
      commissionableAnnual: svc.commissionableRevenue,

      annualContractTotal: svc.perVisitRevenue,
      annualQuotaCredit: global.totalQuotaCredit,

      belowQuotaPortion: below?.base ?? 0,
      aboveQuotaPortion: above?.base ?? 0,
      doubleQuotaPortion: dbl?.base ?? 0,
      belowQuotaCommission: below?.commission ?? 0,
      aboveQuotaCommission: above?.commission ?? 0,
      doubleQuotaCommission: dbl?.commission ?? 0,

      baseRate: rules.quotaRates[quotaLevel],
      insideSalesDeduction: isInsideSales ? rules.insideSalesDeduction : 0,
      effectiveRate: global.effectiveCommissionRate / (global.agreementMultiplier / 100 || 1),
      finalCommissionRate: global.effectiveCommissionRate,
      annualCommission,
      weeklyCommission,
      renewalBonusRate,
      renewalBonusAmount,
      totalCommission: annualCommission + renewalBonusAmount,
      rulesVersion: rules ? "active" : "default",
    };
  }, [
    activeRules,
    currentContract,
    originalContract,
    contractMonths,
    frequency,
    accountType,
    isNewLocation,
    quotaLevel,
    repActualSalesBefore,
    isInsideSales,
    businessType,
    yearsAsCustomer,
    totalRenewalValue,
    customerName,
    salesPersonName,
  ]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleClear = () => {
    setCustomerName("");
    setSalesPersonName("");
    setCurrentContract("");
    setOriginalContract("");
    setContractMonths("36");
    setFrequency("weekly");
    setAccountType("Anchor");
    setIsNewLocation(true);
    setQuotaLevel("below");
    setRepActualSalesBefore("0");
    setIsInsideSales(false);
    setBusinessType("new");
    setYearsAsCustomer("0");
    setTotalRenewalValue("0");
    setError(null);
    setSuccessMessage(null);
  };

  const handleSave = async () => {
    if (!result) {
      setError(t("adminCommissionTools.calculator.enterContractFirst"));
      return;
    }
    if (!salesPersonName) {
      setError(t("adminCommissionTools.calculator.salesPersonRequired"));
      return;
    }
    setSaving(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const recordData = {
        calculation: result as any,
        salesPersonId: salesPersonName.toLowerCase().replace(/\s+/g, "_"),
        salesPersonName,
        customerName: customerName || undefined,
        status: "draft" as const,
      };
      const response = await commissionApi.saveRecord(recordData);
      if (response.error) setError(response.error);
      else {
        setSuccessMessage(t("adminCommissionTools.calculator.saveSuccess"));
        if (onRecordSaved) onRecordSaved();
      }
    } catch {
      setError(t("adminCommissionTools.calculator.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="commission-calculator">
      <h3 className="calculator-section-title">
        <span><FaDollarSign /></span> {t("adminCommissionTools.calculator.dealInformation")}
      </h3>
      <p style={{ color: "#6b7280", fontSize: "0.85em", marginTop: -8 }}>
        {t("adminCommissionTools.calculator.intro")}
      </p>

      <div className="calculator-grid">
        <div className="form-group">
          <label>{t("adminCommissionTools.calculator.customerName")}</label>
          <input
            type="text"
            value={customerName}
            onChange={e => setCustomerName(e.target.value)}
            placeholder={t("adminCommissionTools.calculator.customerNamePlaceholder")}
          />
        </div>
        <div className="form-group">
          <label>{t("adminCommissionTools.calculator.salesPersonName")}</label>
          <input
            type="text"
            value={salesPersonName}
            onChange={e => setSalesPersonName(e.target.value)}
            placeholder={t("adminCommissionTools.calculator.salesPersonNamePlaceholder")}
          />
        </div>

        <div className="form-group">
          <label>{t("adminCommissionTools.calculator.currentContractTotal")}</label>
          <input
            type="number"
            value={currentContract}
            onChange={e => setCurrentContract(e.target.value)}
            placeholder={t("adminCommissionTools.calculator.currentContractPlaceholder")}
            min="0"
            step="0.01"
          />
          <small>{t("adminCommissionTools.calculator.currentContractHint")}</small>
        </div>
        <div className="form-group">
          <label>{t("adminCommissionTools.calculator.originalContractTotal")}</label>
          <input
            type="number"
            value={originalContract}
            onChange={e => setOriginalContract(e.target.value)}
            placeholder={t("adminCommissionTools.calculator.originalContractPlaceholder")}
            min="0"
            step="0.01"
          />
          <small>{t("adminCommissionTools.calculator.originalContractHint")}</small>
        </div>

        <div className="form-group">
          <label>{t("adminCommissionTools.calculator.contractMonths")}</label>
          <input
            type="number"
            value={contractMonths}
            onChange={e => setContractMonths(e.target.value)}
            min="1"
            step="1"
          />
          <small>{t("adminCommissionTools.calculator.contractMonthsHint")}</small>
        </div>
        <div className="form-group">
          <label>{t("adminCommissionTools.calculator.serviceFrequency")}</label>
          <select value={frequency} onChange={e => setFrequency(e.target.value as ServiceFrequency)}>
            {FREQUENCIES.map(f => (
              <option key={f.value} value={f.value}>
                {t("adminCommissionTools.calculator.frequencyOption", { label: t(`adminCommissionTools.calculator.frequencies.${f.labelKey}`), visits: activeRules.frequencyVisitsPerYear[f.value] })}
              </option>
            ))}
          </select>
          <small>{t("adminCommissionTools.calculator.frequencyHint")}</small>
        </div>

        <div className="form-group">
          <label>{t("adminCommissionTools.calculator.accountType")}</label>
          <select value={accountType} onChange={e => setAccountType(e.target.value as AccountType)}>
            {ACCOUNT_TYPES.map(at => (
              <option key={at.value} value={at.value}>
                {t(`adminCommissionTools.calculator.accountTypes.${at.labelKey}`)}
              </option>
            ))}
          </select>
          <small>{t(`adminCommissionTools.calculator.accountTypes.${ACCOUNT_TYPES.find(at => at.value === accountType)?.descKey}`)}</small>
        </div>
        <div className="form-group">
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontWeight: 500,
              cursor: "pointer",
              marginTop: 28,
            }}
          >
            <input
              type="checkbox"
              checked={isNewLocation}
              onChange={e => setIsNewLocation(e.target.checked)}
            />
            {t("adminCommissionTools.calculator.newLocation")}
          </label>
          <small>{t("adminCommissionTools.calculator.newLocationHint")}</small>
        </div>

        <div className="form-group">
          <label>{t("adminCommissionTools.calculator.quotaAchievement")}</label>
          <select value={quotaLevel} onChange={e => setQuotaLevel(e.target.value as QuotaLevel)}>
            {QUOTA_LEVELS.map(l => (
              <option key={l.value} value={l.value}>
                {t("adminCommissionTools.calculator.quotaOption", { label: t(`adminCommissionTools.calculator.quotaLevels.${l.labelKey}`), rate: l.rate })}
              </option>
            ))}
          </select>
          <small>{t("adminCommissionTools.calculator.quotaHint")}</small>
        </div>
        <div className="form-group">
          <label>{t("adminCommissionTools.calculator.existingSalesPosition")}</label>
          <input
            type="number"
            value={repActualSalesBefore}
            onChange={e => setRepActualSalesBefore(e.target.value)}
            placeholder={t("adminCommissionTools.calculator.existingSalesPlaceholder")}
            min="0"
            step="0.01"
          />
          <small>
            {t("adminCommissionTools.calculator.existingSalesHint", { above: activeRules.quotaTierCutoffs.aboveQuota.toLocaleString(), double: activeRules.quotaTierCutoffs.doubleQuota.toLocaleString() })}
          </small>
        </div>

        <div className="form-group">
          <label>{t("adminCommissionTools.calculator.businessType")}</label>
          <select value={businessType} onChange={e => setBusinessType(e.target.value as BusinessType)}>
            {BUSINESS_TYPES.map(b => (
              <option key={b.value} value={b.value}>
                {t(`adminCommissionTools.calculator.businessTypes.${b.labelKey}`)}
              </option>
            ))}
          </select>
        </div>
        {businessType === "renewal" && (
          <>
            <div className="form-group">
              <label>{t("adminCommissionTools.calculator.yearsAsCustomer")}</label>
              <input
                type="number"
                value={yearsAsCustomer}
                onChange={e => setYearsAsCustomer(e.target.value)}
                min="0"
                step="1"
              />
              <small>{t("adminCommissionTools.calculator.yearsAsCustomerHint", { rate: activeRules.renewalBonusRate, years: activeRules.renewalMinYears })}</small>
            </div>
            <div className="form-group">
              <label>{t("adminCommissionTools.calculator.totalRenewalValue")}</label>
              <input
                type="number"
                value={totalRenewalValue}
                onChange={e => setTotalRenewalValue(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>
          </>
        )}
      </div>

      <div className="form-group checkbox-group" style={{ marginTop: 16 }}>
        <label>
          <input
            type="checkbox"
            checked={isInsideSales}
            onChange={e => setIsInsideSales(e.target.checked)}
          />
          {t("adminCommissionTools.calculator.insideSalesInvolvement", { deduction: activeRules.insideSalesDeduction })}
        </label>
      </div>

      <div style={{ display: "flex", gap: "12px", marginTop: "24px", flexWrap: "wrap" }}>
        {result && (
          <button
            className="calculate-btn"
            onClick={handleSave}
            disabled={saving}
            style={{ backgroundColor: "#16a34a" }}
          >
            {saving ? t("adminCommissionTools.calculator.saving") : t("adminCommissionTools.calculator.saveToHistory")}
          </button>
        )}
        <button className="calculate-btn" onClick={handleClear} style={{ backgroundColor: "#6b7280" }}>
          {t("adminCommissionTools.calculator.clear")}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}
      {successMessage && (
        <div
          style={{
            marginTop: 12,
            padding: "12px 16px",
            backgroundColor: "#dcfce7",
            color: "#166534",
            borderRadius: 8,
            fontWeight: 500,
          }}
        >
          {successMessage}
        </div>
      )}

      {result && <CalculatorResult r={result} />}
    </div>
  );
};

const sectionStyle: React.CSSProperties = {
  marginTop: 24,
  padding: 16,
  backgroundColor: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: 8,
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  padding: "6px 0",
  borderBottom: "1px dashed #e5e7eb",
};

const totalRowStyle: React.CSSProperties = {
  ...rowStyle,
  fontWeight: 700,
  borderBottom: "none",
  borderTop: "2px solid #d1d5db",
  marginTop: 8,
  paddingTop: 12,
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: "0.75em",
  fontWeight: 700,
  color: "#6b7280",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  marginBottom: 8,
};

function CalculatorResult({ r }: { r: NonNullable<ReturnType<CommissionCalculatorMemo>> }) {
  const { t } = useTranslation();
  return (
    <div style={{ marginTop: 24 }}>
      <h3 style={{ fontSize: "1.1em", fontWeight: 700, marginBottom: 4 }}>{t("adminCommissionTools.result.commissionBreakdown")}</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div
          style={{
            padding: 16,
            backgroundColor: "#dcfce7",
            color: "#166534",
            borderRadius: 8,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "0.8em", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {t("adminCommissionTools.result.annualCommission")}
          </div>
          <div style={{ fontSize: "1.6em", fontWeight: 800 }}>{formatCurrency(r.annualCommission)}</div>
        </div>
        <div
          style={{
            padding: 16,
            backgroundColor: "#dbeafe",
            color: "#1e3a8a",
            borderRadius: 8,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "0.8em", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {t("adminCommissionTools.result.weeklyCommission")}
          </div>
          <div style={{ fontSize: "1.6em", fontWeight: 800 }}>{formatCurrency(r.weeklyCommission)}</div>
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>{t("adminCommissionTools.result.step01")}</div>
        <div style={rowStyle}>
          <span>{t("adminCommissionTools.result.current12Month")}</span>
          <span>{formatCurrency(r.currentContract12Months)}</span>
        </div>
        <div style={rowStyle}>
          <span>{t("adminCommissionTools.result.original12Month")}</span>
          <span>{formatCurrency(r.originalContract12Months)}</span>
        </div>
        <div style={rowStyle}>
          <span>{t("adminCommissionTools.result.priceRatio")}</span>
          <span>{formatPercent(r.priceRatio * 100, 1)}</span>
        </div>
        <div style={rowStyle}>
          <span>{t("adminCommissionTools.result.pricingTier")}</span>
          <span style={{ fontWeight: 600 }}>{r.pricingTier}</span>
        </div>
        <div style={rowStyle}>
          <span>{t("adminCommissionTools.result.pricingMultiplier")}</span>
          <span style={{ color: r.pricingMultiplier > 1 ? "#16a34a" : r.pricingMultiplier < 1 ? "#dc2626" : "#6b7280", fontWeight: 600 }}>
            {r.pricingMultiplier.toFixed(2)}×
          </span>
        </div>
        {r.requiresApproval && (
          <div style={{ ...rowStyle, color: "#dc2626" }}>
            <span><FaExclamationTriangle /> {t("adminCommissionTools.result.requiresApproval")}</span>
            <span></span>
          </div>
        )}
      </div>

      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>{t("adminCommissionTools.result.step23")}</div>
        <div style={rowStyle}>
          <span>{t("adminCommissionTools.result.adjustedAnnual", { base: formatCurrency(r.currentContract12Months), multiplier: r.pricingMultiplier.toFixed(2) })}</span>
          <span>{formatCurrency(r.adjustedAnnual)}</span>
        </div>
        <div style={rowStyle}>
          <span>{t("adminCommissionTools.result.frequency")}</span>
          <span>{t("adminCommissionTools.result.frequencyValue", { frequency: r.input.frequency, visits: r.visitsPerYear })}</span>
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>{t("adminCommissionTools.result.step4", { accountType: r.input.accountType })}</div>
        {r.revenueDeduction > 0 && (
          <div style={rowStyle}>
            <span>{t("adminCommissionTools.result.revenueDeduction", { location: r.input.isNewLocation ? t("adminCommissionTools.result.locationNew") : t("adminCommissionTools.result.locationExisting") })}</span>
            <span style={{ color: "#dc2626" }}>−{formatCurrency(r.revenueDeduction)}</span>
          </div>
        )}
        {r.anchorBonus > 0 && (
          <div style={rowStyle}>
            <span>{t("adminCommissionTools.result.anchorBonus", { prefix: r.pricingMultiplier > 1 ? t("adminCommissionTools.result.greenlineRelaxed") : "" })}</span>
            <span style={{ color: "#16a34a" }}>+{formatCurrency(r.anchorBonus)}</span>
          </div>
        )}
        <div style={totalRowStyle}>
          <span>{t("adminCommissionTools.result.commissionableAnnual")}</span>
          <span>{formatCurrency(r.commissionableAnnual)}</span>
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>{t("adminCommissionTools.result.step5")}</div>
        <div style={rowStyle}>
          <span>{t("adminCommissionTools.result.annualContractTotal")}</span>
          <span>{formatCurrency(r.annualContractTotal)}</span>
        </div>
        <div style={totalRowStyle}>
          <span>{t("adminCommissionTools.result.annualQuotaCredit", { multiplier: r.pricingMultiplier.toFixed(2) })}</span>
          <span>{formatCurrency(r.annualQuotaCredit)}</span>
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>{t("adminCommissionTools.result.step6")}</div>
        <div style={rowStyle}>
          <span>{t("adminCommissionTools.result.existingSalesPosition")}</span>
          <span>{formatCurrency(r.input.repActualSalesBefore)}</span>
        </div>
        {r.belowQuotaPortion > 0 && (
          <div style={rowStyle}>
            <span>
              {t("adminCommissionTools.result.belowTierPortion", { base: formatCurrency(r.belowQuotaPortion), rate: r.input.isInsideSales ? `(${r.baseRate} − 3)` : r.baseRate, multiplier: r.agreementMultiplier })}
            </span>
            <span>{formatCurrency(r.belowQuotaCommission)}</span>
          </div>
        )}
        {r.aboveQuotaPortion > 0 && (
          <div style={rowStyle}>
            <span>
              {t("adminCommissionTools.result.aboveTierPortion", { base: formatCurrency(r.aboveQuotaPortion), rate: r.input.isInsideSales ? "3" : "6", multiplier: r.agreementMultiplier })}
            </span>
            <span>{formatCurrency(r.aboveQuotaCommission)}</span>
          </div>
        )}
        {r.doubleQuotaPortion > 0 && (
          <div style={rowStyle}>
            <span>
              {t("adminCommissionTools.result.doubleTierPortion", { base: formatCurrency(r.doubleQuotaPortion), rate: r.input.isInsideSales ? "6" : "9", multiplier: r.agreementMultiplier })}
            </span>
            <span>{formatCurrency(r.doubleQuotaCommission)}</span>
          </div>
        )}
        <div style={totalRowStyle}>
          <span>{t("adminCommissionTools.result.annualCommission")}</span>
          <span style={{ color: "#16a34a" }}>{formatCurrency(r.annualCommission)}</span>
        </div>
      </div>

      {r.renewalBonusAmount > 0 && (
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>{t("adminCommissionTools.result.renewalBonus")}</div>
          <div style={rowStyle}>
            <span>{t("adminCommissionTools.result.totalRenewedValue", { rate: r.renewalBonusRate })}</span>
            <span style={{ color: "#16a34a" }}>+{formatCurrency(r.renewalBonusAmount)}</span>
          </div>
          <div style={totalRowStyle}>
            <span>{t("adminCommissionTools.result.totalCommission")}</span>
            <span style={{ color: "#16a34a" }}>{formatCurrency(r.totalCommission)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

type CommissionCalculatorMemo = () => any;
