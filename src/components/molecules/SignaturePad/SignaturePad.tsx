import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUpload, faTrashCan } from "@fortawesome/free-solid-svg-icons";
import { Button } from "../../atoms/Button";
import { Input } from "../../atoms/Input";
import {
  trimSignature,
  prepareUploadedSignature,
  renderTypedSignature,
} from "../../../utils/signatureImage";

export type SignatureDraftMethod = "draw" | "type" | "upload";

export interface SignatureDraft {
  method: SignatureDraftMethod;
  dataUrl: string | null;
  uploadDataUrl: string | null;
  typedName: string;
  typedFontFamily: string;
}

export const SIGNATURE_FONTS: { id: string; family: string }[] = [
  { id: "script", family: '"Brush Script MT", "Segoe Script", "Bradley Hand", cursive' },
  { id: "roundhand", family: '"Snell Roundhand", "Apple Chancery", "Palatino Linotype", cursive' },
  { id: "handwriting", family: '"Lucida Handwriting", "Segoe Print", "Comic Sans MS", cursive' },
];

export function createSignatureDraft(defaultName = ""): SignatureDraft {
  return {
    method: "draw",
    dataUrl: null,
    uploadDataUrl: null,
    typedName: defaultName,
    typedFontFamily: SIGNATURE_FONTS[0].family,
  };
}

export function isSignatureDraftComplete(draft: SignatureDraft): boolean {
  if (draft.method === "draw") return !!draft.dataUrl;
  if (draft.method === "upload") return !!draft.uploadDataUrl;
  return draft.typedName.trim().length > 0;
}

export function signatureDraftImage(draft: SignatureDraft): string | undefined {
  if (draft.method === "draw") return draft.dataUrl ?? undefined;
  if (draft.method === "upload") return draft.uploadDataUrl ?? undefined;
  return renderTypedSignature(draft.typedName, draft.typedFontFamily) ?? undefined;
}

export interface SignaturePadProps {
  value: SignatureDraft;
  onChange: (draft: SignatureDraft) => void;
  disabled?: boolean;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const drawingRef = useRef(false);
  const [hasInk, setHasInk] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const prepareContext = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const ratio = window.devicePixelRatio || 1;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111827";
    return ctx;
  }, []);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const ratio = window.devicePixelRatio || 1;
    const nextWidth = Math.round(rect.width * ratio);
    const nextHeight = Math.round(rect.height * ratio);
    if (canvas.width === nextWidth && canvas.height === nextHeight) return;
    canvas.width = nextWidth;
    canvas.height = nextHeight;
    prepareContext();
    setHasInk(false);
  }, [prepareContext]);

  useEffect(() => {
    if (value.method !== "draw") return;
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [value.method, resizeCanvas]);

  const pointFromEvent = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    const ctx = prepareContext();
    if (!ctx) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    const { x, y } = pointFromEvent(event);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 0.01, y + 0.01);
    ctx.stroke();
    setHasInk(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || disabled) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = pointFromEvent(event);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const commitDrawing = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onChange({ ...value, method: "draw", dataUrl: trimSignature(canvas) });
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    commitDrawing();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    prepareContext();
    setHasInk(false);
    onChange({ ...value, dataUrl: null });
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const dataUrl = await prepareUploadedSignature(file);
      onChange({ ...value, method: "upload", uploadDataUrl: dataUrl });
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : t("signatures.pad.uploadFailed")
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const selectMethod = (method: SignatureDraftMethod) => {
    if (method === value.method) return;
    onChange({ ...value, method });
  };

  const tabs: { key: SignatureDraftMethod; label: string }[] = [
    { key: "draw", label: t("signatures.pad.drawTab") },
    { key: "type", label: t("signatures.pad.typeTab") },
    { key: "upload", label: t("signatures.pad.uploadTab") },
  ];

  return (
    <div className="em-sigpad">
      <div className="em-sigpad__tabs" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={value.method === tab.key}
            className={`em-sigpad__tab ${
              value.method === tab.key ? "em-sigpad__tab--active" : ""
            }`}
            onClick={() => selectMethod(tab.key)}
            disabled={disabled}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {value.method === "draw" && (
        <div className="em-sigpad__panel">
          <div className="em-sigpad__canvas-wrap">
            <canvas
              ref={canvasRef}
              className="em-sigpad__canvas"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              onPointerCancel={handlePointerUp}
            />
            {!hasInk && (
              <span className="em-sigpad__placeholder">{t("signatures.pad.drawHint")}</span>
            )}
            <span className="em-sigpad__baseline" aria-hidden="true" />
          </div>
          <div className="em-sigpad__actions">
            <Button variant="ghost" size="sm" onClick={clearCanvas} disabled={disabled || !hasInk}>
              {t("signatures.pad.clear")}
            </Button>
          </div>
        </div>
      )}

      {value.method === "type" && (
        <div className="em-sigpad__panel">
          <Input
            value={value.typedName}
            onChange={(event) => onChange({ ...value, typedName: event.target.value })}
            placeholder={t("signatures.pad.typePlaceholder")}
            disabled={disabled}
            autoFocus
          />
          <div className="em-sigpad__fonts">
            {SIGNATURE_FONTS.map((font) => (
              <button
                key={font.id}
                type="button"
                className={`em-sigpad__font ${
                  value.typedFontFamily === font.family ? "em-sigpad__font--active" : ""
                }`}
                style={{ fontFamily: font.family }}
                onClick={() => onChange({ ...value, typedFontFamily: font.family })}
                disabled={disabled}
              >
                {value.typedName.trim() || t("signatures.pad.fontSample")}
              </button>
            ))}
          </div>
          <div className="em-sigpad__preview" style={{ fontFamily: value.typedFontFamily }}>
            {value.typedName.trim() || t("signatures.pad.typePlaceholder")}
          </div>
        </div>
      )}

      {value.method === "upload" && (
        <div className="em-sigpad__panel">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="em-sigpad__file"
            id="signature-upload-input"
            disabled={disabled || uploading}
            onChange={(event) => handleFile(event.target.files?.[0])}
          />

          {value.uploadDataUrl ? (
            <div className="em-sigpad__canvas-wrap em-sigpad__canvas-wrap--preview">
              <img
                src={value.uploadDataUrl}
                alt={t("signatures.pad.uploadPreviewAlt")}
                className="em-sigpad__upload-preview"
              />
              <span className="em-sigpad__baseline" aria-hidden="true" />
            </div>
          ) : (
            <label htmlFor="signature-upload-input" className="em-sigpad__dropzone">
              <FontAwesomeIcon icon={faUpload} className="em-sigpad__dropzone-icon" />
              <span className="em-sigpad__dropzone-title">
                {uploading ? t("signatures.pad.uploadWorking") : t("signatures.pad.uploadCta")}
              </span>
              <span className="em-sigpad__dropzone-hint">{t("signatures.pad.uploadHint")}</span>
            </label>
          )}

          {uploadError && <p className="em-sigpad__error">{uploadError}</p>}

          <div className="em-sigpad__actions">
            {value.uploadDataUrl && (
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<FontAwesomeIcon icon={faTrashCan} />}
                onClick={() => onChange({ ...value, uploadDataUrl: null })}
                disabled={disabled || uploading}
              >
                {t("signatures.pad.uploadReplace")}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
