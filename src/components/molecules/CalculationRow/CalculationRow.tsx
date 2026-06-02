import React, { type ChangeEvent, type FocusEvent } from "react";

export interface CalculationRowProps {
  label: React.ReactNode;
  qtyName: string;
  qtyValue: number | string | undefined;
  qtyOnChange: (e: ChangeEvent<HTMLInputElement>) => void;
  qtyTitle?: string;
  qtyMin?: number;
  qtyStep?: number;

  rateName: string;
  rateValue: string;
  rateOnChange: (e: ChangeEvent<HTMLInputElement>) => void;
  rateOnFocus?: (e: FocusEvent<HTMLInputElement>) => void;
  rateOnBlur?: (e: FocusEvent<HTMLInputElement>) => void;
  rateOverridden?: boolean;
  rateTitle?: string;
  rateStep?: number;

  totalName: string;
  totalValue: string;
  totalOnChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  totalOnFocus?: (e: FocusEvent<HTMLInputElement>) => void;
  totalOnBlur?: (e: FocusEvent<HTMLInputElement>) => void;
  totalOverridden?: boolean;
  totalReadOnly?: boolean;
  totalTitle?: string;
}

const overrideStyle = (isOverridden?: boolean): React.CSSProperties =>
  isOverridden ? { backgroundColor: "#fffacd" } : { backgroundColor: "white" };

export const CalculationRow: React.FC<CalculationRowProps> = ({
  label,
  qtyName,
  qtyValue,
  qtyOnChange,
  qtyTitle,
  qtyMin = 0,
  qtyStep,
  rateName,
  rateValue,
  rateOnChange,
  rateOnFocus,
  rateOnBlur,
  rateOverridden,
  rateTitle,
  rateStep = 1,
  totalName,
  totalValue,
  totalOnChange,
  totalOnFocus,
  totalOnBlur,
  totalOverridden,
  totalReadOnly = true,
  totalTitle,
}) => (
  <div className="svc-row">
    <div className="svc-label">
      <span>{label}</span>
    </div>
    <div className="svc-field">
      <div className="svc-inline">
        <input
          type="number"
          name={qtyName}
          className="svc-in field-qty"
          value={qtyValue ?? ""}
          onChange={qtyOnChange}
          min={qtyMin}
          step={qtyStep}
          title={qtyTitle}
        />
        <span>@</span>
        <span>$</span>
        <input
          type="number"
          name={rateName}
          className="svc-in field-rate"
          value={rateValue}
          onChange={rateOnChange}
          onFocus={rateOnFocus}
          onBlur={rateOnBlur}
          step={rateStep}
          min={0}
          style={overrideStyle(rateOverridden)}
          title={rateTitle}
        />
        <span>=</span>
        <span>$</span>
        <input
          type="text"
          name={totalName}
          className="svc-in field-qty"
          value={totalValue}
          onChange={totalOnChange}
          onFocus={totalOnFocus}
          onBlur={totalOnBlur}
          readOnly={totalReadOnly}
          style={overrideStyle(totalOverridden)}
          title={totalTitle}
        />
      </div>
    </div>
  </div>
);
