import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFolder,
  faFolderOpen,
  faChevronRight,
  faChevronDown,
  faFileAlt,
  faLock,
  faEye,
  faDownload,
} from "@fortawesome/free-solid-svg-icons";
import { pdfApi } from "../../../backendservice/api/pdfApi";
import type { SavedFileGroup, SavedFileListItem } from "../../../backendservice/api/pdfApi";
import { manualUploadApi } from "../../../backendservice/api";
import { apiClient } from "../../../backendservice/utils/apiClient";
import "../../SavedFiles/AgreementRow.css";
import "../../SavedFiles/FileRow.css";

const PAGE_SIZE = 15;

const money = (n: number | null | undefined): string =>
  `$${(n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fileLabel = (f: SavedFileListItem): string => {
  if (f.fileType === "version_pdf") return f.title || `Version ${f.versionNumber ?? ""}`;
  if (f.fileType === "version_log") return f.title || "Change Log";
  if (f.fileType === "attached_pdf") return f.title || f.fileName;
  return f.title || f.fileName || "Document";
};

export const PayrollAgreementsAdmin: React.FC = () => {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<SavedFileGroup[]>([]);
  const [periodLabel, setPeriodLabel] = useState<string>("—");
  const [page, setPage] = useState(1);
  const [totalGroups, setTotalGroups] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [confirmTarget, setConfirmTarget] = useState<SavedFileGroup | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [grouped, periodsRes] = await Promise.all([
        pdfApi.getSavedFilesGrouped(page, PAGE_SIZE, { commissionOnly: true, includeDrafts: true }),
        apiClient.get<any>("/api/payroll/periods"),
      ]);
      setGroups(grouped.groups || []);
      setTotalGroups(grouped.totalGroups || 0);
      setPeriodLabel(periodsRes.data?.periods?.current?.label || "—");
    } catch (err: any) {
      setError(err?.message || "Failed to load agreements");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPages = Math.max(1, Math.ceil(totalGroups / PAGE_SIZE));

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const viewFile = async (f: SavedFileListItem) => {
    try {
      if (f.fileType === "main_pdf") {
        await pdfApi.getSavedFileDetails(f.id);
      }
      let documentType: string;
      if (f.fileType === "main_pdf") documentType = "agreement";
      else if (f.fileType === "version_pdf") documentType = "version";
      else if (f.fileType === "version_log") documentType = "version-log";
      else if (f.fileType === "attached_pdf") documentType = "manual-upload";
      else documentType = "attached-file";

      navigate("/pdf-viewer", {
        state: {
          documentId: f.id,
          fileName: f.title,
          documentType,
          watermark: false,
          originalReturnPath: "/admin-panel/payroll-agreements",
        },
      });
    } catch (err: any) {
      setError(err?.message || "Failed to open file");
    }
  };

  const downloadFile = async (f: SavedFileListItem) => {
    try {
      let blob: Blob;
      if (f.fileType === "main_pdf") blob = await pdfApi.downloadPdf(f.id);
      else if (f.fileType === "version_pdf") blob = await pdfApi.downloadVersionPdf(f.id, false);
      else if (f.fileType === "version_log") blob = await pdfApi.downloadVersionLog(f.id);
      else if (f.fileType === "attached_pdf") blob = await manualUploadApi.downloadFile(f.id);
      else blob = await pdfApi.downloadAttachedFile(f.id);

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      let safeName: string;
      if (f.fileType === "version_log") {
        safeName = f.fileName || "EnviroMaster_Version_Log.txt";
      } else {
        const baseFileName = f.fileName || "EnviroMaster_Document";
        safeName = baseFileName.endsWith(".pdf")
          ? baseFileName
          : baseFileName.replace(/[^\w\-]+/g, "_") + ".pdf";
      }
      a.download = safeName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err?.message || "Failed to download file");
    }
  };

  const confirmComplete = async () => {
    if (!confirmTarget) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiClient.post<any>(`/api/payroll/agreements/${confirmTarget.id}/complete`, {});
      if (res.error || !res.data?.success) throw new Error(res.error || "Failed to add to payroll");
      setNotice(`"${confirmTarget.agreementTitle}" added to payroll (${res.data.payrollLock?.periodLabel || periodLabel}).`);
      setConfirmTarget(null);
      await fetchData();
    } catch (err: any) {
      setError(err?.message || "Failed to add to payroll");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.panel}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>Payroll Agreements</h2>
            <p style={styles.subtitle}>
              Agreements with commission calculated. Open a folder to see its version files.
              Marking one <strong>Completed</strong> locks its commission into the current payroll period.
            </p>
          </div>
          <div style={styles.periodBox}>
            <span style={styles.periodLabel}>Current payroll period</span>
            <span style={styles.periodValue}>{periodLabel}</span>
          </div>
        </div>

        {notice && (
          <div style={styles.notice}>{notice}<button style={styles.dismiss} onClick={() => setNotice(null)}>×</button></div>
        )}
        {error && (
          <div style={styles.error}>{error}<button style={styles.dismiss} onClick={() => setError(null)}>×</button></div>
        )}

        {loading ? (
          <p style={styles.muted}>Loading…</p>
        ) : groups.length === 0 ? (
          <p style={styles.muted}>No agreements with commission found.</p>
        ) : (
          <div className="sf">
            {groups.map((g) => {
              const isOpen = expanded.has(g.id);
              return (
                <div key={g.id} className="agreement-card">
                  <div
                    className="agreement-header"
                    style={{ borderBottom: isOpen ? "1px solid #f0f0f0" : "none" }}
                  >
                    <div
                      className="agreement-main-content"
                      onClick={() => toggleExpand(g.id)}
                    >
                      <FontAwesomeIcon
                        icon={isOpen ? faChevronDown : faChevronRight}
                        style={{ color: "#6b7280", fontSize: "14px", marginRight: "8px" }}
                      />
                      <FontAwesomeIcon
                        icon={isOpen ? faFolderOpen : faFolder}
                        style={{ color: "#f59e0b", fontSize: "18px", marginRight: "12px" }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontWeight: 600, fontSize: "16px", color: "#374151" }}>
                          {g.agreementTitle}
                        </span>
                        <span style={{ marginLeft: "10px", fontSize: "13px", color: "#9ca3af" }}>
                          {g.fileCount} {g.fileCount === 1 ? "file" : "files"}
                        </span>
                      </div>
                    </div>

                    <div className="agreement-actions">
                      <span style={styles.commission}>{money(g.annualCommission)} <span style={styles.unit}>/ yr</span></span>
                      <span style={styles.commissionWk}>{money(g.weeklyCommission)} <span style={styles.unit}>/ wk</span></span>
                      {g.addedToPayroll ? (
                        <span style={styles.badge}>
                          <FontAwesomeIcon icon={faLock} style={{ fontSize: "10px", marginRight: "5px" }} />
                          In payroll{g.payrollPeriodLabel ? ` · ${g.payrollPeriodLabel}` : ""}
                        </span>
                      ) : (
                        <button style={styles.completeBtn} onClick={() => setConfirmTarget(g)}>Completed</button>
                      )}
                    </div>
                  </div>

                  {isOpen && (
                    <div style={{ padding: "8px 16px 16px" }}>
                      <div style={styles.fileMeta}>Created by {g.createdBy || "—"}</div>
                      {g.files.length === 0 ? (
                        <div style={styles.fileEmpty}>No files</div>
                      ) : (
                        g.files.map((f) => (
                          <div
                            key={f.id}
                            className="file-row"
                            style={{ background: "#fafafa", borderColor: "#f0f0f0" }}
                          >
                            <div className="file-row-info">
                              <div className="file-row-info-main">
                                <FontAwesomeIcon icon={faFileAlt} style={{ color: "#9ca3af", fontSize: "14px" }} />
                                <span className="file-row-name">{fileLabel(f)}</span>
                                <span style={styles.fileStatusBadge}>{f.status}</span>
                              </div>
                            </div>
                            <div className="file-row-actions">
                              <button style={styles.iconbtn} title="View" onClick={() => viewFile(f)}>
                                <FontAwesomeIcon icon={faEye} />
                              </button>
                              <button style={styles.iconbtn} title="Download PDF" onClick={() => downloadFile(f)}>
                                <FontAwesomeIcon icon={faDownload} />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!loading && totalGroups > 0 && (
          <div style={styles.pagination}>
            <span style={styles.pageInfo}>
              Page {page} of {totalPages} · {totalGroups} agreement{totalGroups === 1 ? "" : "s"}
            </span>
            <div style={styles.pageButtons}>
              <button
                style={{ ...styles.pageBtn, ...(page <= 1 ? styles.pageBtnDisabled : {}) }}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                ‹ Prev
              </button>
              <button
                style={{ ...styles.pageBtn, ...(page >= totalPages ? styles.pageBtnDisabled : {}) }}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next ›
              </button>
            </div>
          </div>
        )}
      </div>

      {confirmTarget && (
        <div style={styles.modalOverlay} onClick={() => !submitting && setConfirmTarget(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Add to payroll?</h3>
            <p style={styles.modalText}>
              This will add <strong>{confirmTarget.agreementTitle}</strong> to{" "}
              <strong>{confirmTarget.createdBy}</strong>'s payroll for <strong>{periodLabel}</strong>.
            </p>
            <p style={styles.modalText}>
              The commission <strong>{money(confirmTarget.annualCommission)}</strong> (annual) /{" "}
              <strong>{money(confirmTarget.weeklyCommission)}</strong> (weekly) will be{" "}
              <strong>locked</strong>. Later edits to this agreement will not change the payroll
              amount, and it cannot be added again.
            </p>
            <div style={styles.modalActions}>
              <button style={styles.cancelBtn} onClick={() => setConfirmTarget(null)} disabled={submitting}>Cancel</button>
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
  page: { padding: "24px 32px", background: "transparent" },
  panel: { background: "#fff", border: "1px solid #ececec", borderRadius: 12, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 18 },
  title: { fontSize: 22, fontWeight: 700, margin: 0, color: "#1f2937" },
  subtitle: { color: "#6b7280", fontSize: 13, margin: "6px 0 0", maxWidth: 620, lineHeight: 1.5 },
  periodBox: { display: "flex", flexDirection: "column", alignItems: "flex-end", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 14px", whiteSpace: "nowrap" },
  periodLabel: { fontSize: 10, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5 },
  periodValue: { fontSize: 15, fontWeight: 700, color: "#111827" },
  notice: { background: "#ecfdf5", color: "#065f46", border: "1px solid #a7f3d0", borderRadius: 8, padding: "10px 14px", marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" },
  error: { background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" },
  dismiss: { background: "none", border: "none", cursor: "pointer", fontSize: 18, lineHeight: 1, color: "inherit" },
  muted: { color: "#9ca3af", padding: "32px 0", textAlign: "center" },
  commission: { fontWeight: 700, color: "#16a34a", fontSize: 15 },
  commissionWk: { color: "#9ca3af", fontSize: 13 },
  unit: { color: "#9ca3af", fontWeight: 400, fontSize: 12 },
  badge: { display: "inline-flex", alignItems: "center", background: "#f5f3ff", color: "#6d28d9", border: "1px solid #ddd6fe", borderRadius: 999, padding: "5px 12px", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" },
  completeBtn: { background: "#c00000", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", cursor: "pointer", fontWeight: 600, fontSize: 13 },
  fileMeta: { fontSize: 12, color: "#9ca3af", margin: "0 0 8px" },
  fileEmpty: { fontSize: 13, color: "#9ca3af" },
  fileStatusBadge: { fontSize: 11, fontWeight: 600, color: "#6b7280", background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 999, padding: "1px 8px", textTransform: "capitalize" },
  iconbtn: { background: "#fff", border: "1px solid #ddd", width: 32, height: 32, borderRadius: 8, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 14, cursor: "pointer", color: "#2563eb" },
  pagination: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 18, paddingTop: 16, borderTop: "1px solid #f0f0f0" },
  pageInfo: { fontSize: 13, color: "#6b7280" },
  pageButtons: { display: "flex", gap: 8 },
  pageBtn: { background: "#fff", border: "1px solid #d1d5db", color: "#374151", borderRadius: 8, padding: "7px 16px", cursor: "pointer", fontSize: 13, fontWeight: 600 },
  pageBtnDisabled: { opacity: 0.45, cursor: "not-allowed" },
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modal: { background: "#fff", borderRadius: 12, padding: 24, maxWidth: 460, width: "90%", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" },
  modalTitle: { fontSize: 18, fontWeight: 700, margin: "0 0 12px" },
  modalText: { color: "#374151", fontSize: 14, margin: "0 0 10px", lineHeight: 1.5 },
  modalActions: { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 },
  cancelBtn: { background: "#f3f4f6", color: "#374151", border: "none", borderRadius: 6, padding: "8px 16px", cursor: "pointer", fontWeight: 600 },
  confirmBtn: { background: "#c00000", color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", cursor: "pointer", fontWeight: 600 },
};

export default PayrollAgreementsAdmin;
