import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { commissionApi, CommissionRecordsResponse } from "../../../backendservice/api/commissionApi";
import type { CommissionRecord } from "../../../backendservice/types/commission.types";

export const CommissionHistory: React.FC = () => {
  const { t } = useTranslation();
  const [records, setRecords] = useState<CommissionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchRecords();
  }, [statusFilter, page]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const response = await commissionApi.getRecords({
        status: statusFilter === "all" ? undefined : statusFilter,
        page,
        limit: 20,
      });

      if (response.data) {
        setRecords(response.data.records);
        setTotalPages(response.data.totalPages);
      }
    } catch (err) {
      setError(t("adminCommissionTools.history.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadgeClass = (status: string) => {
    return `status-badge ${status}`;
  };

  if (loading && records.length === 0) {
    return (
      <div className="loading-state">
        <span>{t("adminCommissionTools.history.loading")}</span>
      </div>
    );
  }

  return (
    <div className="commission-history">
      <div className="history-header">
        <h3 className="calculator-section-title">
          <span>H</span> {t("adminCommissionTools.history.title")}
        </h3>

        <div className="history-filters">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">{t("adminCommissionTools.history.allStatuses")}</option>
            <option value="draft">{t("adminCommissionTools.history.draft")}</option>
            <option value="submitted">{t("adminCommissionTools.history.submitted")}</option>
            <option value="approved">{t("adminCommissionTools.history.approved")}</option>
            <option value="paid">{t("adminCommissionTools.history.paid")}</option>
          </select>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {records.length === 0 ? (
        <div className="empty-state">
          <p>{t("adminCommissionTools.history.noRecords")}</p>
        </div>
      ) : (
        <>
          <table className="history-table">
            <thead>
              <tr>
                <th>{t("adminCommissionTools.history.colDate")}</th>
                <th>{t("adminCommissionTools.history.colCustomer")}</th>
                <th>{t("adminCommissionTools.history.colSalesPerson")}</th>
                <th>{t("adminCommissionTools.history.colMonthlyValue")}</th>
                <th>{t("adminCommissionTools.history.colCommissionRate")}</th>
                <th>{t("adminCommissionTools.history.colWeeklyCommission")}</th>
                <th>{t("adminCommissionTools.history.colStatus")}</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record._id}>
                  <td>{formatDate(record.createdAt)}</td>
                  <td>{record.customerName || "-"}</td>
                  <td>{record.salesPersonName}</td>
                  <td>
                    {formatCurrency(record.calculation.input.monthlyValue)}
                  </td>
                  <td>{record.calculation.finalCommissionRate.toFixed(2)}%</td>
                  <td>
                    {formatCurrency(record.calculation.weeklyCommission)}
                  </td>
                  <td>
                    <span className={getStatusBadgeClass(record.status)}>
                      {t(`adminCommissionTools.history.${record.status}`)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "8px",
                marginTop: "20px",
              }}
            >
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  padding: "8px 16px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  background: page === 1 ? "#f3f4f6" : "white",
                  cursor: page === 1 ? "not-allowed" : "pointer",
                }}
              >
                {t("adminCommissionTools.history.previous")}
              </button>
              <span style={{ padding: "8px 16px", color: "#6b7280" }}>
                {t("adminCommissionTools.history.pageOf", { page, totalPages })}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{
                  padding: "8px 16px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  background: page === totalPages ? "#f3f4f6" : "white",
                  cursor: page === totalPages ? "not-allowed" : "pointer",
                }}
              >
                {t("adminCommissionTools.history.next")}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
