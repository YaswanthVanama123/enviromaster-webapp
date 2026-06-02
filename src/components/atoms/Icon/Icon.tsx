import React from "react";

export type IconName = "eye" | "eye-off" | "close" | "check" | "search";

export interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  ariaLabel?: string;
}

const PATHS: Record<IconName, React.ReactNode> = {
  eye: (
    <>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  "eye-off": (
    <>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </>
  ),
  close: <path d="M18 6 6 18M6 6l12 12" />,
  check: <path d="M20 6 9 17l-5-5" />,
  search: (
    <>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </>
  ),
};

export const Icon: React.FC<IconProps> = ({
  name,
  size = 18,
  className = "",
  ariaLabel,
}) => {
  const decorative = !ariaLabel;
  return (
    <svg
      className={`em-icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={decorative ? "presentation" : "img"}
      aria-hidden={decorative || undefined}
      aria-label={ariaLabel}
    >
      {PATHS[name]}
    </svg>
  );
};
