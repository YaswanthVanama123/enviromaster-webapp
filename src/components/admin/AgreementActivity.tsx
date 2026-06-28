import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronDown,
  faChevronRight,
  faUser,
  faFileAlt,
  faSync,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";
import { agreementActivityApi } from "../../backendservice/api/agreementActivityApi";
import { apiClient } from "../../backendservice/utils/apiClient";
import type {
  ActivityRange,
  ActivityAgreement,
  AgreementActivityResponse,
} from "../../backendservice/api/agreementActivityApi";

type UIRange = ActivityRange | "thisPayroll" | "previousPayroll";

interface PayrollPeriod { start: string; end: string; label: string; }
interface PayrollPeriods { current?: PayrollPeriod; previous?: PayrollPeriod; }

const RANGES: { key: UIRange; labelKey: string }[] = [
  { key: "today", labelKey: "agreementActivity.filters.today" },
  { key: "week", labelKey: "agreementActivity.filters.thisWeek" },
  { key: "month", labelKey: "agreementActivity.filters.thisMonth" },
  { key: "thisPayroll", labelKey: "agreementActivity.filters.thisPayroll" },
  { key: "previousPayroll", labelKey: "agreementActivity.filters.previousPayroll" },
  { key: "date", labelKey: "agreementActivity.filters.specificDate" },
];

function todayStr() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function localDateStr(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function AgreementActivity() {
  const { t } = useTranslation();
  const [range, setRange] = useState<UIRange>("today");
  const [fromDate, setFromDate] = useState<string>(todayStr());
  const [toDate, setToDate] = useState<string>(todayStr());
  const [payrollPeriods, setPayrollPeriods] = useState<PayrollPeriods>({});
  const [data, setData] = useState<AgreementActivityResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [agreementsByUser, setAgreementsByUser] = useState<Record<string, ActivityAgreement[]>>({});
  const [loadingByUser, setLoadingByUser] = useState<Record<string, boolean>>({});

  useEffect(() => {
    apiClient
      .get<{ success: boolean; periods: PayrollPeriods }>("/api/payroll/periods")
      .then((res) => {
        if (res.data?.periods) setPayrollPeriods(res.data.periods);
      })
      .catch(() => {});
  }, []);

  const resolveApiArgs = useCallback((): {
    apiRange: ActivityRange;
    dates: { from?: string; to?: string };
  } => {
    if (range === "thisPayroll" || range === "previousPayroll") {
      const p = range === "thisPayroll" ? payrollPeriods.current : payrollPeriods.previous;
      if (p) return { apiRange: "date", dates: { from: localDateStr(p.start), to: localDateStr(p.end) } };
      return { apiRange: "date", dates: {} };
    }
    if (range === "date") return { apiRange: "date", dates: { from: fromDate, to: toDate } };
    return { apiRange: range, dates: {} };
  }, [range, fromDate, toDate, payrollPeriods]);

  const load = useCallback(async () => {
    setLoading(true);
    setExpanded({});
    setAgreementsByUser({});
    setLoadingByUser({});
    const { apiRange, dates } = resolveApiArgs();
    const res = await agreementActivityApi.getActivity(apiRange, dates);
    setData(res);
    setLoading(false);
  }, [resolveApiArgs]);

  useEffect(() => {
    load();
  }, [load]);

  const loadEmployee = useCallback(
    async (username: string) => {
      setLoadingByUser((prev) => ({ ...prev, [username]: true }));
      const { apiRange, dates } = resolveApiArgs();
      const rows = await agreementActivityApi.getEmployeeAgreements(username, apiRange, dates);
      setAgreementsByUser((prev) => ({ ...prev, [username]: rows || [] }));
      setLoadingByUser((prev) => ({ ...prev, [username]: false }));
    },
    [resolveApiArgs]
  );

  const toggle = (username: string) => {
    setExpanded((prev) => {
      const open = !prev[username];
      if (open && agreementsByUser[username] === undefined && !loadingByUser[username]) {
        loadEmployee(username);
      }
      return { ...prev, [username]: open };
    });
  };

  const statusLabel = (status: string) =>
    t(`agreementActivity.statuses.${status}`, { defaultValue: status });

  const fmtTime = (iso: string) => {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? "—" : d.toLocaleString();
  };

  return (
    <div className="aa">
      <div className="aa-toolbar">
        <div className="aa-filters">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              className={`aa-filter ${range === r.key ? "active" : ""}`}
              onClick={() => setRange(r.key)}
            >
              {t(r.labelKey)}
            </button>
          ))}
          {range === "date" && (
            <div className="aa-daterange">
              <label className="aa-date-field">
                <span>{t("agreementActivity.from")}</span>
                <input
                  type="date"
                  className="aa-date"
                  value={fromDate}
                  max={toDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </label>
              <label className="aa-date-field">
                <span>{t("agreementActivity.to")}</span>
                <input
                  type="date"
                  className="aa-date"
                  value={toDate}
                  min={fromDate}
                  max={todayStr()}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </label>
            </div>
          )}
        </div>
        <button type="button" className="aa-refresh" onClick={load} disabled={loading}>
          <FontAwesomeIcon icon={faSync} spin={loading} />
          <span>{t("agreementActivity.refresh")}</span>
        </button>
      </div>

      <div className="aa-summary">
        <div className="aa-summary-card">
          <span className="aa-summary-num">{data?.totalAgreements ?? 0}</span>
          <span className="aa-summary-label">{t("agreementActivity.summary.totalAgreements")}</span>
        </div>
        <div className="aa-summary-card">
          <span className="aa-summary-num">{data?.totalEmployees ?? 0}</span>
          <span className="aa-summary-label">{t("agreementActivity.summary.employees")}</span>
        </div>
      </div>

      {loading ? (
        <div className="aa-empty">{t("agreementActivity.loading")}</div>
      ) : !data || data.employees.length === 0 ? (
        <div className="aa-empty">{t("agreementActivity.empty")}</div>
      ) : (
        <div className="aa-list">
          {data.employees.map((emp) => {
            const open = !!expanded[emp.username];
            const rows = agreementsByUser[emp.username];
            const empLoading = !!loadingByUser[emp.username];
            return (
              <div key={emp.username} className="aa-emp">
                <button type="button" className="aa-emp-head" onClick={() => toggle(emp.username)}>
                  <FontAwesomeIcon
                    icon={open ? faChevronDown : faChevronRight}
                    className="aa-emp-caret"
                  />
                  <FontAwesomeIcon icon={faUser} className="aa-emp-icon" />
                  <span className="aa-emp-name">{emp.name}</span>
                  <span className="aa-emp-count">{emp.count}</span>
                </button>
                {open && (
                  <div className="aa-emp-body">
                    {empLoading ? (
                      <div className="aa-row aa-row--message">
                        <FontAwesomeIcon icon={faSpinner} spin className="aa-row-icon" />
                        <span className="aa-row-title">{t("agreementActivity.loading")}</span>
                      </div>
                    ) : rows && rows.length > 0 ? (
                      rows.map((a) => (
                        <div key={a.id} className="aa-row">
                          <FontAwesomeIcon icon={faFileAlt} className="aa-row-icon" />
                          <span className="aa-row-title">{a.title}</span>
                          <span className={`aa-status aa-status--${a.status}`}>
                            {statusLabel(a.status)}
                          </span>
                          <span className="aa-row-time">{fmtTime(a.createdAt)}</span>
                        </div>
                      ))
                    ) : (
                      <div className="aa-row aa-row--message">
                        <span className="aa-row-title">{t("agreementActivity.empty")}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default AgreementActivity;
