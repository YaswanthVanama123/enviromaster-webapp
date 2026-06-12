import React from "react";
import { useTranslation } from "react-i18next";
import { money } from "./money";

const pill = { border: "1px solid #e6e6e6", borderRadius: 999, padding: "8px 12px", display: "inline-block" };

export default function TotalsBar({ perVisit, perMonth, agreement, months, ruleText, monthlyLabel = undefined }) {
  const { t } = useTranslation();
  const resolvedMonthlyLabel = monthlyLabel ?? t("pricingCalc.totals.perMonth");
  return (
    <div style={{ border: "1px solid #e6e6e6", borderRadius: 14, background: "#fff", padding: 18, marginBottom: 14 }}>
      <h3 style={{ margin: "0 0 10px" }}>{t("pricingCalc.totals.heading")}</h3>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <div style={pill}>{t("pricingCalc.totals.perVisit")}: <strong>{money(perVisit)}</strong></div>
        <div style={pill}>{resolvedMonthlyLabel}: <strong>{money(perMonth)}</strong></div>
        <div style={pill}>{t("pricingCalc.totals.agreement", { months })}: <strong>{money(agreement)}</strong></div>
      </div>
      {ruleText && <div style={{ marginTop: 8, fontSize: 12, color: "#4a4a4a" }}>{ruleText}</div>}
    </div>
  );
}
