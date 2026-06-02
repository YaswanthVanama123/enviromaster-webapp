import React from "react";

export interface TotalRow {
  label: string;
  amount: number;
  highlighted?: boolean;
}

export interface ServiceTotalsProps {
  rows: TotalRow[];
  breakdown?: string[];
  className?: string;
}

const formatMoney = (n: number): string =>
  n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const ServiceTotals: React.FC<ServiceTotalsProps> = ({
  rows,
  breakdown,
  className = "svc-summary",
}) => (
  <div className={className}>
    {rows.map((row) => (
      <div
        key={row.label}
        className={`svc-summary-row${row.highlighted ? " svc-summary-row--strong" : ""}`}
      >
        <span>{row.label}</span>
        <span>${formatMoney(row.amount)}</span>
      </div>
    ))}
    {breakdown && breakdown.length > 0 && (
      <ul className="svc-summary-list">
        {breakdown.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    )}
  </div>
);
