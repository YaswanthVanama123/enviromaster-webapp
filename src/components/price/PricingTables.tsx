import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import SaniCleanCalculator from "./saniclean/SaniCleanCalculator";
import RpmWindowsCalculator from "./rpmwindows/RpmWindowsCalculator";

const card = { border: "1px solid #e6e6e6", borderRadius: 14, background: "#fff", padding: 18, marginBottom: 14 };

export default function PricingTables() {
  const { t } = useTranslation();
  const [tab, setTab] = useState("SaniClean");

  const tabs = [
    { key: "SaniClean", label: t("pricingCalc.tables.tabs.saniClean"), component: <SaniCleanCalculator /> },
    { key: "RPM Windows", label: t("pricingCalc.tables.tabs.rpmWindows"), component: <RpmWindowsCalculator /> },

  ];

  return (
    <div style={{ maxWidth: 1100, margin: "28px auto", padding: "0 16px 48px" }}>
      <h1 style={{ fontSize: 24, margin: 0 }}>{t("pricingCalc.tables.title")}</h1>
      <p style={{ color: "#4a4a4a", marginTop: 8, marginBottom: 16 }}>
        {t("pricingCalc.tables.subtitle")}
      </p>

      {}
      <div style={{ ...card, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {tabs.map((tabItem) => (
          <button
            key={tabItem.key}
            onClick={() => setTab(tabItem.key)}
            style={{
              padding: "8px 12px",
              borderRadius: 999,
              border: "1px solid #e6e6e6",
              background: tab === tabItem.key ? "#fff1eb" : "#fff",
              color: tab === tabItem.key ? "#ff4500" : "#212121",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {tabItem.label}
          </button>
        ))}
      </div>

      {}
      {tabs.find((tabItem) => tabItem.key === tab)?.component}
    </div>
  );
}
