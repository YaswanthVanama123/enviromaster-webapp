

import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  FaClipboardList,
  FaCalendarAlt,
  FaMapMarkedAlt,
  FaDollarSign,
  FaChartBar,
  FaTimes,
  FaBroom,
  FaBuilding,
  FaPlus,
  FaIndustry,
  FaCog,
  FaExclamationTriangle,
  FaLink,
  FaLightbulb,
} from "react-icons/fa";
import type { ServiceConfig } from "../../backendservice/types/serviceConfig.types";
import "./ServicePricingEditor.css";

interface ServicePricingEditorProps {
  config: ServiceConfig;
  onSave: (updatedConfig: Record<string, any>) => Promise<void>;
  onCancel: () => void;
}

type TabKey =
  | "overview"
  | "frequencies"
  | "geographic"
  | "rateTiers"
  | "minimums"
  | "multipliers"
  | "components"
  | "addons"
  | "refreshPowerScrub"
  | "janitorial"
  | "advanced";

interface Tab {
  key: TabKey;
  label: string;
  icon: React.ReactNode;
}

export const ServicePricingEditor: React.FC<ServicePricingEditorProps> = ({
  config,
  onSave,
  onCancel,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [editedConfig, setEditedConfig] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    setEditedConfig(JSON.parse(JSON.stringify(config.config)));
  }, [config]);

  useEffect(() => {
    const changed = JSON.stringify(editedConfig) !== JSON.stringify(config.config);
    setHasChanges(changed);
  }, [editedConfig, config.config]);

  const handleSave = async () => {
    setSaving(true);
    await onSave(editedConfig);
    setSaving(false);
  };

  const updateConfig = (path: string[], value: any) => {
    setEditedConfig((prev) => {
      const newConfig = JSON.parse(JSON.stringify(prev));
      let current = newConfig;

      for (let i = 0; i < path.length - 1; i++) {
        if (!current[path[i]]) {
          current[path[i]] = {};
        }
        current = current[path[i]];
      }

      current[path[path.length - 1]] = value;
      return newConfig;
    });
  };

  const getConfigValue = (path: string[]): any => {
    let current = editedConfig;
    for (const key of path) {
      if (current === undefined || current === null) return undefined;
      current = current[key];
    }
    return current;
  };

  const getAvailableTabs = (): Tab[] => {
    const serviceId = config.serviceId;
    const allTabs: Tab[] = [
      { key: "overview", label: t("servicePricing.tabs.overview"), icon: <FaClipboardList /> },
    ];

    if (["saniscrub", "microfiberMopping", "rpmWindows", "carpetCleaning", "stripWax", "foamingDrain", "sanipod", "electrostaticSpray", "refreshPowerScrub"].includes(serviceId)) {
      allTabs.push({ key: "frequencies", label: t("servicePricing.tabs.frequencies"), icon: <FaCalendarAlt /> });
    }

    if (["saniclean"].includes(serviceId)) {
      allTabs.push({ key: "geographic", label: t("servicePricing.tabs.geographic"), icon: <FaMapMarkedAlt /> });
    }

    if (["saniclean", "sanipod", "microfiberMopping", "rpmWindows", "stripWax"].includes(serviceId)) {
      allTabs.push({ key: "rateTiers", label: t("servicePricing.tabs.rateTiers"), icon: <FaDollarSign /> });
    }

    if (["saniscrub", "saniclean", "microfiberMopping"].includes(serviceId)) {
      allTabs.push({ key: "minimums", label: t("servicePricing.tabs.minimums"), icon: <FaChartBar /> });
    }

    if (["saniscrub", "rpmWindows", "carpetCleaning", "refreshPowerScrub"].includes(serviceId)) {
      allTabs.push({ key: "multipliers", label: t("servicePricing.tabs.multipliers"), icon: <FaTimes /> });
    }

    if (serviceId === "pureJanitorial") {
      allTabs.push({ key: "janitorial", label: t("servicePricing.tabs.janitorial"), icon: <FaBroom /> });
    }

    if (["saniclean"].includes(serviceId)) {
      allTabs.push({ key: "components", label: t("servicePricing.tabs.components"), icon: <FaBuilding /> });
    }

    if (["saniclean", "microfiberMopping", "electrostaticSpray"].includes(serviceId)) {
      allTabs.push({ key: "addons", label: t("servicePricing.tabs.addons"), icon: <FaPlus /> });
    }

    if (serviceId === "refreshPowerScrub") {
      allTabs.push({ key: "refreshPowerScrub", label: t("servicePricing.tabs.coreRatesAreas"), icon: <FaIndustry /> });
    }

    allTabs.push({ key: "advanced", label: t("servicePricing.tabs.advanced"), icon: <FaCog /> });

    return allTabs;
  };

  const tabs = getAvailableTabs();

  return (
    <div className="spe">
      <div className="spe__header">
        <div>
          <h2 className="spe__title">{t("servicePricing.editor.title", { label: config.label })}</h2>
          <p className="spe__subtitle">{t("servicePricing.editor.subtitle", { serviceId: config.serviceId, version: config.version })}</p>
        </div>
        <div className="spe__actions">
          <button className="spe__btn spe__btn--cancel" onClick={onCancel}>
            {t("servicePricing.editor.cancel")}
          </button>
          <button
            className="spe__btn spe__btn--save"
            onClick={handleSave}
            disabled={saving || !hasChanges}
          >
            {saving ? t("servicePricing.editor.saving") : t("servicePricing.editor.saveChanges")}
          </button>
        </div>
      </div>

      {hasChanges && (
        <div className="spe__changes-indicator">
          <FaExclamationTriangle /> {t("servicePricing.editor.unsavedChanges")}
        </div>
      )}

      <div className="spe__tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`spe__tab ${activeTab === tab.key ? "spe__tab--active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <span className="spe__tab-icon">{tab.icon}</span>
            <span className="spe__tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="spe__content">
        {activeTab === "overview" && (
          <OverviewTab config={config} editedConfig={editedConfig} />
        )}

        {activeTab === "frequencies" && (
          <FrequenciesTab
            serviceId={config.serviceId}
            editedConfig={editedConfig}
            updateConfig={updateConfig}
            getConfigValue={getConfigValue}
          />
        )}

        {activeTab === "geographic" && (
          <GeographicTab
            editedConfig={editedConfig}
            updateConfig={updateConfig}
            getConfigValue={getConfigValue}
          />
        )}

        {activeTab === "rateTiers" && (
          <RateTiersTab
            editedConfig={editedConfig}
            updateConfig={updateConfig}
            getConfigValue={getConfigValue}
          />
        )}

        {activeTab === "minimums" && (
          <MinimumsTab
            serviceId={config.serviceId}
            editedConfig={editedConfig}
            updateConfig={updateConfig}
            getConfigValue={getConfigValue}
          />
        )}

        {activeTab === "multipliers" && (
          <MultipliersTab
            serviceId={config.serviceId}
            editedConfig={editedConfig}
            updateConfig={updateConfig}
            getConfigValue={getConfigValue}
          />
        )}

        {activeTab === "components" && (
          <ComponentsTab
            editedConfig={editedConfig}
            updateConfig={updateConfig}
            getConfigValue={getConfigValue}
          />
        )}

        {activeTab === "addons" && (
          <AddonsTab
            serviceId={config.serviceId}
            editedConfig={editedConfig}
            updateConfig={updateConfig}
            getConfigValue={getConfigValue}
          />
        )}

        {activeTab === "refreshPowerScrub" && (
          <RefreshPowerScrubTab
            editedConfig={editedConfig}
            updateConfig={updateConfig}
            getConfigValue={getConfigValue}
          />
        )}

        {activeTab === "janitorial" && (
          <JanitorialAdminTab
            editedConfig={editedConfig}
            updateConfig={updateConfig}
            getConfigValue={getConfigValue}
          />
        )}

        {activeTab === "advanced" && (
          <AdvancedTab
            editedConfig={editedConfig}
            updateConfig={updateConfig}
          />
        )}
      </div>
    </div>
  );
};

const OverviewTab: React.FC<{
  config: ServiceConfig;
  editedConfig: Record<string, any>;
}> = ({ config, editedConfig }) => {
  const { t } = useTranslation();
  return (
    <div className="spe__tab-content">
      <h3 className="spe__section-title">{t("servicePricing.overview.title")}</h3>

      <div className="spe__info-grid">
        <div className="spe__info-card">
          <div className="spe__info-label">{t("servicePricing.overview.serviceId")}</div>
          <div className="spe__info-value">{config.serviceId}</div>
        </div>

        <div className="spe__info-card">
          <div className="spe__info-label">{t("servicePricing.overview.label")}</div>
          <div className="spe__info-value">{config.label}</div>
        </div>

        <div className="spe__info-card">
          <div className="spe__info-label">{t("servicePricing.overview.version")}</div>
          <div className="spe__info-value">{config.version}</div>
        </div>

        <div className="spe__info-card">
          <div className="spe__info-label">{t("servicePricing.overview.status")}</div>
          <div className="spe__info-value">
            <span className={`spe__status ${config.isActive ? "spe__status--active" : "spe__status--inactive"}`}>
              {config.isActive ? t("servicePricing.overview.active") : t("servicePricing.overview.inactive")}
            </span>
          </div>
        </div>
      </div>

      <div className="spe__description">
        <div className="spe__info-label">{t("servicePricing.overview.description")}</div>
        <p>{config.description}</p>
      </div>

      {config.tags && config.tags.length > 0 && (
        <div className="spe__tags">
          <div className="spe__info-label">{t("servicePricing.overview.tags")}</div>
          <div className="spe__tag-list">
            {config.tags.map((tag) => (
              <span key={tag} className="spe__tag">{tag}</span>
            ))}
          </div>
        </div>
      )}

      <div className="spe__config-summary">
        <div className="spe__info-label">{t("servicePricing.overview.configurationSummary")}</div>
        <pre className="spe__json-preview">
          {JSON.stringify(editedConfig, null, 2)}
        </pre>
      </div>
    </div>
  );
};

const FrequenciesTab: React.FC<{
  serviceId: string;
  editedConfig: Record<string, any>;
  updateConfig: (path: string[], value: any) => void;
  getConfigValue: (path: string[]) => any;
}> = ({ serviceId, editedConfig, updateConfig, getConfigValue }) => {
  const { t } = useTranslation();

  const updateLinkedFields = (
    primaryPath: string[],
    value: any,
    linkedPaths?: string[][]
  ) => {
    updateConfig(primaryPath, value);
    if (linkedPaths) {
      linkedPaths.forEach((path) => updateConfig(path, value));
    }
  };

  const renderFrequencyConfig = () => {
    if (serviceId === "saniscrub") {
      const fixtureRates = getConfigValue(["fixtureRates"]) || {};
      const minimums = getConfigValue(["minimums"]) || {};
      const frequencyMeta = getConfigValue(["frequencyMeta"]) || {};

      const frequencies = ["monthly", "twicePerMonth", "bimonthly", "quarterly"];

      const monthlyAndTwiceLinked =
        fixtureRates.monthly === fixtureRates.twicePerMonth &&
        minimums.monthly === minimums.twicePerMonth;

      return (
        <div className="spe__table-container">
          {monthlyAndTwiceLinked && (
            <div className="spe__note" style={{ marginBottom: "16px" }}>
              <FaLink /> {t("servicePricing.frequencies.linkedNote")}
            </div>
          )}

          <table className="spe__table">
            <thead>
              <tr>
                <th>{t("servicePricing.frequencies.frequency")}</th>
                <th>{t("servicePricing.frequencies.ratePerFixture")}</th>
                <th>{t("servicePricing.frequencies.minimumCharge")}</th>
                <th>{t("servicePricing.frequencies.visitsPerYear")}</th>
              </tr>
            </thead>
            <tbody>
              {frequencies.map((freq) => {
                const isLinkedToMonthly = freq === "monthly" || freq === "twicePerMonth";
                const linkedPaths = isLinkedToMonthly
                  ? freq === "monthly"
                    ? [["fixtureRates", "twicePerMonth"]]
                    : [["fixtureRates", "monthly"]]
                  : undefined;

                const linkedMinimumPaths = isLinkedToMonthly
                  ? freq === "monthly"
                    ? [["minimums", "twicePerMonth"]]
                    : [["minimums", "monthly"]]
                  : undefined;

                return (
                  <tr key={freq}>
                    <td className="spe__freq-label">
                      {freq === "twicePerMonth" ? t("servicePricing.frequencies.twicePerMonth") : freq.charAt(0).toUpperCase() + freq.slice(1)}
                      {isLinkedToMonthly && monthlyAndTwiceLinked && (
                        <span style={{ marginLeft: "8px", fontSize: "12px", color: "#2563eb" }}>
                          <FaLink />
                        </span>
                      )}
                    </td>
                    <td>
                      <input
                        type="number"
                        className="spe__input"
                        value={fixtureRates[freq] || ""}
                        onChange={(e) =>
                          updateLinkedFields(
                            ["fixtureRates", freq],
                            Number(e.target.value) || 0 || 0,
                            linkedPaths
                          )
                        }
                        step="0.01"
                        min="0"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="spe__input"
                        value={minimums[freq] || ""}
                        onChange={(e) =>
                          updateLinkedFields(
                            ["minimums", freq],
                            Number(e.target.value) || 0 || 0,
                            linkedMinimumPaths
                          )
                        }
                        step="0.01"
                        min="0"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="spe__input"
                        value={frequencyMeta[freq]?.visitsPerYear || ""}
                        onChange={(e) =>
                          updateConfig(
                            ["frequencyMeta", freq, "visitsPerYear"],
                            Number(e.target.value) || 0 || 0
                          )
                        }
                        min="0"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="spe__note" style={{ marginTop: "16px" }}>
            <FaLightbulb /> {t("servicePricing.frequencies.saniscrubTip")}
          </div>
        </div>
      );
    }

    if (serviceId === "rpmWindows") {
      const frequencyMultipliers = getConfigValue(["frequencyMultipliers"]) || {};
      const annualFrequencies = getConfigValue(["annualFrequencies"]) || {};

      const frequencies = ["weekly", "biweekly", "monthly", "quarterly"];

      return (
        <div className="spe__table-container">
          <table className="spe__table">
            <thead>
              <tr>
                <th>{t("servicePricing.frequencies.frequency")}</th>
                <th>{t("servicePricing.frequencies.multiplier")}</th>
                <th>{t("servicePricing.frequencies.visitsPerYear")}</th>
              </tr>
            </thead>
            <tbody>
              {frequencies.map((freq) => (
                <tr key={freq}>
                  <td className="spe__freq-label">
                    {freq.charAt(0).toUpperCase() + freq.slice(1).replace(/([A-Z])/g, " $1")}
                  </td>
                  <td>
                    <input
                      type="number"
                      className="spe__input"
                      value={frequencyMultipliers[freq] || ""}
                      onChange={(e) =>
                        updateConfig(["frequencyMultipliers", freq], Number(e.target.value) || 0 || 0)
                      }
                      step="0.01"
                      min="0"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="spe__input"
                      value={annualFrequencies[freq] || ""}
                      onChange={(e) =>
                        updateConfig(["annualFrequencies", freq], Number(e.target.value) || 0 || 0)
                      }
                      min="0"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="spe__field-group">
            <label className="spe__label">{t("servicePricing.frequencies.quarterlyFirstTimeMultiplier")}</label>
            <input
              type="number"
              className="spe__input"
              value={frequencyMultipliers.quarterlyFirstTime || ""}
              onChange={(e) =>
                updateConfig(["frequencyMultipliers", "quarterlyFirstTime"], Number(e.target.value) || 0)
              }
              step="0.01"
              min="0"
            />
          </div>
        </div>
      );
    }

    if (serviceId === "microfiberMopping") {
      const billingConversions = getConfigValue(["billingConversions"]) || {};
      const frequencies = ["weekly", "biweekly", "monthly"];

      return (
        <div className="spe__table-container">
          <table className="spe__table">
            <thead>
              <tr>
                <th>{t("servicePricing.frequencies.frequency")}</th>
                <th>{t("servicePricing.frequencies.annualMultiplier")}</th>
                <th>{t("servicePricing.frequencies.monthlyMultiplier")}</th>
              </tr>
            </thead>
            <tbody>
              {frequencies.map((freq) => (
                <tr key={freq}>
                  <td className="spe__freq-label">
                    {freq.charAt(0).toUpperCase() + freq.slice(1)}
                  </td>
                  <td>
                    <input
                      type="number"
                      className="spe__input"
                      value={billingConversions[freq]?.annualMultiplier || ""}
                      onChange={(e) =>
                        updateConfig(
                          ["billingConversions", freq, "annualMultiplier"],
                          Number(e.target.value) || 0
                        )
                      }
                      step="0.01"
                      min="0"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="spe__input"
                      value={billingConversions[freq]?.monthlyMultiplier || ""}
                      onChange={(e) =>
                        updateConfig(
                          ["billingConversions", freq, "monthlyMultiplier"],
                          Number(e.target.value) || 0
                        )
                      }
                      step="0.01"
                      min="0"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (serviceId === "sanipod") {
      const annualFrequencies = getConfigValue(["annualFrequencies"]) || {};
      const frequencies = ["weekly", "biweekly", "monthly"];

      return (
        <div className="spe__table-container">
          <table className="spe__table">
            <thead>
              <tr>
                <th>{t("servicePricing.frequencies.frequency")}</th>
                <th>{t("servicePricing.frequencies.annualVisits")}</th>
              </tr>
            </thead>
            <tbody>
              {frequencies.map((freq) => (
                <tr key={freq}>
                  <td className="spe__freq-label">
                    {freq.charAt(0).toUpperCase() + freq.slice(1)}
                  </td>
                  <td>
                    <input
                      type="number"
                      className="spe__input"
                      value={annualFrequencies[freq] || ""}
                      onChange={(e) =>
                        updateConfig(["annualFrequencies", freq], Number(e.target.value) || 0 || 0)
                      }
                      min="0"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="spe__field-group">
            <label className="spe__label">{t("servicePricing.frequencies.weeksPerMonth")}</label>
            <input
              type="number"
              className="spe__input"
              value={getConfigValue(["weeksPerMonth"]) || ""}
              onChange={(e) => updateConfig(["weeksPerMonth"], Number(e.target.value) || 0)}
              step="0.01"
              min="0"
            />
          </div>

          <div className="spe__field-group">
            <label className="spe__label">{t("servicePricing.frequencies.weeksPerYear")}</label>
            <input
              type="number"
              className="spe__input"
              value={getConfigValue(["weeksPerYear"]) || ""}
              onChange={(e) => updateConfig(["weeksPerYear"], Number(e.target.value) || 0)}
              min="0"
            />
          </div>
        </div>
      );
    }

    if (serviceId === "electrostaticSpray") {
      const billingConversions = getConfigValue(["billingConversions"]) || {};
      const frequencies = ["weekly", "biweekly", "monthly", "bimonthly", "quarterly"];

      return (
        <div className="spe__table-container">
          <table className="spe__table">
            <thead>
              <tr>
                <th>{t("servicePricing.frequencies.frequency")}</th>
                <th>{t("servicePricing.frequencies.monthlyMultiplier")}</th>
                <th>{t("servicePricing.frequencies.annualMultiplier")}</th>
              </tr>
            </thead>
            <tbody>
              {frequencies.map((freq) => (
                <tr key={freq}>
                  <td className="spe__freq-label">
                    {freq.charAt(0).toUpperCase() + freq.slice(1)}
                  </td>
                  <td>
                    <input
                      type="number"
                      className="spe__input"
                      value={billingConversions[freq]?.monthlyMultiplier || ""}
                      onChange={(e) =>
                        updateConfig(
                          ["billingConversions", freq, "monthlyMultiplier"],
                          Number(e.target.value) || 0
                        )
                      }
                      step="0.001"
                      min="0"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="spe__input"
                      value={billingConversions[freq]?.annualMultiplier || ""}
                      onChange={(e) =>
                        updateConfig(
                          ["billingConversions", freq, "annualMultiplier"],
                          Number(e.target.value) || 0
                        )
                      }
                      step="0.01"
                      min="0"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="spe__field-group">
            <label className="spe__label">{t("servicePricing.frequencies.actualWeeksPerMonth")}</label>
            <input
              type="number"
              className="spe__input"
              value={getConfigValue(["billingConversions", "actualWeeksPerMonth"]) || ""}
              onChange={(e) => updateConfig(["billingConversions", "actualWeeksPerMonth"], Number(e.target.value) || 0)}
              step="0.01"
              min="0"
            />
          </div>
        </div>
      );
    }

    if (serviceId === "refreshPowerScrub") {
      const billingConversions = getConfigValue(["billingConversions"]) || {};
      const frequencies = ["weekly", "biweekly", "monthly", "bimonthly", "quarterly"];

      return (
        <div className="spe__table-container">
          <table className="spe__table">
            <thead>
              <tr>
                <th>{t("servicePricing.frequencies.frequency")}</th>
                <th>{t("servicePricing.frequencies.monthlyMultiplier")}</th>
                <th>{t("servicePricing.frequencies.annualMultiplier")}</th>
                <th>{t("servicePricing.frequencies.descriptionHeader")}</th>
              </tr>
            </thead>
            <tbody>
              {frequencies.map((freq) => (
                <tr key={freq}>
                  <td className="spe__freq-label">
                    {freq.charAt(0).toUpperCase() + freq.slice(1)}
                  </td>
                  <td>
                    <input
                      type="number"
                      className="spe__input"
                      value={billingConversions[freq]?.monthlyMultiplier || ""}
                      onChange={(e) =>
                        updateConfig(
                          ["billingConversions", freq, "monthlyMultiplier"],
                          Number(e.target.value) || 0
                        )
                      }
                      step="0.001"
                      min="0"
                      placeholder={freq === "weekly" ? "4.33" : freq === "biweekly" ? "2.165" : freq === "monthly" ? "1.0" : freq === "bimonthly" ? "0.5" : "0.333"}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="spe__input"
                      value={billingConversions[freq]?.annualMultiplier || ""}
                      onChange={(e) =>
                        updateConfig(
                          ["billingConversions", freq, "annualMultiplier"],
                          Number(e.target.value) || 0
                        )
                      }
                      step="0.01"
                      min="0"
                      placeholder={freq === "weekly" ? "52" : freq === "biweekly" ? "26" : freq === "monthly" ? "12" : freq === "bimonthly" ? "6" : "4"}
                    />
                  </td>
                  <td className="spe__description">
                    <input
                      type="text"
                      className="spe__input"
                      value={billingConversions[freq]?.description || ""}
                      onChange={(e) =>
                        updateConfig(
                          ["billingConversions", freq, "description"],
                          e.target.value
                        )
                      }
                      placeholder={t("servicePricing.frequencies.descriptionPlaceholder", { freq })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="spe__note" style={{ marginTop: "16px" }}>
            <FaLightbulb /> {t("servicePricing.frequencies.refreshTip")}
          </div>
        </div>
      );
    }

    return <div className="spe__empty">{t("servicePricing.frequencies.empty")}</div>;
  };

  return (
    <div className="spe__tab-content">
      <h3 className="spe__section-title">{t("servicePricing.frequencies.title")}</h3>
      {renderFrequencyConfig()}
    </div>
  );
};

const GeographicTab: React.FC<{
  editedConfig: Record<string, any>;
  updateConfig: (path: string[], value: any) => void;
  getConfigValue: (path: string[]) => any;
}> = ({ editedConfig, updateConfig, getConfigValue }) => {
  const { t } = useTranslation();
  const insideBeltway = getConfigValue(["geographicPricing", "insideBeltway"]) || {};
  const outsideBeltway = getConfigValue(["geographicPricing", "outsideBeltway"]) || {};

  return (
    <div className="spe__tab-content">
      <h3 className="spe__section-title">{t("servicePricing.geographic.title")}</h3>

      <div className="spe__geo-grid">
        {}
        <div className="spe__geo-section">
          <h4 className="spe__subsection-title">{t("servicePricing.geographic.insideBeltway")}</h4>

          <div className="spe__field-group">
            <label className="spe__label">{t("servicePricing.geographic.ratePerFixture")}</label>
            <input
              type="number"
              className="spe__input"
              value={insideBeltway.ratePerFixture || ""}
              onChange={(e) =>
                updateConfig(
                  ["geographicPricing", "insideBeltway", "ratePerFixture"],
                  Number(e.target.value) || 0
                )
              }
              step="0.01"
              min="0"
            />
          </div>

          <div className="spe__field-group">
            <label className="spe__label">{t("servicePricing.geographic.weeklyMinimum")}</label>
            <input
              type="number"
              className="spe__input"
              value={insideBeltway.weeklyMinimum || ""}
              onChange={(e) =>
                updateConfig(
                  ["geographicPricing", "insideBeltway", "weeklyMinimum"],
                  Number(e.target.value) || 0
                )
              }
              step="0.01"
              min="0"
            />
          </div>

          <div className="spe__field-group">
            <label className="spe__label">{t("servicePricing.geographic.tripCharge")}</label>
            <input
              type="number"
              className="spe__input"
              value={insideBeltway.tripCharge || ""}
              onChange={(e) =>
                updateConfig(
                  ["geographicPricing", "insideBeltway", "tripCharge"],
                  Number(e.target.value) || 0
                )
              }
              step="0.01"
              min="0"
            />
          </div>

          <div className="spe__field-group">
            <label className="spe__label">{t("servicePricing.geographic.parkingFee")}</label>
            <input
              type="number"
              className="spe__input"
              value={insideBeltway.parkingFee || ""}
              onChange={(e) =>
                updateConfig(
                  ["geographicPricing", "insideBeltway", "parkingFee"],
                  Number(e.target.value) || 0
                )
              }
              step="0.01"
              min="0"
            />
          </div>
        </div>

        {}
        <div className="spe__geo-section">
          <h4 className="spe__subsection-title">{t("servicePricing.geographic.outsideBeltway")}</h4>

          <div className="spe__field-group">
            <label className="spe__label">{t("servicePricing.geographic.ratePerFixture")}</label>
            <input
              type="number"
              className="spe__input"
              value={outsideBeltway.ratePerFixture || ""}
              onChange={(e) =>
                updateConfig(
                  ["geographicPricing", "outsideBeltway", "ratePerFixture"],
                  Number(e.target.value) || 0
                )
              }
              step="0.01"
              min="0"
            />
          </div>

          <div className="spe__field-group">
            <label className="spe__label">{t("servicePricing.geographic.weeklyMinimum")}</label>
            <input
              type="number"
              className="spe__input"
              value={outsideBeltway.weeklyMinimum || ""}
              onChange={(e) =>
                updateConfig(
                  ["geographicPricing", "outsideBeltway", "weeklyMinimum"],
                  Number(e.target.value) || 0
                )
              }
              step="0.01"
              min="0"
            />
          </div>

          <div className="spe__field-group">
            <label className="spe__label">{t("servicePricing.geographic.tripCharge")}</label>
            <input
              type="number"
              className="spe__input"
              value={outsideBeltway.tripCharge || ""}
              onChange={(e) =>
                updateConfig(
                  ["geographicPricing", "outsideBeltway", "tripCharge"],
                  Number(e.target.value) || 0
                )
              }
              step="0.01"
              min="0"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const RateTiersTab: React.FC<{
  editedConfig: Record<string, any>;
  updateConfig: (path: string[], value: any) => void;
  getConfigValue: (path: string[]) => any;
}> = ({ editedConfig, updateConfig, getConfigValue }) => {
  const { t } = useTranslation();
  const rateTiers = getConfigValue(["rateTiers"]) || getConfigValue(["rateCategories"]) || {};
  const pathPrefix = editedConfig.rateTiers ? "rateTiers" : "rateCategories";

  const redRate = rateTiers.redRate || {};
  const greenRate = rateTiers.greenRate || {};

  return (
    <div className="spe__tab-content">
      <h3 className="spe__section-title">{t("servicePricing.rateTiers.title")}</h3>

      <div className="spe__geo-grid">
        {}
        <div className="spe__geo-section">
          <h4 className="spe__subsection-title">{t("servicePricing.rateTiers.redRate")}</h4>

          <div className="spe__field-group">
            <label className="spe__label">{t("servicePricing.rateTiers.multiplier")}</label>
            <input
              type="number"
              className="spe__input"
              value={redRate.multiplier || ""}
              onChange={(e) =>
                updateConfig([pathPrefix, "redRate", "multiplier"], Number(e.target.value) || 0)
              }
              step="0.01"
              min="0"
            />
          </div>

          <div className="spe__field-group">
            <label className="spe__label">{t("servicePricing.rateTiers.commissionRate")}</label>
            <input
              type="text"
              className="spe__input"
              value={redRate.commissionRate || ""}
              onChange={(e) =>
                updateConfig([pathPrefix, "redRate", "commissionRate"], e.target.value)
              }
              placeholder={t("servicePricing.rateTiers.redCommissionPlaceholder")}
            />
          </div>
        </div>

        {}
        <div className="spe__geo-section">
          <h4 className="spe__subsection-title">{t("servicePricing.rateTiers.greenRate")}</h4>

          <div className="spe__field-group">
            <label className="spe__label">{t("servicePricing.rateTiers.multiplier")}</label>
            <input
              type="number"
              className="spe__input"
              value={greenRate.multiplier || ""}
              onChange={(e) =>
                updateConfig([pathPrefix, "greenRate", "multiplier"], Number(e.target.value) || 0)
              }
              step="0.01"
              min="0"
            />
            <div className="spe__hint">{t("servicePricing.rateTiers.greenMultiplierHint")}</div>
          </div>

          <div className="spe__field-group">
            <label className="spe__label">{t("servicePricing.rateTiers.commissionRate")}</label>
            <input
              type="text"
              className="spe__input"
              value={greenRate.commissionRate || ""}
              onChange={(e) =>
                updateConfig([pathPrefix, "greenRate", "commissionRate"], e.target.value)
              }
              placeholder={t("servicePricing.rateTiers.greenCommissionPlaceholder")}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const MinimumsTab: React.FC<{
  serviceId: string;
  editedConfig: Record<string, any>;
  updateConfig: (path: string[], value: any) => void;
  getConfigValue: (path: string[]) => any;
}> = ({ serviceId, editedConfig, updateConfig, getConfigValue }) => {
  const { t } = useTranslation();
  if (serviceId === "saniclean") {
    const smallFacilityMinimum = getConfigValue(["smallFacilityMinimum"]) || {};
    const allInclusivePackage = getConfigValue(["allInclusivePackage"]) || {};

    return (
      <div className="spe__tab-content">
        <h3 className="spe__section-title">{t("servicePricing.minimums.title")}</h3>

        <div className="spe__geo-section">
          <h4 className="spe__subsection-title">{t("servicePricing.minimums.smallFacilityMinimum")}</h4>

          <div className="spe__field-group">
            <label className="spe__label">{t("servicePricing.minimums.fixtureThreshold")}</label>
            <input
              type="number"
              className="spe__input"
              value={smallFacilityMinimum.fixtureThreshold || ""}
              onChange={(e) =>
                updateConfig(["smallFacilityMinimum", "fixtureThreshold"], Number(e.target.value) || 0)
              }
              min="0"
            />
            <div className="spe__hint">{t("servicePricing.minimums.fixtureThresholdHint")}</div>
          </div>

          <div className="spe__field-group">
            <label className="spe__label">{t("servicePricing.minimums.minimumWeeklyCharge")}</label>
            <input
              type="number"
              className="spe__input"
              value={smallFacilityMinimum.minimumWeeklyCharge || ""}
              onChange={(e) =>
                updateConfig(["smallFacilityMinimum", "minimumWeeklyCharge"], Number(e.target.value) || 0)
              }
              step="0.01"
              min="0"
            />
          </div>

          <div className="spe__field-group">
            <label className="spe__checkbox-label">
              <input
                type="checkbox"
                checked={smallFacilityMinimum.includesTripCharge || false}
                onChange={(e) =>
                  updateConfig(["smallFacilityMinimum", "includesTripCharge"], e.target.checked)
                }
              />
              <span>{t("servicePricing.minimums.includesTripCharge")}</span>
            </label>
          </div>
        </div>

        <div className="spe__geo-section">
          <h4 className="spe__subsection-title">{t("servicePricing.minimums.allInclusivePackage")}</h4>

          <div className="spe__field-group">
            <label className="spe__label">{t("servicePricing.minimums.weeklyRatePerFixture")}</label>
            <input
              type="number"
              className="spe__input"
              value={allInclusivePackage.weeklyRatePerFixture || ""}
              onChange={(e) =>
                updateConfig(["allInclusivePackage", "weeklyRatePerFixture"], Number(e.target.value) || 0)
              }
              step="0.01"
              min="0"
            />
          </div>

          <div className="spe__field-group">
            <label className="spe__label">{t("servicePricing.minimums.autoAllInclusiveMinFixtures")}</label>
            <input
              type="number"
              className="spe__input"
              value={allInclusivePackage.autoAllInclusiveMinFixtures || ""}
              onChange={(e) =>
                updateConfig(["allInclusivePackage", "autoAllInclusiveMinFixtures"], Number(e.target.value) || 0)
              }
              min="0"
            />
          </div>

          <div className="spe__field-group">
            <label className="spe__checkbox-label">
              <input
                type="checkbox"
                checked={allInclusivePackage.includeAllAddOns || false}
                onChange={(e) =>
                  updateConfig(["allInclusivePackage", "includeAllAddOns"], e.target.checked)
                }
              />
              <span>{t("servicePricing.minimums.includeAllAddOns")}</span>
            </label>
          </div>

          <div className="spe__field-group">
            <label className="spe__checkbox-label">
              <input
                type="checkbox"
                checked={allInclusivePackage.waiveTripCharge || false}
                onChange={(e) =>
                  updateConfig(["allInclusivePackage", "waiveTripCharge"], e.target.checked)
                }
              />
              <span>{t("servicePricing.minimums.waiveTripCharge")}</span>
            </label>
          </div>

          <div className="spe__field-group">
            <label className="spe__checkbox-label">
              <input
                type="checkbox"
                checked={allInclusivePackage.waiveWarrantyFees || false}
                onChange={(e) =>
                  updateConfig(["allInclusivePackage", "waiveWarrantyFees"], e.target.checked)
                }
              />
              <span>{t("servicePricing.minimums.waiveWarrantyFees")}</span>
            </label>
          </div>
        </div>
      </div>
    );
  }

  if (serviceId === "microfiberMopping") {
    const standalonePricing = getConfigValue(["standalonePricing"]) || {};

    return (
      <div className="spe__tab-content">
        <h3 className="spe__section-title">{t("servicePricing.minimums.title")}</h3>

        <div className="spe__geo-section">
          <h4 className="spe__subsection-title">{t("servicePricing.minimums.standalonePricing")}</h4>

          <div className="spe__field-group">
            <label className="spe__label">{t("servicePricing.minimums.standaloneMinimum")}</label>
            <input
              type="number"
              className="spe__input"
              value={standalonePricing.standaloneMinimum || ""}
              onChange={(e) =>
                updateConfig(["standalonePricing", "standaloneMinimum"], Number(e.target.value) || 0)
              }
              step="0.01"
              min="0"
            />
          </div>

          <div className="spe__field-group">
            <label className="spe__checkbox-label">
              <input
                type="checkbox"
                checked={standalonePricing.includeTripCharge || false}
                onChange={(e) =>
                  updateConfig(["standalonePricing", "includeTripCharge"], e.target.checked)
                }
              />
              <span>{t("servicePricing.minimums.includeTripCharge")}</span>
            </label>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="spe__tab-content">
      <h3 className="spe__section-title">{t("servicePricing.minimums.title")}</h3>
      <div className="spe__empty">{t("servicePricing.minimums.empty")}</div>
    </div>
  );
};

const MultipliersTab: React.FC<{
  serviceId: string;
  editedConfig: Record<string, any>;
  updateConfig: (path: string[], value: any) => void;
  getConfigValue: (path: string[]) => any;
}> = ({ serviceId, editedConfig, updateConfig, getConfigValue }) => {
  const { t } = useTranslation();
  if (serviceId === "saniscrub" || serviceId === "carpetCleaning") {
    const installMultipliers = getConfigValue(["installMultipliers"]) || {};

    return (
      <div className="spe__tab-content">
        <h3 className="spe__section-title">{t("servicePricing.multipliers.installTitle")}</h3>

        <div className="spe__field-group">
          <label className="spe__label">{t("servicePricing.multipliers.dirtyFirstTimeMultiplier")}</label>
          <input
            type="number"
            className="spe__input"
            value={installMultipliers.dirty || ""}
            onChange={(e) =>
              updateConfig(["installMultipliers", "dirty"], Number(e.target.value) || 0)
            }
            step="0.01"
            min="0"
          />
          <div className="spe__hint">{t("servicePricing.multipliers.dirtyHint")}</div>
        </div>

        <div className="spe__field-group">
          <label className="spe__label">{t("servicePricing.multipliers.cleanMultiplier")}</label>
          <input
            type="number"
            className="spe__input"
            value={installMultipliers.clean || ""}
            onChange={(e) =>
              updateConfig(["installMultipliers", "clean"], Number(e.target.value) || 0)
            }
            step="0.01"
            min="0"
          />
          <div className="spe__hint">{t("servicePricing.multipliers.cleanHint")}</div>
        </div>
      </div>
    );
  }

  if (serviceId === "rpmWindows") {
    const installMultiplierFirstTime = getConfigValue(["installMultiplierFirstTime"]) || "";
    const installMultiplierClean = getConfigValue(["installMultiplierClean"]) || "";

    return (
      <div className="spe__tab-content">
        <h3 className="spe__section-title">{t("servicePricing.multipliers.installTitle")}</h3>

        <div className="spe__field-group">
          <label className="spe__label">{t("servicePricing.multipliers.firstTimeInstallMultiplier")}</label>
          <input
            type="number"
            className="spe__input"
            value={installMultiplierFirstTime}
            onChange={(e) =>
              updateConfig(["installMultiplierFirstTime"], Number(e.target.value) || 0)
            }
            step="0.01"
            min="0"
          />
          <div className="spe__hint">{t("servicePricing.multipliers.firstTimeHint")}</div>
        </div>

        <div className="spe__field-group">
          <label className="spe__label">{t("servicePricing.multipliers.cleanInstallMultiplier")}</label>
          <input
            type="number"
            className="spe__input"
            value={installMultiplierClean}
            onChange={(e) =>
              updateConfig(["installMultiplierClean"], Number(e.target.value) || 0)
            }
            step="0.01"
            min="0"
          />
          <div className="spe__hint">{t("servicePricing.multipliers.cleanHint")}</div>
        </div>
      </div>
    );
  }

  if (serviceId === "refreshPowerScrub") {
    const billingConversions = getConfigValue(["billingConversions"]) || {};
    const frequencies = ["weekly", "biweekly", "monthly", "bimonthly", "quarterly"];

    return (
      <div className="spe__tab-content">
        <h3 className="spe__section-title">{t("servicePricing.multipliers.billingConversionTitle")}</h3>

        <div className="spe__table-container">
          <table className="spe__table">
            <thead>
              <tr>
                <th>{t("servicePricing.frequencies.frequency")}</th>
                <th>{t("servicePricing.frequencies.monthlyMultiplier")}</th>
                <th>{t("servicePricing.frequencies.annualMultiplier")}</th>
                <th>{t("servicePricing.frequencies.descriptionHeader")}</th>
              </tr>
            </thead>
            <tbody>
              {frequencies.map((freq) => (
                <tr key={freq}>
                  <td className="spe__freq-label">
                    {freq.charAt(0).toUpperCase() + freq.slice(1)}
                  </td>
                  <td>
                    <input
                      type="number"
                      className="spe__input"
                      value={billingConversions[freq]?.monthlyMultiplier || ""}
                      onChange={(e) =>
                        updateConfig(
                          ["billingConversions", freq, "monthlyMultiplier"],
                          Number(e.target.value) || 0
                        )
                      }
                      step="0.001"
                      min="0"
                      placeholder={
                        freq === "weekly" ? "4.33" :
                        freq === "biweekly" ? "2.165" :
                        freq === "monthly" ? "1.0" :
                        freq === "bimonthly" ? "0.5" : "0.333"
                      }
                    />
                    <div className="spe__hint">
                      {freq === "weekly" ? t("servicePricing.multipliers.weeklyHint") :
                       freq === "biweekly" ? t("servicePricing.multipliers.biweeklyHint") :
                       freq === "monthly" ? t("servicePricing.multipliers.monthlyHint") :
                       freq === "bimonthly" ? t("servicePricing.multipliers.bimonthlyHint") : t("servicePricing.multipliers.quarterlyHint")}
                    </div>
                  </td>
                  <td>
                    <input
                      type="number"
                      className="spe__input"
                      value={billingConversions[freq]?.annualMultiplier || ""}
                      onChange={(e) =>
                        updateConfig(
                          ["billingConversions", freq, "annualMultiplier"],
                          Number(e.target.value) || 0
                        )
                      }
                      step="0.01"
                      min="0"
                      placeholder={
                        freq === "weekly" ? "52" :
                        freq === "biweekly" ? "26" :
                        freq === "monthly" ? "12" :
                        freq === "bimonthly" ? "6" : "4"
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      className="spe__input"
                      value={billingConversions[freq]?.description || ""}
                      onChange={(e) =>
                        updateConfig(
                          ["billingConversions", freq, "description"],
                          e.target.value
                        )
                      }
                      placeholder={t("servicePricing.multipliers.billingConversionPlaceholder", { freq })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="spe__note" style={{ marginTop: "16px" }}>
            <FaLightbulb /> {t("servicePricing.multipliers.refreshNote")}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="spe__tab-content">
      <h3 className="spe__section-title">{t("servicePricing.multipliers.title")}</h3>
      <div className="spe__empty">{t("servicePricing.multipliers.empty")}</div>
    </div>
  );
};

const ComponentsTab: React.FC<{
  editedConfig: Record<string, any>;
  updateConfig: (path: string[], value: any) => void;
  getConfigValue: (path: string[]) => any;
}> = ({ editedConfig, updateConfig, getConfigValue }) => {
  const { t } = useTranslation();
  const facilityComponents = getConfigValue(["facilityComponents"]) || {};
  const urinals = facilityComponents.urinals || {};
  const maleToilets = facilityComponents.maleToilets || {};
  const femaleToilets = facilityComponents.femaleToilets || {};
  const sinks = facilityComponents.sinks || {};
  const soapUpgrades = getConfigValue(["soapUpgrades"]) || {};
  const warrantyFeePerDispenser = getConfigValue(["warrantyFeePerDispenser"]) || "";

  return (
    <div className="spe__tab-content">
      <h3 className="spe__section-title">{t("servicePricing.components.title")}</h3>

      <div className="spe__geo-section">
        <h4 className="spe__subsection-title">{t("servicePricing.components.urinals")}</h4>

        <div className="spe__field-group">
          <label className="spe__label">{t("servicePricing.components.urinalScreen")}</label>
          <input
            type="number"
            className="spe__input"
            value={urinals.urinalScreen || ""}
            onChange={(e) =>
              updateConfig(["facilityComponents", "urinals", "urinalScreen"], Number(e.target.value) || 0)
            }
            step="0.01"
            min="0"
          />
        </div>

        <div className="spe__field-group">
          <label className="spe__label">{t("servicePricing.components.urinalMat")}</label>
          <input
            type="number"
            className="spe__input"
            value={urinals.urinalMat || ""}
            onChange={(e) =>
              updateConfig(["facilityComponents", "urinals", "urinalMat"], Number(e.target.value) || 0)
            }
            step="0.01"
            min="0"
          />
        </div>
      </div>

      <div className="spe__geo-section">
        <h4 className="spe__subsection-title">{t("servicePricing.components.maleToilets")}</h4>

        <div className="spe__field-group">
          <label className="spe__label">{t("servicePricing.components.toiletClips")}</label>
          <input
            type="number"
            className="spe__input"
            value={maleToilets.toiletClips || ""}
            onChange={(e) =>
              updateConfig(["facilityComponents", "maleToilets", "toiletClips"], Number(e.target.value) || 0)
            }
            step="0.01"
            min="0"
          />
        </div>

        <div className="spe__field-group">
          <label className="spe__label">{t("servicePricing.components.seatCoverDispenser")}</label>
          <input
            type="number"
            className="spe__input"
            value={maleToilets.seatCoverDispenser || ""}
            onChange={(e) =>
              updateConfig(["facilityComponents", "maleToilets", "seatCoverDispenser"], Number(e.target.value) || 0)
            }
            step="0.01"
            min="0"
          />
        </div>
      </div>

      <div className="spe__geo-section">
        <h4 className="spe__subsection-title">{t("servicePricing.components.femaleToilets")}</h4>

        <div className="spe__field-group">
          <label className="spe__label">{t("servicePricing.components.sanipodService")}</label>
          <input
            type="number"
            className="spe__input"
            value={femaleToilets.sanipodService || ""}
            onChange={(e) =>
              updateConfig(["facilityComponents", "femaleToilets", "sanipodService"], Number(e.target.value) || 0)
            }
            step="0.01"
            min="0"
          />
        </div>
      </div>

      <div className="spe__geo-section">
        <h4 className="spe__subsection-title">{t("servicePricing.components.sinks")}</h4>

        <div className="spe__field-group">
          <label className="spe__label">{t("servicePricing.components.ratioSinkToSoap")}</label>
          <input
            type="number"
            className="spe__input"
            value={sinks.ratioSinkToSoap || ""}
            onChange={(e) =>
              updateConfig(["facilityComponents", "sinks", "ratioSinkToSoap"], Number(e.target.value) || 0)
            }
            step="0.01"
            min="0"
          />
        </div>

        <div className="spe__field-group">
          <label className="spe__label">{t("servicePricing.components.ratioSinkToAirFreshener")}</label>
          <input
            type="number"
            className="spe__input"
            value={sinks.ratioSinkToAirFreshener || ""}
            onChange={(e) =>
              updateConfig(["facilityComponents", "sinks", "ratioSinkToAirFreshener"], Number(e.target.value) || 0)
            }
            step="0.01"
            min="0"
          />
        </div>
      </div>

      <div className="spe__geo-section">
        <h4 className="spe__subsection-title">{t("servicePricing.components.soapUpgradesWarranty")}</h4>

        <div className="spe__field-group">
          <label className="spe__label">{t("servicePricing.components.standardToLuxury")}</label>
          <input
            type="number"
            className="spe__input"
            value={soapUpgrades.standardToLuxury || ""}
            onChange={(e) =>
              updateConfig(["soapUpgrades", "standardToLuxury"], Number(e.target.value) || 0)
            }
            step="0.01"
            min="0"
          />
        </div>

        <div className="spe__field-group">
          <label className="spe__label">{t("servicePricing.components.warrantyFeePerDispenser")}</label>
          <input
            type="number"
            className="spe__input"
            value={warrantyFeePerDispenser}
            onChange={(e) =>
              updateConfig(["warrantyFeePerDispenser"], Number(e.target.value) || 0)
            }
            step="0.01"
            min="0"
          />
        </div>
      </div>
    </div>
  );
};

const AddonsTab: React.FC<{
  serviceId: string;
  editedConfig: Record<string, any>;
  updateConfig: (path: string[], value: any) => void;
  getConfigValue: (path: string[]) => any;
}> = ({ serviceId, editedConfig, updateConfig, getConfigValue }) => {
  const { t } = useTranslation();
  if (serviceId === "saniclean") {
    const addOnServices = getConfigValue(["addOnServices"]) || {};
    const microfiberMopping = addOnServices.microfiberMopping || {};

    return (
      <div className="spe__tab-content">
        <h3 className="spe__section-title">{t("servicePricing.addons.title")}</h3>

        <div className="spe__geo-section">
          <h4 className="spe__subsection-title">{t("servicePricing.addons.microfiberMopping")}</h4>

          <div className="spe__field-group">
            <label className="spe__label">{t("servicePricing.addons.pricePerBathroom")}</label>
            <input
              type="number"
              className="spe__input"
              value={microfiberMopping.pricePerBathroom || ""}
              onChange={(e) =>
                updateConfig(["addOnServices", "microfiberMopping", "pricePerBathroom"], Number(e.target.value) || 0)
              }
              step="0.01"
              min="0"
            />
          </div>
        </div>
      </div>
    );
  }

  if (serviceId === "microfiberMopping") {
    const tripCharges = getConfigValue(["tripCharges"]) || {};
    const hugeBathroomPricing = getConfigValue(["hugeBathroomPricing"]) || {};
    const extraAreaPricing = getConfigValue(["extraAreaPricing"]) || {};

    return (
      <div className="spe__tab-content">
        <h3 className="spe__section-title">{t("servicePricing.addons.additionalPricingTitle")}</h3>

        <div className="spe__geo-section">
          <h4 className="spe__subsection-title">{t("servicePricing.addons.tripCharges")}</h4>

          <div className="spe__field-group">
            <label className="spe__label">{t("servicePricing.addons.insideBeltway")}</label>
            <input
              type="number"
              className="spe__input"
              value={tripCharges.insideBeltway || ""}
              onChange={(e) =>
                updateConfig(["tripCharges", "insideBeltway"], Number(e.target.value) || 0)
              }
              step="0.01"
              min="0"
            />
          </div>

          <div className="spe__field-group">
            <label className="spe__label">{t("servicePricing.addons.outsideBeltway")}</label>
            <input
              type="number"
              className="spe__input"
              value={tripCharges.outsideBeltway || ""}
              onChange={(e) =>
                updateConfig(["tripCharges", "outsideBeltway"], Number(e.target.value) || 0)
              }
              step="0.01"
              min="0"
            />
          </div>

          <div className="spe__field-group">
            <label className="spe__label">{t("servicePricing.addons.standard")}</label>
            <input
              type="number"
              className="spe__input"
              value={tripCharges.standard || ""}
              onChange={(e) =>
                updateConfig(["tripCharges", "standard"], Number(e.target.value) || 0)
              }
              step="0.01"
              min="0"
            />
          </div>
        </div>

        <div className="spe__geo-section">
          <h4 className="spe__subsection-title">{t("servicePricing.addons.hugeBathroomPricing")}</h4>

          <div className="spe__field-group">
            <label className="spe__checkbox-label">
              <input
                type="checkbox"
                checked={hugeBathroomPricing.enabled || false}
                onChange={(e) =>
                  updateConfig(["hugeBathroomPricing", "enabled"], e.target.checked)
                }
              />
              <span>{t("servicePricing.addons.enableHugeBathroom")}</span>
            </label>
          </div>

          <div className="spe__field-group">
            <label className="spe__label">{t("servicePricing.addons.ratePerSqFt")}</label>
            <input
              type="number"
              className="spe__input"
              value={hugeBathroomPricing.ratePerSqFt || ""}
              onChange={(e) =>
                updateConfig(["hugeBathroomPricing", "ratePerSqFt"], Number(e.target.value) || 0)
              }
              step="0.01"
              min="0"
            />
          </div>

          <div className="spe__field-group">
            <label className="spe__label">{t("servicePricing.addons.sqFtUnit")}</label>
            <input
              type="number"
              className="spe__input"
              value={hugeBathroomPricing.sqFtUnit || ""}
              onChange={(e) =>
                updateConfig(["hugeBathroomPricing", "sqFtUnit"], Number(e.target.value) || 0)
              }
              min="0"
            />
            <div className="spe__hint">{t("servicePricing.addons.sqFtUnitHint")}</div>
          </div>
        </div>

        <div className="spe__geo-section">
          <h4 className="spe__subsection-title">{t("servicePricing.addons.extraAreaPricing")}</h4>

          <div className="spe__field-group">
            <label className="spe__label">{t("servicePricing.addons.singleLargeAreaRate")}</label>
            <input
              type="number"
              className="spe__input"
              value={extraAreaPricing.singleLargeAreaRate || ""}
              onChange={(e) =>
                updateConfig(["extraAreaPricing", "singleLargeAreaRate"], Number(e.target.value) || 0)
              }
              step="0.01"
              min="0"
            />
          </div>

          <div className="spe__field-group">
            <label className="spe__label">{t("servicePricing.addons.extraAreaSqFtUnit")}</label>
            <input
              type="number"
              className="spe__input"
              value={extraAreaPricing.extraAreaSqFtUnit || ""}
              onChange={(e) =>
                updateConfig(["extraAreaPricing", "extraAreaSqFtUnit"], Number(e.target.value) || 0)
              }
              min="0"
            />
          </div>

          <div className="spe__field-group">
            <label className="spe__label">{t("servicePricing.addons.ratePerUnit")}</label>
            <input
              type="number"
              className="spe__input"
              value={extraAreaPricing.extraAreaRatePerUnit || ""}
              onChange={(e) =>
                updateConfig(["extraAreaPricing", "extraAreaRatePerUnit"], Number(e.target.value) || 0)
              }
              step="0.01"
              min="0"
            />
          </div>
        </div>
      </div>
    );
  }

  if (serviceId === "electrostaticSpray") {
    const tripCharges = getConfigValue(["tripCharges"]) || {};

    return (
      <div className="spe__tab-content">
        <h3 className="spe__section-title">{t("servicePricing.addons.pricingRatesTripChargesTitle")}</h3>

        <div className="spe__geo-section">
          <h4 className="spe__subsection-title">{t("servicePricing.addons.pricingRates")}</h4>

          <div className="spe__field-group">
            <label className="spe__label">{t("servicePricing.addons.ratePerRoom")}</label>
            <input
              type="number"
              className="spe__input"
              value={getConfigValue(["ratePerRoom"]) || ""}
              onChange={(e) => updateConfig(["ratePerRoom"], Number(e.target.value) || 0)}
              step="0.01"
              min="0"
            />
            <div className="spe__hint">{t("servicePricing.addons.ratePerRoomHint")}</div>
          </div>

          <div className="spe__field-group">
            <label className="spe__label">{t("servicePricing.addons.ratePerThousandSqFt")}</label>
            <input
              type="number"
              className="spe__input"
              value={getConfigValue(["ratePerThousandSqFt"]) || ""}
              onChange={(e) => updateConfig(["ratePerThousandSqFt"], Number(e.target.value) || 0)}
              step="0.01"
              min="0"
            />
            <div className="spe__hint">{t("servicePricing.addons.ratePerThousandSqFtHint")}</div>
          </div>

          <div className="spe__field-group">
            <label className="spe__label">{t("servicePricing.addons.sqFtUnit")}</label>
            <input
              type="number"
              className="spe__input"
              value={getConfigValue(["sqFtUnit"]) || ""}
              onChange={(e) => updateConfig(["sqFtUnit"], Number(e.target.value) || 0)}
              min="0"
            />
            <div className="spe__hint">{t("servicePricing.addons.sqFtUnitElectrostaticHint")}</div>
          </div>
        </div>

        <div className="spe__geo-section">
          <h4 className="spe__subsection-title">{t("servicePricing.addons.tripCharges")}</h4>

          <div className="spe__field-group">
            <label className="spe__label">{t("servicePricing.addons.insideBeltway")}</label>
            <input
              type="number"
              className="spe__input"
              value={tripCharges.insideBeltway || ""}
              onChange={(e) =>
                updateConfig(["tripCharges", "insideBeltway"], Number(e.target.value) || 0)
              }
              step="0.01"
              min="0"
            />
          </div>

          <div className="spe__field-group">
            <label className="spe__label">{t("servicePricing.addons.outsideBeltway")}</label>
            <input
              type="number"
              className="spe__input"
              value={tripCharges.outsideBeltway || ""}
              onChange={(e) =>
                updateConfig(["tripCharges", "outsideBeltway"], Number(e.target.value) || 0)
              }
              step="0.01"
              min="0"
            />
          </div>

          <div className="spe__field-group">
            <label className="spe__label">{t("servicePricing.addons.standard")}</label>
            <input
              type="number"
              className="spe__input"
              value={tripCharges.standard || ""}
              onChange={(e) =>
                updateConfig(["tripCharges", "standard"], Number(e.target.value) || 0)
              }
              step="0.01"
              min="0"
            />
          </div>
        </div>

        <div className="spe__geo-section">
          <h4 className="spe__subsection-title">{t("servicePricing.addons.contractSettings")}</h4>

          <div className="spe__field-group">
            <label className="spe__label">{t("servicePricing.addons.minContractMonths")}</label>
            <input
              type="number"
              className="spe__input"
              value={getConfigValue(["minContractMonths"]) || ""}
              onChange={(e) => updateConfig(["minContractMonths"], Number(e.target.value) || 0)}
              min="0"
            />
          </div>

          <div className="spe__field-group">
            <label className="spe__label">{t("servicePricing.addons.maxContractMonths")}</label>
            <input
              type="number"
              className="spe__input"
              value={getConfigValue(["maxContractMonths"]) || ""}
              onChange={(e) => updateConfig(["maxContractMonths"], Number(e.target.value) || 0)}
              min="0"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="spe__tab-content">
      <h3 className="spe__section-title">{t("servicePricing.addons.title")}</h3>
      <div className="spe__empty">{t("servicePricing.addons.empty")}</div>
    </div>
  );
};

const RefreshPowerScrubTab: React.FC<{
  editedConfig: Record<string, any>;
  updateConfig: (path: string[], value: any) => void;
  getConfigValue: (path: string[]) => any;
}> = ({ editedConfig, updateConfig, getConfigValue }) => {
  const { t } = useTranslation();
  const coreRates = getConfigValue(["coreRates"]) || {};
  const areaSpecificPricing = getConfigValue(["areaSpecificPricing"]) || {};
  const squareFootagePricing = getConfigValue(["squareFootagePricing"]) || {};

  return (
    <div className="spe__tab-content">
      <h3 className="spe__section-title">{t("servicePricing.refreshPowerScrub.title")}</h3>

      {}
      <div className="spe__geo-section">
        <h4 className="spe__subsection-title">{t("servicePricing.refreshPowerScrub.coreRates")}</h4>

        <div className="spe__field-group">
          <label className="spe__label">{t("servicePricing.refreshPowerScrub.defaultHourlyRate")}</label>
          <input
            type="number"
            className="spe__input"
            value={coreRates.defaultHourlyRate || ""}
            onChange={(e) =>
              updateConfig(["coreRates", "defaultHourlyRate"], Number(e.target.value) || 0)
            }
            step="0.01"
            min="0"
            placeholder="200"
          />
          <div className="spe__hint">{t("servicePricing.refreshPowerScrub.defaultHourlyRateHint")}</div>
        </div>

        <div className="spe__field-group">
          <label className="spe__label">{t("servicePricing.refreshPowerScrub.perWorkerRate")}</label>
          <input
            type="number"
            className="spe__input"
            value={coreRates.perWorkerRate || ""}
            onChange={(e) =>
              updateConfig(["coreRates", "perWorkerRate"], Number(e.target.value) || 0)
            }
            step="0.01"
            min="0"
            placeholder="200"
          />
          <div className="spe__hint">{t("servicePricing.refreshPowerScrub.perWorkerRateHint")}</div>
        </div>

        <div className="spe__field-group">
          <label className="spe__label">{t("servicePricing.refreshPowerScrub.perHourRate")}</label>
          <input
            type="number"
            className="spe__input"
            value={coreRates.perHourRate || ""}
            onChange={(e) =>
              updateConfig(["coreRates", "perHourRate"], Number(e.target.value) || 0)
            }
            step="0.01"
            min="0"
            placeholder="400"
          />
          <div className="spe__hint">{t("servicePricing.refreshPowerScrub.perHourRateHint")}</div>
        </div>

        <div className="spe__field-group">
          <label className="spe__label">{t("servicePricing.refreshPowerScrub.tripCharge")}</label>
          <input
            type="number"
            className="spe__input"
            value={coreRates.tripCharge || ""}
            onChange={(e) =>
              updateConfig(["coreRates", "tripCharge"], Number(e.target.value) || 0)
            }
            step="0.01"
            min="0"
            placeholder="75"
          />
          <div className="spe__hint">{t("servicePricing.refreshPowerScrub.tripChargeHint")}</div>
        </div>

        <div className="spe__field-group">
          <label className="spe__label">{t("servicePricing.refreshPowerScrub.minimumVisit")}</label>
          <input
            type="number"
            className="spe__input"
            value={coreRates.minimumVisit || ""}
            onChange={(e) =>
              updateConfig(["coreRates", "minimumVisit"], Number(e.target.value) || 0)
            }
            step="0.01"
            min="0"
            placeholder="475"
          />
          <div className="spe__hint">{t("servicePricing.refreshPowerScrub.minimumVisitHint")}</div>
        </div>
      </div>

      {}
      <div className="spe__geo-section">
        <h4 className="spe__subsection-title">{t("servicePricing.refreshPowerScrub.areaSpecificPricing")}</h4>

        <div className="spe__field-row">
          <div className="spe__field-group">
            <label className="spe__label">{t("servicePricing.refreshPowerScrub.kitchenSmallMedium")}</label>
            <input
              type="number"
              className="spe__input"
              value={areaSpecificPricing.kitchen?.smallMedium || ""}
              onChange={(e) =>
                updateConfig(["areaSpecificPricing", "kitchen", "smallMedium"], Number(e.target.value) || 0)
              }
              step="0.01"
              min="0"
              placeholder="1500"
            />
            <div className="spe__hint">{t("servicePricing.refreshPowerScrub.kitchenSmallMediumHint")}</div>
          </div>

          <div className="spe__field-group">
            <label className="spe__label">{t("servicePricing.refreshPowerScrub.kitchenLarge")}</label>
            <input
              type="number"
              className="spe__input"
              value={areaSpecificPricing.kitchen?.large || ""}
              onChange={(e) =>
                updateConfig(["areaSpecificPricing", "kitchen", "large"], Number(e.target.value) || 0)
              }
              step="0.01"
              min="0"
              placeholder="2500"
            />
            <div className="spe__hint">{t("servicePricing.refreshPowerScrub.kitchenLargeHint")}</div>
          </div>
        </div>

        <div className="spe__field-group">
          <label className="spe__label">{t("servicePricing.refreshPowerScrub.frontOfHouseRate")}</label>
          <input
            type="number"
            className="spe__input"
            value={areaSpecificPricing.frontOfHouse || ""}
            onChange={(e) =>
              updateConfig(["areaSpecificPricing", "frontOfHouse"], Number(e.target.value) || 0)
            }
            step="0.01"
            min="0"
            placeholder="2500"
          />
          <div className="spe__hint">{t("servicePricing.refreshPowerScrub.frontOfHouseRateHint")}</div>
        </div>

        <div className="spe__field-row">
          <div className="spe__field-group">
            <label className="spe__label">{t("servicePricing.refreshPowerScrub.patioStandalone")}</label>
            <input
              type="number"
              className="spe__input"
              value={areaSpecificPricing.patio?.standalone || ""}
              onChange={(e) =>
                updateConfig(["areaSpecificPricing", "patio", "standalone"], Number(e.target.value) || 0)
              }
              step="0.01"
              min="0"
              placeholder="800"
            />
            <div className="spe__hint">{t("servicePricing.refreshPowerScrub.patioStandaloneHint")}</div>
          </div>

          <div className="spe__field-group">
            <label className="spe__label">{t("servicePricing.refreshPowerScrub.patioUpsell")}</label>
            <input
              type="number"
              className="spe__input"
              value={areaSpecificPricing.patio?.upsell || ""}
              onChange={(e) =>
                updateConfig(["areaSpecificPricing", "patio", "upsell"], Number(e.target.value) || 0)
              }
              step="0.01"
              min="0"
              placeholder="500"
            />
            <div className="spe__hint">{t("servicePricing.refreshPowerScrub.patioUpsellHint")}</div>
          </div>
        </div>
      </div>

      {}
      <div className="spe__geo-section">
        <h4 className="spe__subsection-title">{t("servicePricing.refreshPowerScrub.squareFootagePricing")}</h4>

        <div className="spe__field-group">
          <label className="spe__label">{t("servicePricing.refreshPowerScrub.fixedFee")}</label>
          <input
            type="number"
            className="spe__input"
            value={squareFootagePricing.fixedFee || ""}
            onChange={(e) =>
              updateConfig(["squareFootagePricing", "fixedFee"], Number(e.target.value) || 0)
            }
            step="0.01"
            min="0"
            placeholder="200"
          />
          <div className="spe__hint">{t("servicePricing.refreshPowerScrub.fixedFeeHint")}</div>
        </div>

        <div className="spe__field-row">
          <div className="spe__field-group">
            <label className="spe__label">{t("servicePricing.refreshPowerScrub.insideRate")}</label>
            <input
              type="number"
              className="spe__input"
              value={squareFootagePricing.insideRate || ""}
              onChange={(e) =>
                updateConfig(["squareFootagePricing", "insideRate"], Number(e.target.value) || 0)
              }
              step="0.01"
              min="0"
              placeholder="0.6"
            />
            <div className="spe__hint">{t("servicePricing.refreshPowerScrub.insideRateHint")}</div>
          </div>

          <div className="spe__field-group">
            <label className="spe__label">{t("servicePricing.refreshPowerScrub.outsideRate")}</label>
            <input
              type="number"
              className="spe__input"
              value={squareFootagePricing.outsideRate || ""}
              onChange={(e) =>
                updateConfig(["squareFootagePricing", "outsideRate"], Number(e.target.value) || 0)
              }
              step="0.01"
              min="0"
              placeholder="0.4"
            />
            <div className="spe__hint">{t("servicePricing.refreshPowerScrub.outsideRateHint")}</div>
          </div>
        </div>
      </div>

      <div className="spe__note" style={{ marginTop: "24px" }}>
        <FaLightbulb /> <strong>{t("servicePricing.refreshPowerScrub.rulesTitle")}</strong>
        <br />• <strong>{t("servicePricing.refreshPowerScrub.ruleTripCharge")}</strong> {t("servicePricing.refreshPowerScrub.ruleTripChargeValue", { value: coreRates.tripCharge || 75 })}
        <br />• <strong>{t("servicePricing.refreshPowerScrub.ruleHourlyRate")}</strong> {t("servicePricing.refreshPowerScrub.ruleHourlyRateValue", { value: coreRates.defaultHourlyRate || 200 })}
        <br />• <strong>{t("servicePricing.refreshPowerScrub.ruleMinimum")}</strong> {t("servicePricing.refreshPowerScrub.ruleMinimumValue", { value: coreRates.minimumVisit || 475 })}
        <br />• <strong>{t("servicePricing.refreshPowerScrub.ruleAreas")}</strong> {t("servicePricing.refreshPowerScrub.ruleAreasValue")}
        <br />• <strong>{t("servicePricing.refreshPowerScrub.rulePricingTypes")}</strong> {t("servicePricing.refreshPowerScrub.rulePricingTypesValue")}
      </div>
    </div>
  );
};

const AdvancedTab: React.FC<{
  editedConfig: Record<string, any>;
  updateConfig: (path: string[], value: any) => void;
}> = ({ editedConfig, updateConfig }) => {
  const { t } = useTranslation();
  const [jsonText, setJsonText] = useState(JSON.stringify(editedConfig, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    setJsonText(JSON.stringify(editedConfig, null, 2));
  }, [editedConfig]);

  const handleJsonChange = (value: string) => {
    setJsonText(value);
    try {
      const parsed = JSON.parse(value);
      setJsonError(null);

      Object.keys(editedConfig).forEach((key) => {
        updateConfig([key], parsed[key]);
      });
      Object.keys(parsed).forEach((key) => {
        if (!(key in editedConfig)) {
          updateConfig([key], parsed[key]);
        }
      });
    } catch (err) {
      setJsonError(t("servicePricing.advanced.invalidJson"));
    }
  };

  return (
    <div className="spe__tab-content">
      <h3 className="spe__section-title">{t("servicePricing.advanced.title")}</h3>

      <div className="spe__warning">
        <FaExclamationTriangle /> {t("servicePricing.advanced.warning")}
      </div>

      {jsonError && <div className="spe__error">{jsonError}</div>}

      <textarea
        className="spe__json-editor"
        value={jsonText}
        onChange={(e) => handleJsonChange(e.target.value)}
        rows={30}
        spellCheck={false}
      />
    </div>
  );
};

const JANITORIAL_SUPPLY_DEFAULTS = [
  { key: "vacuums",          label: "Vacuums",           defaultAmount: 100 },
  { key: "mops",             label: "Mops",              defaultAmount: 500 },
  { key: "mopBuckets",       label: "Mop Buckets",       defaultAmount: 200 },
  { key: "dustMops",         label: "Dust Mops",         defaultAmount: 300 },
  { key: "microfiber",       label: "Microfiber",        defaultAmount: 0   },
  { key: "cleaningProducts", label: "Cleaning Products", defaultAmount: 0   },
  { key: "consumables",      label: "Consumables",       defaultAmount: 0   },
  { key: "miscellaneous",    label: "Miscellaneous",     defaultAmount: 0   },
];

const JanitorialAdminTab: React.FC<{
  editedConfig: Record<string, any>;
  updateConfig: (path: string[], value: any) => void;
  getConfigValue: (path: string[]) => any;
}> = ({ getConfigValue, updateConfig }) => {
  const { t } = useTranslation();

  const num = (path: string[], fallback: number) => {
    const v = getConfigValue(path);
    return v !== undefined && v !== null ? Number(v) : fallback;
  };

  return (
    <div className="spe__tab-content">

      {}
      <h3 className="spe__section-title">{t("servicePricing.janitorial.productionRatesTitle")}</h3>
      <p className="spe__hint" style={{ marginBottom: "16px" }}>
        {t("servicePricing.janitorial.productionRatesDescription")}
      </p>
      <div className="spe__geo-grid">
        {[
          { key: "office",        label: t("servicePricing.janitorial.office"),         default: 1000 },
          { key: "home",          label: t("servicePricing.janitorial.home"),           default: 500  },
          { key: "restaurant",    label: t("servicePricing.janitorial.restaurant"),     default: 750  },
          { key: "businessPlace", label: t("servicePricing.janitorial.businessPlace"), default: 2000 },
        ].map(pt => (
          <div key={pt.key} className="spe__geo-section">
            <h4 className="spe__subsection-title">{pt.label}</h4>
            <div className="spe__field-group">
              <label className="spe__label">{t("servicePricing.janitorial.sqFtPerHr")}</label>
              <input
                type="number"
                className="spe__input"
                value={num(["productionRates", pt.key], pt.default)}
                onChange={e => updateConfig(["productionRates", pt.key], Number(e.target.value) || 0)}
                min="1"
                step="50"
              />
              <div className="spe__hint">{t("servicePricing.janitorial.defaultSqFtHr", { value: pt.default })}</div>
            </div>
          </div>
        ))}
      </div>

      {}
      <h3 className="spe__section-title" style={{ marginTop: "24px" }}>{t("servicePricing.janitorial.laborDefaultsTitle")}</h3>
      <p className="spe__hint" style={{ marginBottom: "16px" }}>
        {t("servicePricing.janitorial.laborDefaultsDescription")}
      </p>
      <div className="spe__geo-grid">
        <div className="spe__geo-section">
          <h4 className="spe__subsection-title">{t("servicePricing.janitorial.costPerLaborHour")}</h4>
          <div className="spe__field-group">
            <label className="spe__label">{t("servicePricing.janitorial.perHr")}</label>
            <input
              type="number"
              className="spe__input"
              value={num(["costPerHour"], 20)}
              onChange={e => updateConfig(["costPerHour"], Number(e.target.value) || 0)}
              min="0"
              step="0.5"
            />
            <div className="spe__hint">{t("servicePricing.janitorial.defaultPerHr")}</div>
          </div>
        </div>

        <div className="spe__geo-section">
          <h4 className="spe__subsection-title">{t("servicePricing.janitorial.laborTaxPct")}</h4>
          <div className="spe__field-group">
            <label className="spe__label">{t("servicePricing.janitorial.percent")}</label>
            <input
              type="number"
              className="spe__input"
              value={num(["laborTaxPct"], 15)}
              onChange={e => updateConfig(["laborTaxPct"], Number(e.target.value) || 0)}
              min="0"
              max="100"
              step="0.5"
            />
            <div className="spe__hint">{t("servicePricing.janitorial.defaultLaborTax")}</div>
          </div>
        </div>

        <div className="spe__geo-section">
          <h4 className="spe__subsection-title">{t("servicePricing.janitorial.grossProfitPct")}</h4>
          <div className="spe__field-group">
            <label className="spe__label">{t("servicePricing.janitorial.percent")}</label>
            <input
              type="number"
              className="spe__input"
              value={num(["grossProfitPct"], 33)}
              onChange={e => updateConfig(["grossProfitPct"], Number(e.target.value) || 0)}
              min="0"
              max="99"
              step="0.5"
            />
            <div className="spe__hint">
              {t("servicePricing.janitorial.defaultGrossProfit")}
            </div>
          </div>
        </div>
      </div>

      {}
      <h3 className="spe__section-title" style={{ marginTop: "24px" }}>{t("servicePricing.janitorial.supplyDefaultsTitle")}</h3>
      <p className="spe__hint" style={{ marginBottom: "16px" }}>
        {t("servicePricing.janitorial.supplyDefaultsDescription")}
      </p>
      <table className="spe__table">
        <thead>
          <tr>
            <th>{t("servicePricing.janitorial.supplyItem")}</th>
            <th>{t("servicePricing.janitorial.defaultAnnualAmount")}</th>
          </tr>
        </thead>
        <tbody>
          {JANITORIAL_SUPPLY_DEFAULTS.map(item => (
            <tr key={item.key}>
              <td className="spe__freq-label">{t(`servicePricing.janitorial.supplies.${item.key}`)}</td>
              <td>
                <input
                  type="number"
                  className="spe__input"
                  value={num(["defaultSupplies", item.key], item.defaultAmount)}
                  onChange={e =>
                    updateConfig(["defaultSupplies", item.key], Number(e.target.value) || 0)
                  }
                  min="0"
                  step="10"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

    </div>
  );
};
