import React from "react";

export type BannerTone = "info" | "success" | "warning" | "danger";

export interface BannerProps {
  tone?: BannerTone;
  title?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export const Banner: React.FC<BannerProps> = ({
  tone = "info",
  title,
  children,
  className = "",
}) => (
  <div className={`em-banner em-banner--${tone} ${className}`}>
    {title && <div className="em-banner__title">{title}</div>}
    {children && <div className="em-banner__body">{children}</div>}
  </div>
);
