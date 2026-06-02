import React, { useEffect } from "react";
import { Icon } from "../../atoms/Icon";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastProps {
  message: string;
  type?: ToastType;
  durationMs?: number;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = "info",
  durationMs = 4000,
  onClose,
}) => {
  useEffect(() => {
    if (durationMs <= 0) return;
    const id = window.setTimeout(onClose, durationMs);
    return () => window.clearTimeout(id);
  }, [durationMs, onClose]);

  return (
    <div className={`em-toast em-toast--${type}`} role="status">
      <span className="em-toast__message">{message}</span>
      <button
        type="button"
        className="em-toast__close"
        onClick={onClose}
        aria-label="Dismiss"
      >
        <Icon name="close" size={16} />
      </button>
    </div>
  );
};
