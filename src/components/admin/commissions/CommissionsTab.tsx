import React, { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { CommissionCalculator } from "./CommissionCalculator";
import { CommissionRulesManager } from "./CommissionRulesManager";
import "./CommissionsTab.css";

type SubTab = "calculator" | "rules";

export const CommissionsTab: React.FC = () => {
  const { t } = useTranslation();
  const [activeSubTab, setActiveSubTab] = useState<SubTab>("rules");

  
  const handleRecordSaved = useCallback(() => {}, []);

  return (
    <div className="commissions-tab-container">
      <div className="commissions-header">
        <h2>{t("adminCommissionTools.tab.title")}</h2>
        <p className="commissions-subtitle">
          {t("adminCommissionTools.tab.subtitle")}
        </p>
      </div>

      <div className="commissions-subtab-bar">
        <button
          className={`subtab-btn ${activeSubTab === "calculator" ? "active" : ""}`}
          onClick={() => setActiveSubTab("calculator")}
        >
          <span className="subtab-icon">C</span>
          {t("adminCommissionTools.tab.calculator")}
        </button>
        <button
          className={`subtab-btn ${activeSubTab === "rules" ? "active" : ""}`}
          onClick={() => setActiveSubTab("rules")}
        >
          <span className="subtab-icon">R</span>
          {t("adminCommissionTools.tab.rulesConfig")}
        </button>
      </div>

      <div className="commissions-content">
        {activeSubTab === "calculator" && <CommissionCalculator onRecordSaved={handleRecordSaved} />}
        {activeSubTab === "rules" && <CommissionRulesManager />}
      </div>
    </div>
  );
};
