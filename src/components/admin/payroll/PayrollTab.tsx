import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { FaCalendarAlt, FaCog, FaUsers, FaHistory, FaDollarSign, FaChevronDown, FaChevronUp, FaSave, FaSync, FaDownload, FaFileInvoiceDollar, FaFilePdf, FaLock } from "react-icons/fa";
import { apiClient } from "../../../backendservice/utils/apiClient";
import { PayrollSlipModal } from "./PayrollSlipModal";
import "./PayrollTab.css";

interface PayrollSettings {
  startDate: string | null;
  cycleType: "weekly" | "biweekly" | "monthly";
  cycleDayOfWeek: number;
}

interface PayrollPeriod {
  start: string;
  end: string;
  label: string;
}

interface EmployeeAgreement {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  monthlyValue: number;
  annualCommission: number;
  weeklyCommission: number;
}

interface EmployeePayroll {
  username: string;
  totalAgreements: number;
  totalMonthlyRevenue: number;
  totalAnnualCommission: number;
  totalWeeklyCommission: number;
  statusCounts: {
    draft: number;
    saved: number;
    pending_approval: number;
    approved: number;
    active: number;
  };
  agreements: EmployeeAgreement[];
}

interface PayrollTotals {
  totalEmployees: number;
  totalAgreements: number;
  totalMonthlyRevenue: number;
  totalAnnualCommission: number;
  totalWeeklyCommission: number;
}

type SubTab = "overview" | "settings" | "history";

const CYCLE_TYPES = [
  { key: "weekly", labelKey: "weekly" },
  { key: "biweekly", labelKey: "biweekly" },
  { key: "monthly", labelKey: "monthly" },
] as const;

const DAYS_OF_WEEK = [
  { value: 0, labelKey: "sunday" },
  { value: 1, labelKey: "monday" },
  { value: 2, labelKey: "tuesday" },
  { value: 3, labelKey: "wednesday" },
  { value: 4, labelKey: "thursday" },
  { value: 5, labelKey: "friday" },
  { value: 6, labelKey: "saturday" },
];

export const PayrollTab: React.FC = () => {
  const { t } = useTranslation();
  const [activeSubTab, setActiveSubTab] = useState<SubTab>("overview");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [settings, setSettings] = useState<PayrollSettings>({
    startDate: null,
    cycleType: "biweekly",
    cycleDayOfWeek: 1,
  });
  const [originalSettings, setOriginalSettings] = useState<PayrollSettings | null>(null);

  const [currentPeriod, setCurrentPeriod] = useState<PayrollPeriod | null>(null);
  const [previousPeriod, setPreviousPeriod] = useState<PayrollPeriod | null>(null);

  const [employees, setEmployees] = useState<EmployeePayroll[]>([]);
  const [totals, setTotals] = useState<PayrollTotals | null>(null);
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);

  const [history, setHistory] = useState<any[]>([]);

  const [viewingPayrollSlip, setViewingPayrollSlip] = useState<EmployeePayroll | null>(null);
  const [viewingPayrollPeriod, setViewingPayrollPeriod] = useState<PayrollPeriod | null>(null);

  const [selectedHistoryPeriod, setSelectedHistoryPeriod] = useState<PayrollPeriod | null>(null);
  const [historyEmployees, setHistoryEmployees] = useState<EmployeePayroll[]>([]);
  const [historyTotals, setHistoryTotals] = useState<PayrollTotals | null>(null);
  const [historyDetailLoading, setHistoryDetailLoading] = useState(false);
  const [historyFinalized, setHistoryFinalized] = useState(false);

  const loadPayrollData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [periodsRes, employeesRes] = await Promise.all([
        apiClient.get<any>("/api/payroll/periods"),
        apiClient.get<any>("/api/payroll/employees"),
      ]);

      if (periodsRes.data?.success) {
        setSettings(periodsRes.data.settings);
        setOriginalSettings(periodsRes.data.settings);
        setCurrentPeriod(periodsRes.data.periods.current);
        setPreviousPeriod(periodsRes.data.periods.previous);
      }

      if (employeesRes.data?.success) {
        setEmployees(employeesRes.data.employees);
        setTotals(employeesRes.data.totals);
      }
    } catch (err: any) {
      setError(err.message || t("payroll.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const loadHistory = useCallback(async () => {
    try {
      const res = await apiClient.get<any>("/api/payroll/history?limit=12");
      if (res.data?.success) {
        setHistory(res.data.history);
      }
    } catch (err) {
      console.error("Failed to load payroll history:", err);
    }
  }, []);

  const loadPeriodEmployees = useCallback(async (period: PayrollPeriod) => {
    try {
      setHistoryDetailLoading(true);
      setSelectedHistoryPeriod(period);
      setExpandedEmployee(null);
      const res = await apiClient.get<any>(
        `/api/payroll/employees?periodStart=${encodeURIComponent(period.start)}&periodEnd=${encodeURIComponent(period.end)}`
      );
      if (res.data?.success) {
        setHistoryEmployees(res.data.employees);
        setHistoryTotals(res.data.totals);
        setHistoryFinalized(!!res.data.finalized);
      } else {
        setHistoryEmployees([]);
        setHistoryTotals(null);
        setHistoryFinalized(false);
      }
    } catch (err) {
      console.error("Failed to load period payroll:", err);
      setHistoryEmployees([]);
      setHistoryTotals(null);
    } finally {
      setHistoryDetailLoading(false);
    }
  }, []);

  const closePeriodDetail = useCallback(() => {
    setSelectedHistoryPeriod(null);
    setHistoryEmployees([]);
    setHistoryTotals(null);
    setExpandedEmployee(null);
  }, []);

  const openSlip = useCallback((emp: EmployeePayroll, period: PayrollPeriod) => {
    setViewingPayrollSlip(emp);
    setViewingPayrollPeriod(period);
  }, []);

  useEffect(() => {
    loadPayrollData();
  }, [loadPayrollData]);

  useEffect(() => {
    if (activeSubTab === "history") {
      loadHistory();
    }
  }, [activeSubTab, loadHistory]);

  const hasChanges = originalSettings
    ? settings.startDate !== originalSettings.startDate ||
      settings.cycleType !== originalSettings.cycleType ||
      settings.cycleDayOfWeek !== originalSettings.cycleDayOfWeek
    : false;

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const res = await apiClient.patch<any>("/api/admin-settings", {
        payrollSettings: settings,
      });

      if (res.data?.success) {
        setOriginalSettings(settings);
        setSuccessMessage(t("payroll.saveSuccess"));
        setTimeout(() => setSuccessMessage(null), 3000);
        loadPayrollData();
      } else {
        setError(t("payroll.saveFailed"));
      }
    } catch (err: any) {
      setError(err.message || t("payroll.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const formatMoney = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const exportToCSV = () => {
    if (!employees.length || !currentPeriod) return;

    const headers = [
      t("payroll.csv.salesperson"),
      t("payroll.csv.agreements"),
      t("payroll.csv.monthlyRevenue"),
      t("payroll.csv.totalCommission"),
      t("payroll.csv.draft"),
      t("payroll.csv.saved"),
      t("payroll.csv.pending"),
      t("payroll.csv.approved"),
      t("payroll.csv.active")
    ];

    const rows = employees.map(emp => [
      emp.username,
      emp.totalAgreements,
      emp.totalMonthlyRevenue.toFixed(2),
      emp.totalAnnualCommission.toFixed(2),
      emp.statusCounts.draft,
      emp.statusCounts.saved,
      emp.statusCounts.pending_approval,
      emp.statusCounts.approved,
      emp.statusCounts.active
    ]);

    if (totals) {
      rows.push([
        t("payroll.csv.total"),
        totals.totalAgreements,
        totals.totalMonthlyRevenue.toFixed(2),
        totals.totalAnnualCommission.toFixed(2),
        "",
        "",
        "",
        "",
        ""
      ]);
    }

    const agreementHeaders = [
      "",
      "",
      t("payroll.csv.agreementTitle"),
      t("payroll.csv.createdDate"),
      t("payroll.csv.status"),
      t("payroll.csv.monthlyValue"),
      t("payroll.csv.commission")
    ];

    let csvContent = `${t("payroll.csv.reportTitle", { label: currentPeriod.label })}\n`;
    csvContent += `${t("payroll.csv.period", { start: formatDate(currentPeriod.start), end: formatDate(currentPeriod.end) })}\n\n`;
    csvContent += headers.join(",") + "\n";
    csvContent += rows.map(row => row.join(",")).join("\n");

    csvContent += `\n\n${t("payroll.csv.agreementDetails")}\n`;
    csvContent += agreementHeaders.join(",") + "\n";

    employees.forEach(emp => {
      emp.agreements.forEach(agreement => {
        csvContent += [
          emp.username,
          "",
          `"${agreement.title.replace(/"/g, '""')}"`,
          formatDate(agreement.createdAt),
          agreement.status,
          agreement.monthlyValue.toFixed(2),
          agreement.annualCommission.toFixed(2)
        ].join(",") + "\n";
      });
    });

    // Create and download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `payroll-${currentPeriod.label.replace(/\s+/g, "-")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingEmployee, setDownloadingEmployee] = useState<string | null>(null);

  const downloadPayrollPdf = async (period: PayrollPeriod, emp?: EmployeePayroll) => {
    try {
      if (emp) setDownloadingEmployee(emp.username);
      else setDownloadingPdf(true);
      setError(null);
      const usernameParam = emp ? `&username=${encodeURIComponent(emp.username)}` : "";
      const blob = await apiClient.downloadBlob(
        `/api/payroll/download-pdf?periodStart=${encodeURIComponent(period.start)}&periodEnd=${encodeURIComponent(period.end)}${usernameParam}`
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const namePart = emp ? `${emp.username.replace(/[^a-z0-9]+/gi, "-")}-` : "";
      link.download = `payroll-${namePart}${period.label.replace(/[^a-z0-9]+/gi, "-")}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      if (activeSubTab === "history") {
        loadHistory();
      }
    } catch (err: any) {
      setError(err?.message || t("payroll.downloadPdfFailed"));
    } finally {
      setDownloadingPdf(false);
      setDownloadingEmployee(null);
    }
  };

  const renderPayrollBody = (
    emps: EmployeePayroll[],
    tot: PayrollTotals | null,
    period: PayrollPeriod
  ) => (
    <>
      {tot && (
        <div className="payroll-summary-grid">
          <div className="payroll-summary-card primary">
            <div className="summary-icon">
              <FaDollarSign />
            </div>
            <div className="summary-content">
              <span className="summary-label">{t("payroll.summary.totalCommissionPayout")}</span>
              <span className="summary-value">{formatMoney(tot.totalAnnualCommission)}</span>
              <span className="summary-note">{t("payroll.summary.fullCommissionNote")}</span>
            </div>
          </div>
          <div className="payroll-summary-card">
            <span className="summary-label">{t("payroll.summary.salespeople")}</span>
            <span className="summary-value">{tot.totalEmployees}</span>
          </div>
          <div className="payroll-summary-card">
            <span className="summary-label">{t("payroll.summary.agreements")}</span>
            <span className="summary-value">{tot.totalAgreements}</span>
          </div>
          <div className="payroll-summary-card">
            <span className="summary-label">{t("payroll.summary.totalRevenue")}</span>
            <span className="summary-value">{formatMoney(tot.totalMonthlyRevenue)}</span>
          </div>
        </div>
      )}

      <div className="payroll-employees-section">
        <div className="employees-section-header">
          <h3>{t("payroll.employees.sectionTitle")}</h3>
          {emps.length > 0 && (
            <div className="employees-section-actions">
              <button
                className="download-payroll-pdf-btn"
                onClick={() => downloadPayrollPdf(period)}
                disabled={downloadingPdf}
                title={t("payroll.employees.downloadPdfTitle")}
              >
                <FaFilePdf /> {downloadingPdf ? t("payroll.employees.generating") : t("payroll.employees.downloadPayrollPdf")}
              </button>
            </div>
          )}
        </div>
        {emps.length === 0 ? (
          <div className="payroll-empty">
            <p>{t("payroll.employees.noAgreements")}</p>
          </div>
        ) : (
          <div className="payroll-employees-list">
            {emps.map((emp) => (
              <div
                key={emp.username}
                className={`payroll-employee-card ${expandedEmployee === emp.username ? "expanded" : ""}`}
              >
                <div
                  className="employee-header"
                  onClick={() =>
                    setExpandedEmployee(
                      expandedEmployee === emp.username ? null : emp.username
                    )
                  }
                >
                  <div className="employee-avatar">
                    {emp.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="employee-info">
                    <span className="employee-name">{emp.username}</span>
                    <span className="employee-meta">
                      {t("payroll.employees.agreementsMeta", { count: emp.totalAgreements, revenue: formatMoney(emp.totalMonthlyRevenue) })}
                    </span>
                  </div>
                  <div className="employee-commission">
                    <span className="commission-amount">
                      {formatMoney(emp.totalAnnualCommission)}
                    </span>
                    <span className="commission-label">{t("payroll.employees.periodCommission")}</span>
                  </div>
                  <button
                    className="view-payroll-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      openSlip(emp, period);
                    }}
                  >
                    <FaFileInvoiceDollar /> {t("payroll.employees.viewPayroll")}
                  </button>
                  <button
                    className="export-pdf-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadPayrollPdf(period, emp);
                    }}
                    disabled={downloadingEmployee === emp.username}
                    title={t("payroll.employees.exportPdfTitle")}
                  >
                    <FaDownload /> {downloadingEmployee === emp.username ? "…" : t("payroll.history.pdf")}
                  </button>
                  <div className="expand-icon">
                    {expandedEmployee === emp.username ? <FaChevronUp /> : <FaChevronDown />}
                  </div>
                </div>

                {expandedEmployee === emp.username && (
                  <div className="employee-details">
                    <div className="status-breakdown">
                      <span className="status-chip draft">{t("payroll.employees.draftCount", { count: emp.statusCounts.draft })}</span>
                      <span className="status-chip saved">{t("payroll.employees.savedCount", { count: emp.statusCounts.saved })}</span>
                      <span className="status-chip pending">{t("payroll.employees.pendingCount", { count: emp.statusCounts.pending_approval })}</span>
                      <span className="status-chip approved">{t("payroll.employees.approvedCount", { count: emp.statusCounts.approved })}</span>
                      <span className="status-chip active">{t("payroll.employees.activeCount", { count: emp.statusCounts.active })}</span>
                    </div>
                    <div className="agreements-list">
                      <h4>{t("payroll.employees.agreementsHeading")}</h4>
                      {emp.agreements.map((agreement) => (
                        <div key={agreement.id} className="agreement-item">
                          <div className="agreement-info">
                            <span className="agreement-title">{agreement.title}</span>
                            <span className="agreement-date">{formatDate(agreement.createdAt)}</span>
                          </div>
                          <div className="agreement-values">
                            <span className="agreement-revenue">{t("payroll.employees.perMonth", { value: formatMoney(agreement.monthlyValue) })}</span>
                            <span className="agreement-commission">{formatMoney(agreement.annualCommission)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );

  if (loading) {
    return (
      <div className="payroll-tab-container">
        <div className="payroll-loading">
          <div className="payroll-spinner" />
          <p>{t("payroll.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="payroll-tab-container">
      <div className="payroll-header">
        <div className="payroll-header-icon">
          <FaCalendarAlt />
        </div>
        <div>
          <h2>{t("payroll.header.title")}</h2>
          <p className="payroll-subtitle">
            {t("payroll.header.subtitle")}
          </p>
        </div>
      </div>

      {error && (
        <div className="payroll-error-banner">
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {successMessage && (
        <div className="payroll-success-banner">
          <span>{successMessage}</span>
        </div>
      )}

      <div className="payroll-subtab-bar">
        <button
          className={`payroll-subtab-btn ${activeSubTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveSubTab("overview")}
        >
          <FaUsers />
          {t("payroll.subtabs.currentPeriod")}
        </button>
        <button
          className={`payroll-subtab-btn ${activeSubTab === "settings" ? "active" : ""}`}
          onClick={() => setActiveSubTab("settings")}
        >
          <FaCog />
          {t("payroll.subtabs.settings")}
        </button>
        <button
          className={`payroll-subtab-btn ${activeSubTab === "history" ? "active" : ""}`}
          onClick={() => setActiveSubTab("history")}
        >
          <FaHistory />
          {t("payroll.subtabs.history")}
        </button>
      </div>

      <div className="payroll-content">
        {activeSubTab === "overview" && (
          <div className="payroll-overview">
            {/* Period Info */}
            <div className="payroll-period-card">
              <div className="period-header">
                <h3>{t("payroll.overview.currentPayrollPeriod")}</h3>
                <div className="period-actions">
                  <button className="refresh-btn" onClick={loadPayrollData}>
                    <FaSync /> {t("payroll.overview.refresh")}
                  </button>
                  <button className="export-btn" onClick={exportToCSV} disabled={!employees.length}>
                    <FaDownload /> {t("payroll.overview.exportCsv")}
                  </button>
                </div>
              </div>
              {currentPeriod && (
                <div className="period-info">
                  <span className="period-label">{currentPeriod.label}</span>
                  <span className="period-dates">
                    {formatDate(currentPeriod.start)} - {formatDate(currentPeriod.end)}
                  </span>
                </div>
              )}
            </div>

            {currentPeriod && renderPayrollBody(employees, totals, currentPeriod)}
          </div>
        )}

        {activeSubTab === "settings" && (
          <div className="payroll-settings">
            <div className="settings-section">
              <h3>
                <FaCalendarAlt /> {t("payroll.settings.startDateTitle")}
              </h3>
              <p className="settings-hint">
                {t("payroll.settings.startDateHint")}
              </p>
              <input
                type="date"
                className="settings-input"
                value={settings.startDate ? settings.startDate.split("T")[0] : ""}
                onChange={(e) =>
                  setSettings({ ...settings, startDate: e.target.value || null })
                }
              />
              {settings.startDate && (
                <div className="settings-preview">
                  {t("payroll.settings.selected", { date: new Date(settings.startDate).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  }) })}
                </div>
              )}
            </div>

            <div className="settings-section">
              <h3>
                <FaCog /> {t("payroll.settings.cycleTypeTitle")}
              </h3>
              <p className="settings-hint">{t("payroll.settings.cycleTypeHint")}</p>
              <div className="cycle-type-options">
                {CYCLE_TYPES.map((type) => (
                  <button
                    key={type.key}
                    className={`cycle-type-btn ${settings.cycleType === type.key ? "active" : ""}`}
                    onClick={() => setSettings({ ...settings, cycleType: type.key })}
                  >
                    {t(`payroll.cycleTypes.${type.labelKey}`)}
                  </button>
                ))}
              </div>
            </div>

            {(settings.cycleType === "weekly" || settings.cycleType === "biweekly") && (
              <div className="settings-section">
                <h3>
                  <FaCalendarAlt /> {t("payroll.settings.cycleDayTitle")}
                </h3>
                <p className="settings-hint">{t("payroll.settings.cycleDayHint")}</p>
                <select
                  className="settings-select"
                  value={settings.cycleDayOfWeek}
                  onChange={(e) =>
                    setSettings({ ...settings, cycleDayOfWeek: Number(e.target.value) })
                  }
                >
                  {DAYS_OF_WEEK.map((day) => (
                    <option key={day.value} value={day.value}>
                      {t(`payroll.daysOfWeek.${day.labelKey}`)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="settings-footer">
              <button
                className="save-settings-btn"
                onClick={handleSaveSettings}
                disabled={!hasChanges || saving}
              >
                <FaSave />
                {saving ? t("payroll.settings.saving") : t("payroll.settings.saveSettings")}
              </button>
              {!hasChanges && !saving && (
                <span className="no-changes-text">{t("payroll.settings.noChanges")}</span>
              )}
            </div>
          </div>
        )}

        {activeSubTab === "history" && !selectedHistoryPeriod && (
          <div className="payroll-history">
            <h3>{t("payroll.history.title")}</h3>
            <p className="history-subtitle">
              {t("payroll.history.subtitle")}
            </p>

            {history.length === 0 ? (
              <div className="payroll-empty">
                <p>{t("payroll.history.noHistory")}</p>
              </div>
            ) : (
              <div className="history-list">
                {history.map((period, idx) => (
                  <div
                    key={idx}
                    className={`history-card clickable ${idx === 0 ? "current" : ""}`}
                    onClick={() => loadPeriodEmployees(period.period)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="history-period">
                      <span className="history-label">{period.period.label}</span>
                      {idx === 0 && <span className="current-badge">{t("payroll.history.current")}</span>}
                      {period.finalized && <span className="finalized-badge"><FaLock /> {t("payroll.history.finalized")}</span>}
                      {period.pdfGeneratedAt && (
                        <span className="pdf-badge" title={t("payroll.history.pdfTitle", { date: formatDate(period.pdfGeneratedAt), count: period.pdfCount > 1 ? t("payroll.history.pdfCount", { count: period.pdfCount }) : "" })}>
                          <FaFilePdf /> {t("payroll.history.pdf")}
                        </span>
                      )}
                      <span className="history-view-link">{t("payroll.history.viewPayroll")}</span>
                    </div>
                    <div className="history-stats">
                      <div className="history-stat">
                        <span className="stat-value">{period.employeeCount}</span>
                        <span className="stat-label">{t("payroll.history.salespeople")}</span>
                      </div>
                      <div className="history-stat">
                        <span className="stat-value">{period.totalAgreements}</span>
                        <span className="stat-label">{t("payroll.history.agreements")}</span>
                      </div>
                      <div className="history-stat">
                        <span className="stat-value">{formatMoney(period.totalRevenue)}</span>
                        <span className="stat-label">{t("payroll.history.revenue")}</span>
                      </div>
                      <div className="history-stat highlight">
                        <span className="stat-value">{formatMoney(period.totalCommission)}</span>
                        <span className="stat-label">{t("payroll.history.commission")}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeSubTab === "history" && selectedHistoryPeriod && (
          <div className="payroll-history-detail">
            <button className="back-to-history-btn" onClick={closePeriodDetail}>
              {t("payroll.history.backToHistory")}
            </button>

            <div className="payroll-period-card">
              <div className="period-header">
                <h3>{t("payroll.history.payrollPeriod")}</h3>
                {historyFinalized && <span className="finalized-badge"><FaLock /> {t("payroll.history.finalized")}</span>}
              </div>
              <div className="period-info">
                <span className="period-label">{selectedHistoryPeriod.label}</span>
                <span className="period-dates">
                  {formatDate(selectedHistoryPeriod.start)} - {formatDate(selectedHistoryPeriod.end)}
                </span>
              </div>
            </div>

            {historyDetailLoading ? (
              <div className="payroll-loading">
                <div className="payroll-spinner" />
                <p>{t("payroll.history.loading")}</p>
              </div>
            ) : (
              renderPayrollBody(historyEmployees, historyTotals, selectedHistoryPeriod)
            )}
          </div>
        )}
      </div>

      {/* Payroll Slip Modal */}
      {viewingPayrollSlip && viewingPayrollPeriod && (
        <PayrollSlipModal
          employee={viewingPayrollSlip}
          period={viewingPayrollPeriod}
          onClose={() => {
            setViewingPayrollSlip(null);
            setViewingPayrollPeriod(null);
          }}
        />
      )}
    </div>
  );
};
