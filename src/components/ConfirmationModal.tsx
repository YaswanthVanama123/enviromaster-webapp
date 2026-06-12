import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import "./ConfirmationModal.css";

type ConfirmationModalProps = {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  const { t } = useTranslation();
  const resolvedTitle = title ?? t("confirm.defaultTitle");
  const resolvedConfirm = confirmText ?? t("confirm.defaultConfirm");
  const resolvedCancel = cancelText ?? t("confirm.defaultCancel");
  useEffect(() => {
    if (isOpen) {
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === "Escape") onCancel();
      };
      window.addEventListener("keydown", handleEsc);
      return () => window.removeEventListener("keydown", handleEsc);
    }
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">{resolvedTitle}</h2>
        <p className="modal-message">{message}</p>
        <div className="modal-actions">
          <button
            type="button"
            className="modal-btn modal-btn--cancel"
            onClick={onCancel}
          >
            {resolvedCancel}
          </button>
          <button
            type="button"
            className="modal-btn modal-btn--confirm"
            onClick={onConfirm}
          >
            {resolvedConfirm}
          </button>
        </div>
      </div>
    </div>
  );
}
