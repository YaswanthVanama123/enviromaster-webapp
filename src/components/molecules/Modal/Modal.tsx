import React, { useEffect } from "react";

export type ModalSize = "sm" | "md" | "lg";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  size?: ModalSize;
  closeOnOverlayClick?: boolean;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  subtitle,
  size = "md",
  closeOnOverlayClick = true,
  footer,
  children,
}) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="em-modal__overlay"
      onClick={closeOnOverlayClick ? onClose : undefined}
      role="presentation"
    >
      <div
        className={`em-modal em-modal--${size}`}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {(title || subtitle) && (
          <div className="em-modal__header">
            {title && <h3 className="em-modal__title">{title}</h3>}
            {subtitle && <p className="em-modal__subtitle">{subtitle}</p>}
          </div>
        )}
        <div className="em-modal__body">{children}</div>
        {footer && <div className="em-modal__footer">{footer}</div>}
      </div>
    </div>
  );
};
