import React, { useCallback, useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCloudArrowUp } from "@fortawesome/free-solid-svg-icons";
import {
  productionPushApi,
  type ProductionPushPreview,
} from "../../../backendservice/api/productionPushApi";
import { Modal } from "../Modal";
import { Button } from "../../atoms";

export interface PushToProductionButtonProps {
  agreementId: string;
  agreementTitle: string;
  onPushed?: (message: string) => void;
  className?: string;
}

const formatBytes = (bytes: number): string => {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export const PushToProductionButton: React.FC<PushToProductionButtonProps> = ({
  agreementId,
  agreementTitle,
  onPushed,
  className = "",
}) => {
  const [configured, setConfigured] = useState(false);
  const [target, setTarget] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<ProductionPushPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    productionPushApi.getStatus().then((s) => {
      if (cancelled || !s) return;
      setConfigured(s.configured);
      setTarget(s.targetApiUrl);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const openDialog = useCallback(async () => {
    setOpen(true);
    setError(null);
    setPreview(null);
    setLoadingPreview(true);
    const p = await productionPushApi.preview(agreementId);
    setLoadingPreview(false);
    if (p) setPreview(p);
    else setError("Could not read this agreement. Nothing has been pushed.");
  }, [agreementId]);

  const confirmPush = useCallback(async () => {
    setPushing(true);
    setError(null);
    const res = await productionPushApi.push(agreementId);
    setPushing(false);
    if (res.success) {
      setOpen(false);
      onPushed?.(res.message || `Pushed "${agreementTitle}" to production`);
    } else {
      setError(res.error || "Push failed");
    }
  }, [agreementId, agreementTitle, onPushed]);

  if (!configured) return null;

  return (
    <>
      <button
        type="button"
        className={`em-push-prod__btn ${className}`.trim()}
        onClick={(e) => {
          e.stopPropagation();
          openDialog();
        }}
        title={`Send this agreement folder to production${target ? ` (${target})` : ""}`}
      >
        <FontAwesomeIcon icon={faCloudArrowUp} className="em-push-prod__btn-icon" />
        <span className="ag-act-label">Push to Production</span>
      </button>

      <Modal
        open={open}
        onClose={() => !pushing && setOpen(false)}
        title="Push to Production"
        subtitle={agreementTitle}
        size="md"
        closeOnOverlayClick={!pushing}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={pushing}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={confirmPush}
              disabled={pushing || loadingPreview || !preview}
            >
              {pushing ? "Pushing…" : "Push to Production"}
            </Button>
          </>
        }
      >
        {loadingPreview && <p>Reading agreement…</p>}

        {preview && (
          <div className="em-push-prod__summary">
            <p>
              This sends the agreement and everything in its folder to the production
              API{target ? ` (${target})` : ""}, which stores it in the production database.
            </p>
            <ul className="em-push-prod__list">
              <li>{preview.counts.versions} version PDF(s)</li>
              <li>{preview.counts.attachedFiles} attached file(s)</li>
              <li>{preview.counts.changeLogs} change log(s)</li>
              <li>{formatBytes(preview.totalPdfBytes)} of PDF data</li>
            </ul>

            <div className="em-banner em-banner--warning">
              If this agreement already exists in production it will be{" "}
              <strong>overwritten</strong> with this copy. Nothing is deleted.
            </div>

            <p className="em-push-prod__note">
              Bigin/CRM links are not copied — production keeps its own upload state.
            </p>
          </div>
        )}

        {error && (
          <div className="em-banner em-banner--danger em-push-prod__alert">{error}</div>
        )}
      </Modal>
    </>
  );
};

export default PushToProductionButton;
