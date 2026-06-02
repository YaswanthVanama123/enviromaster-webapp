import React from "react";
import { Spinner } from "../Spinner";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  type?: "button" | "submit" | "reset";
}

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  disabled,
  className = "",
  children,
  type = "button",
  ...rest
}) => {
  const classes = [
    "em-btn",
    `em-btn--${variant}`,
    `em-btn--${size}`,
    fullWidth ? "em-btn--block" : "",
    loading ? "em-btn--loading" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Spinner size="sm" className="em-spinner--inline" />}
      {!loading && leftIcon && <span className="em-btn__icon">{leftIcon}</span>}
      <span className="em-btn__label">{children}</span>
      {!loading && rightIcon && <span className="em-btn__icon">{rightIcon}</span>}
    </button>
  );
};
