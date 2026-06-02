import React from "react";

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export const Label: React.FC<LabelProps> = ({
  required,
  className = "",
  children,
  ...rest
}) => (
  <label className={`em-label ${className}`} {...rest}>
    {children}
    {required && <span className="em-label__required" aria-hidden>*</span>}
  </label>
);
