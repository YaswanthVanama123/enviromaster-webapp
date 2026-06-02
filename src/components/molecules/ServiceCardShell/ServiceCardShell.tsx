import React from "react";

export interface ServiceCardShellProps {
  title: string;
  onAddCustom?: () => void;
  onRemove?: () => void;
  headerActions?: React.ReactNode;
  addCustomLabel?: string;
  removeLabel?: string;
  className?: string;
  children: React.ReactNode;
}

export const ServiceCardShell: React.FC<ServiceCardShellProps> = ({
  title,
  onAddCustom,
  onRemove,
  headerActions,
  addCustomLabel = "Add custom field",
  removeLabel = "Remove this service",
  className = "svc-card",
  children,
}) => (
  <div className={className}>
    <div className="svc-h-row">
      <div className="svc-h">{title}</div>
      <div className="svc-h-actions">
        {headerActions}
        {onAddCustom && (
          <button
            type="button"
            className="svc-mini"
            onClick={onAddCustom}
            title={addCustomLabel}
          >
            +
          </button>
        )}
        {onRemove && (
          <button
            type="button"
            className="svc-mini svc-mini--neg"
            onClick={onRemove}
            title={removeLabel}
          >
            −
          </button>
        )}
      </div>
    </div>
    {children}
  </div>
);
