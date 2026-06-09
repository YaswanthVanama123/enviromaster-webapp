interface SlipAgreement {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  monthlyValue: number;
  annualCommission: number;
}

interface SlipEmployee {
  username: string;
  totalAgreements: number;
  totalMonthlyRevenue: number;
  totalAnnualCommission: number;
  agreements: SlipAgreement[];
}

interface SlipPeriod {
  start: string;
  end: string;
  label: string;
}

const fmtMoney = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount || 0);

const fmtShortDate = (dateStr: string) =>
  dateStr
    ? new Date(dateStr).toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
      })
    : "—";

const fmtLongDate = (dateStr: string) =>
  dateStr
    ? new Date(dateStr).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "—";

const esc = (s: string) =>
  String(s ?? "").replace(/[&<>"']/g, c =>
    ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c] as string),
  );

export const PAYROLL_PDF_STYLES = `
  <style>
    @page { size: A4; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      font-family: 'Arial', sans-serif; background: white; color: #000;
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
    }
    .payroll-document { width: 100%; padding: 40px 50px; background: white; }
    .payroll-document + .payroll-document { page-break-before: always; }
    .payroll-doc-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #6366f1;
    }
    .company-logo-section h1 { font-size: 28px; font-weight: 800; color: #6366f1; letter-spacing: -0.5px; }
    .company-logo-section .tagline { font-size: 11px; color: #4a5568; margin-top: 2px; letter-spacing: 1px; text-transform: uppercase; }
    .company-logo-section .address { font-size: 11px; color: #718096; margin-top: 8px; line-height: 1.5; }
    .payroll-title-section { text-align: right; }
    .payroll-title-section h2 { font-size: 24px; font-weight: 700; color: #6366f1; text-transform: uppercase; letter-spacing: 3px; }
    .payroll-title-section .pay-date { font-size: 13px; color: #4a5568; margin-top: 8px; }
    .payroll-title-section .check-no { font-size: 12px; color: #718096; margin-top: 4px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
    .info-box { border: 1px solid #e2e8f0; border-radius: 4px; overflow: hidden; }
    .info-box-header { background: #6366f1; color: white; padding: 10px 16px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
    .info-box-content { padding: 16px; }
    .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0; font-size: 13px; }
    .info-row:last-child { border-bottom: none; }
    .info-label { color: #4a5568; }
    .info-value { font-weight: 600; color: #1a202c; }
    .section-title { background: #6366f1; color: white; padding: 12px 16px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; border-radius: 4px 4px 0 0; }
    .earnings-section { margin-bottom: 30px; }
    .earnings-table { width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; border-top: none; }
    .earnings-table th { background: #f7fafc; padding: 12px 16px; text-align: left; font-size: 11px; font-weight: 700; color: #4a5568; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e2e8f0; }
    .earnings-table th:nth-child(3), .earnings-table th:nth-child(4) { text-align: right; }
    .earnings-table td { padding: 14px 16px; font-size: 13px; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
    .earnings-table td:nth-child(3), .earnings-table td:nth-child(4) { text-align: right; }
    .earnings-table tr:last-child td { border-bottom: none; }
    .agreement-name { font-weight: 600; color: #1a202c; }
    .agreement-date { font-size: 11px; color: #718096; margin-top: 2px; }
    .status-tag { display: inline-block; padding: 3px 8px; border-radius: 3px; font-size: 10px; font-weight: 600; text-transform: uppercase; }
    .status-tag.active { background: #ede9fe; color: #7c3aed; }
    .status-tag.saved { background: #dbeafe; color: #2563eb; }
    .status-tag.pending_approval { background: #fef3c7; color: #d97706; }
    .status-tag.approved { background: #e0e7ff; color: #4338ca; }
    .status-tag.draft { background: #e2e8f0; color: #4a5568; }
    .commission-amount { font-weight: 700; color: #7c3aed; }
    .summary-section { margin-bottom: 30px; }
    .summary-box { border: 2px solid #6366f1; border-radius: 4px; overflow: hidden; }
    .summary-row { display: flex; justify-content: space-between; padding: 14px 20px; font-size: 14px; border-bottom: 1px solid #e2e8f0; }
    .summary-row:last-child { border-bottom: none; }
    .summary-row .label { color: #4a5568; }
    .summary-row .value { font-weight: 600; color: #1a202c; }
    .summary-row.total { background: #6366f1; color: white; }
    .summary-row.total .label { font-weight: 700; font-size: 16px; color: white; }
    .summary-row.total .value { font-size: 24px; font-weight: 800; color: white; }
    .footer-section { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; margin-top: 50px; padding-top: 30px; }
    .signature-block { text-align: center; }
    .signature-line { border-top: 2px solid #1a202c; margin-top: 60px; padding-top: 10px; }
    .signature-name { font-size: 13px; font-weight: 600; color: #1a202c; }
    .signature-title { font-size: 11px; color: #718096; margin-top: 2px; }
  </style>
`;

export function buildPayrollSlipHtml(employee: SlipEmployee, period: SlipPeriod): string {
  const today = new Date();
  const checkNumber = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${employee.username.toUpperCase().slice(0, 3)}`;
  const empUpper = employee.username.toUpperCase().slice(0, 4);

  const rows = employee.agreements
    .map(
      a => `
        <tr>
          <td>
            <div class="agreement-name">${esc(a.title)}</div>
            <div class="agreement-date">Created: ${fmtShortDate(a.createdAt)}</div>
          </td>
          <td><span class="status-tag ${esc(a.status)}">${esc((a.status || '').replace("_", " "))}</span></td>
          <td>${fmtMoney(a.monthlyValue)}/mo</td>
          <td class="commission-amount">${fmtMoney(a.annualCommission)}</td>
        </tr>`,
    )
    .join("");

  return `
    <div class="payroll-document">
      <div class="payroll-doc-header">
        <div class="company-logo-section">
          <h1>ENVIRO-MASTER</h1>
          <div class="tagline">Services International</div>
          <div class="address">1234 Corporate Boulevard, Suite 500<br/>Charlotte, NC 28202<br/>Tel: (704) 555-0123</div>
        </div>
        <div class="payroll-title-section">
          <h2>Payroll</h2>
          <div class="pay-date">Pay Date: ${fmtLongDate(today.toISOString())}</div>
          <div class="check-no">Check No: ${checkNumber}</div>
        </div>
      </div>

      <div class="info-grid">
        <div class="info-box">
          <div class="info-box-header">Employee Information</div>
          <div class="info-box-content">
            <div class="info-row"><span class="info-label">Employee Name</span><span class="info-value">${esc(employee.username)}</span></div>
            <div class="info-row"><span class="info-label">Employee ID</span><span class="info-value">EMP-${esc(empUpper)}-001</span></div>
            <div class="info-row"><span class="info-label">Department</span><span class="info-value">Sales</span></div>
            <div class="info-row"><span class="info-label">Position</span><span class="info-value">Sales Representative</span></div>
          </div>
        </div>
        <div class="info-box">
          <div class="info-box-header">Pay Period</div>
          <div class="info-box-content">
            <div class="info-row"><span class="info-label">Period</span><span class="info-value">${esc(period.label)}</span></div>
            <div class="info-row"><span class="info-label">Start Date</span><span class="info-value">${fmtShortDate(period.start)}</span></div>
            <div class="info-row"><span class="info-label">End Date</span><span class="info-value">${fmtShortDate(period.end)}</span></div>
            <div class="info-row"><span class="info-label">Payment Date</span><span class="info-value">${fmtShortDate(today.toISOString())}</span></div>
          </div>
        </div>
      </div>

      <div class="earnings-section">
        <div class="section-title">Commission Earnings</div>
        <table class="earnings-table">
          <thead>
            <tr><th>Description</th><th>Status</th><th>Contract Value</th><th>Commission</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>

      <div class="summary-section">
        <div class="summary-box">
          <div class="summary-row"><span class="label">Total Agreements</span><span class="value">${employee.totalAgreements}</span></div>
          <div class="summary-row"><span class="label">Total Monthly Revenue</span><span class="value">${fmtMoney(employee.totalMonthlyRevenue)}</span></div>
          <div class="summary-row total"><span class="label">NET PAY</span><span class="value">${fmtMoney(employee.totalAnnualCommission)}</span></div>
        </div>
      </div>

      <div class="footer-section">
        <div class="signature-block"><div class="signature-line"><div class="signature-name">${esc(employee.username)}</div><div class="signature-title">Employee</div></div></div>
        <div class="signature-block"><div class="signature-line"><div class="signature-name">Authorized Signatory</div><div class="signature-title">Payroll Department</div></div></div>
      </div>
    </div>
  `;
}

export function printPayrollSlips(bodyHtml: string, title: string) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    return;
  }
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head><title>${esc(title)}</title>${PAYROLL_PDF_STYLES}</head>
      <body>${bodyHtml}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 400);
}
