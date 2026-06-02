import React, { forwardRef } from "react";

export interface DollarFieldProps {
  label?: React.ReactNode;
  name: string;
  value: number | string | undefined;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  disabled?: boolean;
  title?: string;
  highlighted?: boolean;
  rowClassName?: string;
  fieldClassName?: string;
  inputClassName?: string;
}

export const DollarField = forwardRef<HTMLInputElement, DollarFieldProps>(
  (
    {
      label,
      name,
      value,
      onChange,
      min = 0,
      max,
      step = 0.01,
      placeholder,
      disabled,
      title,
      highlighted = false,
      rowClassName = "svc-row",
      fieldClassName = "svc-field svc-dollar",
      inputClassName = "svc-in field-rate",
    },
    ref
  ) => (
    <div className={rowClassName}>
      {label && (
        <div className="svc-label">
          <span>{label}</span>
        </div>
      )}
      <div className={fieldClassName}>
        <span>$</span>
        <input
          ref={ref}
          type="number"
          name={name}
          value={value === undefined || value === null ? "" : value}
          onChange={onChange}
          min={min}
          max={max}
          step={step}
          placeholder={placeholder}
          disabled={disabled}
          title={title}
          className={`${inputClassName}${highlighted ? " field-rate--override" : ""}`}
        />
      </div>
    </div>
  )
);

DollarField.displayName = "DollarField";
