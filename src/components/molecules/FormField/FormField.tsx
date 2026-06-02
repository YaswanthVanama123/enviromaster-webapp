import React from "react";
import { Label } from "../../atoms/Label";

export interface FormFieldProps {
  label?: React.ReactNode;
  htmlFor?: string;
  required?: boolean;
  error?: string | null;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  htmlFor,
  required,
  error,
  hint,
  children,
  className = "",
}) => (
  <div className={`em-field ${className}`}>
    {label && (
      <Label htmlFor={htmlFor} required={required}>
        {label}
      </Label>
    )}
    {children}
    {error ? (
      <div className="em-field__error" role="alert">{error}</div>
    ) : hint ? (
      <div className="em-field__hint">{hint}</div>
    ) : null}
  </div>
);
