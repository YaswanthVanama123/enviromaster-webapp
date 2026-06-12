import React from "react";
import { useTranslation } from "react-i18next";

const inputStyle = {
  border: "1px solid #e6e6e6",
  borderRadius: 10,
  padding: "10px 12px",
  outline: "none",
};

export default function TripChargeSelector({
  tripType,
  setTripType,
  parkingAmt,
  setParkingAmt,
  label = undefined,
  options = undefined,
}) {
  const { t } = useTranslation();
  const resolvedLabel = label ?? t("pricingCalc.tripCharge.label");
  const resolvedOptions = options ?? [
    { value: "beltway8", label: t("pricingCalc.tripCharge.options.beltway8") },
    { value: "standard6", label: t("pricingCalc.tripCharge.options.standard6") },
    { value: "paid7", label: t("pricingCalc.tripCharge.options.paid7") },
    { value: "waived", label: t("pricingCalc.tripCharge.options.waived") },
  ];
  return (
    <>
      <div style={{ gridColumn: "span 3", display: "flex", flexDirection: "column", gap: 6 }}>
        <label>{resolvedLabel}</label>
        <select style={inputStyle} value={tripType} onChange={(e) => setTripType(e.target.value)}>
          {resolvedOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div style={{ gridColumn: "span 3", display: "flex", flexDirection: "column", gap: 6 }}>
        <label>{t("pricingCalc.tripCharge.parkingLabel")}</label>
        <input
          style={inputStyle}
          type="number"
          min={0}
          step="0.01"
          value={parkingAmt}
          onChange={(e) => setParkingAmt(e.target.value)}
        />
      </div>
    </>
  );
}
