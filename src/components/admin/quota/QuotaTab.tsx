import React, { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { SalesPersonManager } from "./SalesPersonManager";
import { QuotaDashboard } from "./QuotaDashboard";
import "./QuotaTab.css";

type SubTab = "dashboard" | "sales-persons";

export const QuotaTab: React.FC = () => {
  const { t } = useTranslation();
  const [activeSubTab, setActiveSubTab] = useState<SubTab>("dashboard");
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  return (
    <div className="quota-tab-container">
      <div className="quota-header">
        <h2>{t("adminQuota.tab.title")}</h2>
        <p className="quota-subtitle">
          {t("adminQuota.tab.subtitle")}
        </p>
      </div>

      <div className="quota-subtab-bar">
        <button
          className={`subtab-btn ${activeSubTab === "dashboard" ? "active" : ""}`}
          onClick={() => setActiveSubTab("dashboard")}
        >
          <span className="subtab-icon">D</span>
          {t("adminQuota.tab.dashboard")}
        </button>
        <button
          className={`subtab-btn ${activeSubTab === "sales-persons" ? "active" : ""}`}
          onClick={() => setActiveSubTab("sales-persons")}
        >
          <span className="subtab-icon">S</span>
          {t("adminQuota.tab.salesPersons")}
        </button>
      </div>

      <div className="quota-content">
        {activeSubTab === "dashboard" && (
          <QuotaDashboard
            key={`dashboard-${refreshKey}`}
          />
        )}
        {activeSubTab === "sales-persons" && (
          <SalesPersonManager
            key={`sales-persons-${refreshKey}`}
            onRefresh={handleRefresh}
          />
        )}
      </div>
    </div>
  );
};
