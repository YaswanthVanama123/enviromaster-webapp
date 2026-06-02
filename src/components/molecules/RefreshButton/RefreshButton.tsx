import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSync, faSpinner } from "@fortawesome/free-solid-svg-icons";

export interface RefreshButtonProps {
  onClick: () => void;
  loading?: boolean;
  title?: string;
  className?: string;
}

export const RefreshButton: React.FC<RefreshButtonProps> = ({
  onClick,
  loading = false,
  title = "Refresh config from database",
  className = "svc-mini",
}) => (
  <button
    type="button"
    className={className}
    onClick={onClick}
    disabled={loading}
    title={title}
  >
    <FontAwesomeIcon icon={loading ? faSpinner : faSync} spin={loading} />
  </button>
);
