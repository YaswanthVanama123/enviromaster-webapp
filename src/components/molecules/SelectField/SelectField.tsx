import React from "react";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectFieldProps {
  label?: React.ReactNode;
  name: string;
  value: string | number;
  options: SelectOption[];
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  disabled?: boolean;
  className?: string;
  selectClassName?: string;
}

export const SelectField: React.FC<SelectFieldProps> = ({
  label,
  name,
  value,
  options,
  onChange,
  disabled,
  className = "svc-label",
  selectClassName = "svc-in",
}) => (
  <label className={className}>
    {label}
    <select
      name={name}
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={selectClassName}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  </label>
);
