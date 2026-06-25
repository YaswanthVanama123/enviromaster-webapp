import React, { useState, useEffect, useCallback } from "react";
import { apiClient } from "../../../backendservice/utils/apiClient";

interface PayrollAgreement {
  id: string;
  title: string;
  createdBy: string;
  status: string;
  biginDealId: string | null;
  monthlyValue: number;
  annualCommission: number;
  weeklyCommission: number;
  createdAt: string;
  addedToPayroll: boolean;
  payrollAddedAt: string | null;
  payrollPeriodLabel: string | null;
  lockedAnnualCommission: number | null;
  lockedWeeklyCommission: number | null;
}

interface CurrentPeriod {
  start: string;
  end: string;
  label: string;
}

const money = (n: number | null | undefined): string =>
  `$${(n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const PayrollAgreementsAdmin: React.FC = () => {
  const [agreements, setAgreements] = useState<PayrollAgreement[]>([]);
  const [currentPeriod, setCurrentPeriod] = useState<CurrentPeriod | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<PayrollAgreement | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const fetchAgreements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<any>("/api/payroll/agreements");
      if (res.error || !res.data?.success) {
        throw new Error(res.error || "Failed to load agreements");
      }
      setAgreements(res.data.agreements || []);
      setCurrentPeriod(res.data.currentPeriod || null);
    } catch (err: any) {
      setError(err?.message || "Failed to load agreements");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgreements();
  }, [fetchAgreements]);

  const confirmComplete = async () => {
    if (!confirmTarget) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiClient.post<any>(
        `/api/payroll/agreements/${confirmTarget.id}/complete`,
        {}
      );
      if (res.error || !res.data?.success) {
        throw new Error(res.error || "Failed to add to payroll");
      }
      setNotice(`"${confirmTarget.title}" added to payroll (${res.data.payrollLock?.periodLabel || ""}).`);
      setConfirmTarget(null);
      await fetchAgreements();
    } catch (err: any) {
      setError(err?.message || "Failed to add to payroll");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Payroll Agreements</h2>
          <p style={styles.subtitle}>
            Agreements connected to Bigin with commission calculated. Marking one
            <strong> Completed </strong> locks its commission into the current payroll
            period and it cannot change afterwards.
          </p>
        </div>
        <div style={styles.periodBox}>
          <span style={styles.periodLabel}>Current payroll period</span>
          <span style={styles.periodValue}>{currentPeriod?.label || "—"}</span>
        </div>
      </div>

      {notice && (
        <div style={styles.notice}>
          {notice}
          <button style={styles.dismiss} onClick={() => setNotice(null)}>×</button>
        </div>
      )}
      {error && (
        <div style={styles.error}>
          {error}
          <button style={styles.dismiss} onClick={() => setError(null)}>×</button>
        </div>
      )}

      {loading ? (
        <p style={styles.muted}>Loading…</p>
      ) : agreements.length === 0 ? (
        <p style={styles.muted}>No Bigin-connected agreements with commission found.</p>
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Agreement</th>
                <th style={styles.th}>Employee</th>
                <th style={styles.th}>Status</th>
                <th style={styles.thRight}>Monthly</th>
                <th style={styles.thRight}>Weekly Comm.</th>
                <th style={styles.thRight}>Annual Comm.</th>
                <th style={styles.th}>Payroll</th>
                <th style={styles.thRight}>Action</th>
              </tr>
            </thead>
            <tbody>
              {agreements.map((a) => (
                <tr key={a.id} style={a.addedToPayroll ? styles.rowLocked : undefined}>
                  <td style={styles.td}>{a.title}</td>
                  <td style={styles.td}>{a.createdBy}</td>
                  <td style={styles.td}>{a.status}</td>
                  <td style={styles.tdRight}>{money(a.monthlyValue)}</td>
                  <td style={styles.tdRight}>{money(a.weeklyCommission)}</td>
                  <td style={styles.tdRight}>{money(a.annualCommission)}</td>
                  <td style={styles.td}>
                    {a.addedToPayroll ? (
                      <span style={styles.badgeLocked}>
                        In payroll · {a.payrollPeriodLabel || ""}
                      </span>
                    ) : (
                      <span style={styles.badgeOpen}>Not added</span>
                    )}
                  </td>
                  <td style={styles.tdRight}>
                    {a.addedToPayroll ? (
                      <span style={styles.lockedText}>Locked {money(a.lockedAnnualCommission)}</span>
                    ) : (
                      <button style={styles.completeBtn} onClick={() => setConfirmTarget(a)}>
                        Completed
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {confirmTarget && (
        <div style={styles.modalOverlay} onClick={() => !submitting && setConfirmTarget(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Add to payroll?</h3>
            <p style={styles.modalText}>
              This will add <strong>{confirmTarget.title}</strong> to{" "}
              <strong>{confirmTarget.createdBy}</strong>'s payroll for{" "}
              <strong>{currentPeriod?.label || "the current period"}</strong>.
            </p>
            <p style={styles.modalText}>
              The commission <strong>{money(confirmTarget.annualCommission)}</strong> (annual) /{" "}
              <strong>{money(confirmTarget.weeklyCommission)}</strong> (weekly) will be{" "}
              <strong>locked</strong>. Later edits to this agreement will not change the payroll
              amount, and it cannot be added again.
            </p>
            <div style={styles.modalActions}>
              <button
                style={styles.cancelBtn}
                onClick={() => setConfirmTarget(null)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button style={styles.confirmBtn} onClick={confirmComplete} disabled={submitting}>
                {submitting ? "Adding…" : "Yes, add to payroll"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: { padding: "8px 4px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: 700, margin: 0 },
  subtitle: { color: "#6b7280", fontSize: 13, margin: "6px 0 0", maxWidth: 640 },
  periodBox: { display: "flex", flexDirection: "column", alignItems: "flex-end", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 14px" },
  periodLabel: { fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.4 },
  periodValue: { fontSize: 15, fontWeight: 700, color: "#111827" },
  notice: { background: "#ecfdf5", color: "#065f46", border: "1px solid #a7f3d0", borderRadius: 8, padding: "10px 14px", marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" },
  error: { background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" },
  dismiss: { background: "none", border: "none", cursor: "pointer", fontSize: 18, lineHeight: 1, color: "inherit" },
  muted: { color: "#6b7280", padding: "24px 0" },
  tableWrap: { overflowX: "auto", border: "1px solid #e5e7eb", borderRadius: 8 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { textAlign: "left", padding: "10px 12px", background: "#f9fafb", borderBottom: "1px solid #e5e7eb", fontWeight: 600, color: "#374151", whiteSpace: "nowrap" },
  thRight: { textAlign: "right", padding: "10px 12px", background: "#f9fafb", borderBottom: "1px solid #e5e7eb", fontWeight: 600, color: "#374151", whiteSpace: "nowrap" },
  td: { padding: "10px 12px", borderBottom: "1px solid #f3f4f6", color: "#111827" },
  tdRight: { padding: "10px 12px", borderBottom: "1px solid #f3f4f6", color: "#111827", textAlign: "right", whiteSpace: "nowrap" },
  rowLocked: { background: "#fafafa" },
  badgeLocked: { background: "#ede9fe", color: "#6d28d9", borderRadius: 999, padding: "2px 10px", fontSize: 12, fontWeight: 600 },
  badgeOpen: { background: "#f3f4f6", color: "#6b7280", borderRadius: 999, padding: "2px 10px", fontSize: 12 },
  lockedText: { color: "#6d28d9", fontWeight: 600, fontSize: 12 },
  completeBtn: { background: "#c00000", color: "#fff", border: "none", borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontWeight: 600, fontSize: 13 },
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modal: { background: "#fff", borderRadius: 12, padding: 24, maxWidth: 460, width: "90%", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" },
  modalTitle: { fontSize: 18, fontWeight: 700, margin: "0 0 12px" },
  modalText: { color: "#374151", fontSize: 14, margin: "0 0 10px", lineHeight: 1.5 },
  modalActions: { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 },
  cancelBtn: { background: "#f3f4f6", color: "#374151", border: "none", borderRadius: 6, padding: "8px 16px", cursor: "pointer", fontWeight: 600 },
  confirmBtn: { background: "#c00000", color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", cursor: "pointer", fontWeight: 600 },
};

export default PayrollAgreementsAdmin;
