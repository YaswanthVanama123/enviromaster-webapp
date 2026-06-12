import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { FaUsers } from "react-icons/fa";
import { quotaApi, salesPersonApi } from "../../../backendservice/api/quotaApi";
import type {
  SalesPerson,
  QuotaStatusResponse,
  LeaderboardEntry,
} from "../../../backendservice/types/quota.types";
import {
  formatCurrency,
  formatPercentage,
  getQuotaLevelColor,
  getQuotaLevelBgColor,
  getQuotaCommissionRate,
} from "../../../backendservice/types/quota.types";

interface QuotaDashboardProps {
  onViewAgreements?: (salesPersonId: string) => void;
}

export const QuotaDashboard: React.FC<QuotaDashboardProps> = ({ onViewAgreements }) => {
  const { t } = useTranslation();
  const [salesPersons, setSalesPersons] = useState<SalesPerson[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);
  const [quotaStatus, setQuotaStatus] = useState<QuotaStatusResponse | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [salesPersonsLoaded, setSalesPersonsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSalesPersons = async () => {
      const result = await salesPersonApi.getAll({ active: true });
      if (result) {
        setSalesPersons(result.data);
        if (result.data.length > 0 && !selectedPerson) {
          setSelectedPerson(result.data[0].employeeId);
        }
      }
      setSalesPersonsLoaded(true);
    };
    loadSalesPersons();
  }, []);

  useEffect(() => {
    const loadLeaderboard = async () => {
      const result = await quotaApi.getLeaderboard({ periodType: "monthly" });
      if (result) {
        setLeaderboard(result.leaderboard);
      }
    };
    loadLeaderboard();
  }, []);

  useEffect(() => {
    const loadQuotaStatus = async () => {
      if (!selectedPerson) {
        
        if (salesPersonsLoaded) {
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError(null);

      const result = await quotaApi.getStatus(selectedPerson, { periodType: "monthly" });
      if (result) {
        setQuotaStatus(result);
      } else {
        setError(t("adminQuota.dashboard.loadFailed"));
      }
      setLoading(false);
    };

    loadQuotaStatus();
  }, [selectedPerson, salesPersonsLoaded]);

  const handlePersonChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedPerson(e.target.value);
  };

  return (
    <div className="quota-dashboard">
      {}
      <div className="dashboard-header">
        <div className="person-selector">
          <label>{t("adminQuota.dashboard.salesPerson")}</label>
          <select value={selectedPerson || ""} onChange={handlePersonChange}>
            {salesPersons.map((sp) => (
              <option key={sp.employeeId} value={sp.employeeId}>
                {sp.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">{t("adminQuota.dashboard.loading")}</div>
      ) : error ? (
        <div className="error-state">{error}</div>
      ) : salesPersons.length === 0 ? (
        <div className="empty-state-container">
          <div className="empty-state-icon"><FaUsers /></div>
          <h3>{t("adminQuota.dashboard.noEmployeesTitle")}</h3>
          <p>{t("adminQuota.dashboard.noEmployeesTextBefore")}<strong>{t("adminQuota.dashboard.userManagement")}</strong>{t("adminQuota.dashboard.noEmployeesTextAfter")}</p>
        </div>
      ) : quotaStatus ? (
        <div className="dashboard-grid">
          {}
          <div className="dashboard-card quota-progress-card">
            <h3>{t("adminQuota.dashboard.quotaProgress", { label: quotaStatus.period.label })}</h3>
            <div className="quota-meter">
              <div className="quota-info">
                <span className="quota-actual">{formatCurrency(quotaStatus.quota.actual)}</span>
                <span className="quota-divider">/</span>
                <span className="quota-target">{formatCurrency(quotaStatus.quota.target)}</span>
              </div>
              <div className="progress-bar-container">
                <div
                  className="progress-bar"
                  style={{
                    width: `${Math.min(quotaStatus.quota.percentage, 200)}%`,
                    backgroundColor: getQuotaLevelColor(quotaStatus.quota.level),
                  }}
                />
                <div className="progress-marker marker-100" style={{ left: "50%" }}>
                  <span>100%</span>
                </div>
                <div className="progress-marker marker-200" style={{ left: "100%" }}>
                  <span>200%</span>
                </div>
              </div>
              <div className="quota-percentage">{formatPercentage(quotaStatus.quota.percentage)}</div>
            </div>

            <div
              className="quota-level-badge"
              style={{
                backgroundColor: getQuotaLevelBgColor(quotaStatus.quota.level),
                color: getQuotaLevelColor(quotaStatus.quota.level),
              }}
            >
              {t("adminQuota.dashboard.quotaLevelBadge", { level: quotaStatus.quota.level.toUpperCase() })}
              <span className="commission-rate">
                {t("adminQuota.dashboard.commissionRate", { rate: getQuotaCommissionRate(quotaStatus.quota.level) })}
              </span>
            </div>
          </div>

          {}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">{t("adminQuota.dashboard.agreementsClosed")}</div>
              <div className="stat-value">{quotaStatus.progress.agreementCount}</div>
              <div className="stat-breakdown">
                <span>{t("adminQuota.dashboard.newCount", { count: quotaStatus.progress.newBusinessCount })}</span>
                <span>{t("adminQuota.dashboard.renewalsCount", { count: quotaStatus.progress.renewalCount })}</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-label">{t("adminQuota.dashboard.commissionEarned")}</div>
              <div className="stat-value">{formatCurrency(quotaStatus.commission.earned)}</div>
              <div className="stat-note">{t("adminQuota.dashboard.thisMonth")}</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">{t("adminQuota.dashboard.toReachQuota")}</div>
              <div className="stat-value">{formatCurrency(quotaStatus.progress.toReachQuota)}</div>
              <div className="stat-note">{t("adminQuota.dashboard.remainingSalesNeeded")}</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">{t("adminQuota.dashboard.toReachDouble")}</div>
              <div className="stat-value">{formatCurrency(quotaStatus.progress.toReachDouble)}</div>
              <div className="stat-note">{t("adminQuota.dashboard.forNineRate")}</div>
            </div>
          </div>

          {}
          <div className="dashboard-card recent-agreements">
            <div className="card-header">
              <h3>{t("adminQuota.dashboard.recentAgreements")}</h3>
              {onViewAgreements && (
                <button
                  className="view-all-btn"
                  onClick={() => onViewAgreements(selectedPerson || "")}
                >
                  {t("adminQuota.dashboard.viewAll")}
                </button>
              )}
            </div>
            {quotaStatus.recentAgreements.length === 0 ? (
              <div className="empty-state">{t("adminQuota.dashboard.noAgreementsThisPeriod")}</div>
            ) : (
              <table className="agreements-table">
                <thead>
                  <tr>
                    <th>{t("adminQuota.dashboard.colCustomer")}</th>
                    <th>{t("adminQuota.dashboard.colMonthlyValue")}</th>
                    <th>{t("adminQuota.dashboard.colType")}</th>
                    <th>{t("adminQuota.dashboard.colStatus")}</th>
                  </tr>
                </thead>
                <tbody>
                  {quotaStatus.recentAgreements.map((agreement) => (
                    <tr key={agreement._id}>
                      <td>{agreement.customer?.name || t("adminQuota.dashboard.unknownCustomer")}</td>
                      <td>{formatCurrency(agreement.monthlyValue)}</td>
                      <td>
                        <span className={`account-type-badge ${(agreement.accountType || 'anchor').toLowerCase()}`}>
                          {agreement.accountType || t("adminQuota.dashboard.notAvailable")}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge status-${agreement.status}`}>
                          {agreement.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {}
          <div className="dashboard-card leaderboard">
            <h3>{t("adminQuota.dashboard.monthlyLeaderboard")}</h3>
            {leaderboard.length === 0 ? (
              <div className="empty-state">{t("adminQuota.dashboard.noDataThisPeriod")}</div>
            ) : (
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th>{t("adminQuota.dashboard.colRank")}</th>
                    <th>{t("adminQuota.dashboard.colName")}</th>
                    <th>{t("adminQuota.dashboard.colSales")}</th>
                    <th>{t("adminQuota.dashboard.colQuotaPct")}</th>
                    <th>{t("adminQuota.dashboard.colDeals")}</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.slice(0, 10).map((entry) => (
                    <tr
                      key={entry.salesPersonId}
                      className={entry.salesPersonId === selectedPerson ? "highlighted" : ""}
                    >
                      <td className="rank-cell">
                        {entry.rank <= 3 ? (
                          <span className={`rank-badge rank-${entry.rank}`}>{entry.rank}</span>
                        ) : (
                          entry.rank
                        )}
                      </td>
                      <td>{entry.salesPersonName}</td>
                      <td>{formatCurrency(entry.actualSales)}</td>
                      <td>
                        <span
                          className="quota-badge"
                          style={{
                            backgroundColor: getQuotaLevelBgColor(entry.quotaLevel),
                            color: getQuotaLevelColor(entry.quotaLevel),
                          }}
                        >
                          {formatPercentage(entry.quotaPercentage)}
                        </span>
                      </td>
                      <td>{entry.agreementCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : (
        <div className="empty-state">{t("adminQuota.dashboard.selectSalesPerson")}</div>
      )}
    </div>
  );
};
