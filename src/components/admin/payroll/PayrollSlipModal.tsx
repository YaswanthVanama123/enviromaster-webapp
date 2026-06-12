import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { FaTimes, FaDownload } from "react-icons/fa";
import { apiClient } from "../../../backendservice/utils/apiClient";
import "./PayrollSlipModal.css";

interface Agreement {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  monthlyValue: number;
  annualCommission: number;
}

interface EmployeePayroll {
  username: string;
  totalAgreements: number;
  totalMonthlyRevenue: number;
  totalAnnualCommission: number;
  statusCounts: {
    draft: number;
    saved: number;
    pending_approval: number;
    approved: number;
    active: number;
  };
  agreements: Agreement[];
}

interface PayrollPeriod {
  start: string;
  end: string;
  label: string;
}

interface PayrollSlipModalProps {
  employee: EmployeePayroll;
  period: PayrollPeriod;
  onClose: () => void;
}

export const PayrollSlipModal: React.FC<PayrollSlipModalProps> = ({
  employee,
  period,
  onClose,
}) => {
  const { t } = useTranslation();
  const formatMoney = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

  const formatShortDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });

  const today = new Date();
  const payDate = formatDate(today.toISOString());
  const checkNumber = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${employee.username.toUpperCase().slice(0, 3)}${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`;

  const [downloading, setDownloading] = useState(false);

  const handleDownloadPDF = async () => {
    try {
      setDownloading(true);
      const blob = await apiClient.downloadBlob(
        `/api/payroll/download-pdf?periodStart=${encodeURIComponent(period.start)}&periodEnd=${encodeURIComponent(period.end)}&username=${encodeURIComponent(employee.username)}`,
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `payroll-${employee.username.replace(/[^a-z0-9]+/gi, "-")}-${period.label.replace(/[^a-z0-9]+/gi, "-")}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download payroll PDF:", err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="payroll-modal-overlay" onClick={onClose}>
      <div className="payroll-modal" onClick={(e) => e.stopPropagation()}>
        <div className="payroll-modal-header">
          <h2>{t("payroll.slip.statement")}</h2>
          <div className="modal-actions">
            <button className="modal-btn download-btn" onClick={handleDownloadPDF} disabled={downloading}>
              <FaDownload /> {downloading ? t("payroll.slip.generating") : t("payroll.slip.downloadPdf")}
            </button>
            <button className="modal-btn close-btn" onClick={onClose}>
              <FaTimes />
            </button>
          </div>
        </div>

        <div className="payroll-modal-content">
          <div className="payroll-document">
            {}
            <div className="payroll-doc-header">
              <div className="company-logo-section">
                <h1>{t("payroll.slip.companyName")}</h1>
                <div className="tagline">{t("payroll.slip.tagline")}</div>
                <div className="address">
                  1234 Corporate Boulevard, Suite 500<br />
                  Charlotte, NC 28202<br />
                  Tel: (704) 555-0123
                </div>
              </div>
              <div className="payroll-title-section">
                <h2>{t("payroll.slip.title")}</h2>
                <div className="pay-date">{t("payroll.slip.payDate", { date: payDate })}</div>
                <div className="check-no">{t("payroll.slip.checkNo", { number: checkNumber })}</div>
              </div>
            </div>

            {}
            <div className="info-grid">
              <div className="info-box">
                <div className="info-box-header">{t("payroll.slip.employeeInformation")}</div>
                <div className="info-box-content">
                  <div className="info-row">
                    <span className="info-label">{t("payroll.slip.employeeName")}</span>
                    <span className="info-value">{employee.username}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">{t("payroll.slip.employeeId")}</span>
                    <span className="info-value">EMP-{employee.username.toUpperCase().slice(0, 4)}-001</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">{t("payroll.slip.department")}</span>
                    <span className="info-value">{t("payroll.slip.departmentValue")}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">{t("payroll.slip.position")}</span>
                    <span className="info-value">{t("payroll.slip.positionValue")}</span>
                  </div>
                </div>
              </div>

              <div className="info-box">
                <div className="info-box-header">{t("payroll.slip.payPeriod")}</div>
                <div className="info-box-content">
                  <div className="info-row">
                    <span className="info-label">{t("payroll.slip.period")}</span>
                    <span className="info-value">{period.label}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">{t("payroll.slip.startDate")}</span>
                    <span className="info-value">{formatShortDate(period.start)}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">{t("payroll.slip.endDate")}</span>
                    <span className="info-value">{formatShortDate(period.end)}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">{t("payroll.slip.paymentDate")}</span>
                    <span className="info-value">{formatShortDate(today.toISOString())}</span>
                  </div>
                </div>
              </div>
            </div>

            {}
            <div className="earnings-section">
              <div className="section-title">{t("payroll.slip.commissionEarnings")}</div>
              <table className="earnings-table">
                <thead>
                  <tr>
                    <th>{t("payroll.slip.colDescription")}</th>
                    <th>{t("payroll.slip.colStatus")}</th>
                    <th>{t("payroll.slip.colContractValue")}</th>
                    <th>{t("payroll.slip.colCommission")}</th>
                  </tr>
                </thead>
                <tbody>
                  {employee.agreements.map((agreement) => (
                    <tr key={agreement.id}>
                      <td>
                        <div className="agreement-name">{agreement.title}</div>
                        <div className="agreement-date">{t("payroll.slip.createdLabel", { date: formatShortDate(agreement.createdAt) })}</div>
                      </td>
                      <td>
                        <span className={`status-tag ${agreement.status}`}>
                          {agreement.status.replace("_", " ")}
                        </span>
                      </td>
                      <td>{t("payroll.slip.perMonth", { value: formatMoney(agreement.monthlyValue) })}</td>
                      <td className="commission-amount">{formatMoney(agreement.annualCommission)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {}
            <div className="summary-section">
              <div className="summary-box">
                <div className="summary-row">
                  <span className="label">{t("payroll.slip.totalAgreements")}</span>
                  <span className="value">{employee.totalAgreements}</span>
                </div>
                <div className="summary-row">
                  <span className="label">{t("payroll.slip.totalMonthlyRevenue")}</span>
                  <span className="value">{formatMoney(employee.totalMonthlyRevenue)}</span>
                </div>
                <div className="summary-row">
                  <span className="label">{t("payroll.slip.commissionRate")}</span>
                  <span className="value">6.00%</span>
                </div>
                <div className="summary-row total">
                  <span className="label">{t("payroll.slip.netPay")}</span>
                  <span className="value">{formatMoney(employee.totalAnnualCommission)}</span>
                </div>
              </div>
            </div>

            {}
            <div className="footer-section">
              <div className="signature-block">
                <div className="signature-line">
                  <div className="signature-name">{employee.username}</div>
                  <div className="signature-title">{t("payroll.slip.employeeRole")}</div>
                </div>
              </div>
              <div className="signature-block">
                <div className="signature-line">
                  <div className="signature-name">{t("payroll.slip.authorizedSignatory")}</div>
                  <div className="signature-title">{t("payroll.slip.payrollDepartment")}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
