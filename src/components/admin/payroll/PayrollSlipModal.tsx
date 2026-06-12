import React, { useState } from "react";
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
          <h2>Payroll Statement</h2>
          <div className="modal-actions">
            <button className="modal-btn download-btn" onClick={handleDownloadPDF} disabled={downloading}>
              <FaDownload /> {downloading ? "Generating…" : "Download PDF"}
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
                <h1>ENVIRO-MASTER</h1>
                <div className="tagline">Services International</div>
                <div className="address">
                  1234 Corporate Boulevard, Suite 500<br />
                  Charlotte, NC 28202<br />
                  Tel: (704) 555-0123
                </div>
              </div>
              <div className="payroll-title-section">
                <h2>Payroll</h2>
                <div className="pay-date">Pay Date: {payDate}</div>
                <div className="check-no">Check No: {checkNumber}</div>
              </div>
            </div>

            {}
            <div className="info-grid">
              <div className="info-box">
                <div className="info-box-header">Employee Information</div>
                <div className="info-box-content">
                  <div className="info-row">
                    <span className="info-label">Employee Name</span>
                    <span className="info-value">{employee.username}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Employee ID</span>
                    <span className="info-value">EMP-{employee.username.toUpperCase().slice(0, 4)}-001</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Department</span>
                    <span className="info-value">Sales</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Position</span>
                    <span className="info-value">Sales Representative</span>
                  </div>
                </div>
              </div>

              <div className="info-box">
                <div className="info-box-header">Pay Period</div>
                <div className="info-box-content">
                  <div className="info-row">
                    <span className="info-label">Period</span>
                    <span className="info-value">{period.label}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Start Date</span>
                    <span className="info-value">{formatShortDate(period.start)}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">End Date</span>
                    <span className="info-value">{formatShortDate(period.end)}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Payment Date</span>
                    <span className="info-value">{formatShortDate(today.toISOString())}</span>
                  </div>
                </div>
              </div>
            </div>

            {}
            <div className="earnings-section">
              <div className="section-title">Commission Earnings</div>
              <table className="earnings-table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Status</th>
                    <th>Contract Value</th>
                    <th>Commission</th>
                  </tr>
                </thead>
                <tbody>
                  {employee.agreements.map((agreement) => (
                    <tr key={agreement.id}>
                      <td>
                        <div className="agreement-name">{agreement.title}</div>
                        <div className="agreement-date">Created: {formatShortDate(agreement.createdAt)}</div>
                      </td>
                      <td>
                        <span className={`status-tag ${agreement.status}`}>
                          {agreement.status.replace("_", " ")}
                        </span>
                      </td>
                      <td>{formatMoney(agreement.monthlyValue)}/mo</td>
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
                  <span className="label">Total Agreements</span>
                  <span className="value">{employee.totalAgreements}</span>
                </div>
                <div className="summary-row">
                  <span className="label">Total Monthly Revenue</span>
                  <span className="value">{formatMoney(employee.totalMonthlyRevenue)}</span>
                </div>
                <div className="summary-row">
                  <span className="label">Commission Rate</span>
                  <span className="value">6.00%</span>
                </div>
                <div className="summary-row total">
                  <span className="label">NET PAY</span>
                  <span className="value">{formatMoney(employee.totalAnnualCommission)}</span>
                </div>
              </div>
            </div>

            {}
            <div className="footer-section">
              <div className="signature-block">
                <div className="signature-line">
                  <div className="signature-name">{employee.username}</div>
                  <div className="signature-title">Employee</div>
                </div>
              </div>
              <div className="signature-block">
                <div className="signature-line">
                  <div className="signature-name">Authorized Signatory</div>
                  <div className="signature-title">Payroll Department</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
