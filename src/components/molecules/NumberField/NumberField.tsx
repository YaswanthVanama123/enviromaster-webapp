import React, { forwardRef } from "react";

export interface NumberFieldProps {
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
  className?: string;
  inputClassName?: string;
  highlighted?: boolean;
}

export const NumberField = forwardRef<HTMLInputElement, NumberFieldProps>(
  (
    {
      label,
      name,
      value,
      onChange,
      min = 0,
      max,
      step,
      placeholder,
      disabled,
      title,
      className = "svc-label",
      inputClassName = "svc-in",
      highlighted = false,
    },
    ref
  ) => (
    <label className={className}>
      {label}
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
    </label>
  )
);

NumberField.displayName = "NumberField";
