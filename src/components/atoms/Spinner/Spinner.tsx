import React from "react";

export type SpinnerSize = "sm" | "md" | "lg";

export interface SpinnerProps {
  size?: SpinnerSize;
  label?: string;
  className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = "md",
  label,
  className = "",
}) => (
  <span
    className={`em-spinner em-spinner--${size} ${className}`}
    role="status"
    aria-label={label ?? "Loading"}
  />
);
