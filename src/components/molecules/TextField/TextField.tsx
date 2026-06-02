import React from "react";

export interface TextFieldProps {
  label?: React.ReactNode;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  type?: "text" | "email" | "tel" | "url";
  className?: string;
  inputClassName?: string;
}

export const TextField: React.FC<TextFieldProps> = ({
  label,
  name,
  value,
  onChange,
  placeholder,
  disabled,
  type = "text",
  className = "svc-label",
  inputClassName = "svc-in",
}) => (
  <label className={className}>
    {label}
    <input
      type={type}
      name={name}
      value={value ?? ""}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className={inputClassName}
    />
  </label>
);
