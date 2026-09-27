import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faLocationDot,
  faLocationCrosshairs,
  faTriangleExclamation,
  faCircleCheck,
} from "@fortawesome/free-solid-svg-icons";
import { Button } from "../atoms/Button";
import { Input } from "../atoms/Input";
import { Spinner } from "../atoms/Spinner";
import { Banner, Checkbox, FormField, Modal } from "../molecules";
import {
  SignaturePad,
  createSignatureDraft,
  isSignatureDraftComplete,
  signatureDraftImage,
  type SignatureDraft,
} from "../molecules/SignaturePad";
import { captureLocation, type GeolocationOutcome } from "../../utils/geolocation";
import type { SignPayload } from "../../backendservice/api/signatureApi";

export interface SignModalProps {
  open: boolean;
  signerName: string;
  signerPlacement?: string;
  documentLabel?: string;
  submitting?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (payload: SignPayload) => void;
}

export const SignModal: React.FC<SignModalProps> = ({
  open,
  signerName,
  signerPlacement,
  documentLabel,
  submitting = false,
  error = null,
  onClose,
  onSubmit,
}) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<SignatureDraft>(() => createSignatureDraft(signerName));
  const [printedName, setPrintedName] = useState(signerName);
  const [consent, setConsent] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationOutcome, setLocationOutcome] = useState<GeolocationOutcome | null>(null);

  const requestLocation = useCallback(async () => {
    setLocating(true);
    const outcome = await captureLocation();
    setLocationOutcome(outcome);
    setLocating(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    setDraft(createSignatureDraft(signerName));
    setPrintedName(signerName);
    setConsent(false);
    setLocationOutcome(null);
    requestLocation();
  }, [open, signerName, requestLocation]);

  const canSign =
    isSignatureDraftComplete(draft) && printedName.trim().length > 0 && consent && !submitting;

  const handleSubmit = () => {
    if (!canSign) return;
    onSubmit({
      method: draft.method === "type" ? "type" : "draw",
      printedName: printedName.trim(),
      signatureImage: signatureDraftImage(draft),
      typedName: draft.method === "type" ? draft.typedName.trim() : undefined,
      typedFontFamily: draft.method === "type" ? draft.typedFontFamily : undefined,
      consentAccepted: true,
      location:
        locationOutcome?.status === "captured" ? locationOutcome.location : null,
    });
  };

  const renderLocationStatus = () => {
    if (locating) {
      return (
        <span className="em-sig-loc__text">
          <Spinner size="sm" className="em-spinner--inline" />
          {t("signatures.sign.locating")}
        </span>
      );
    }

    if (locationOutcome?.status === "captured") {
      return (
        <span className="em-sig-loc__text em-sig-loc__text--ok">
          <FontAwesomeIcon icon={faCircleCheck} />
          {t("signatures.sign.locationCaptured", {
            lat: locationOutcome.location.latitude.toFixed(5),
            lng: locationOutcome.location.longitude.toFixed(5),
          })}
        </span>
      );
    }

    const messageKey =
      locationOutcome?.status === "denied"
        ? "signatures.sign.locationDenied"
        : locationOutcome?.status === "timeout"
          ? "signatures.sign.locationTimeout"
          : "signatures.sign.locationUnavailable";

    return (
      <span className="em-sig-loc__text em-sig-loc__text--warn">
        <FontAwesomeIcon icon={faTriangleExclamation} />
        {t(messageKey)}
      </span>
    );
  };

  return (
    <Modal
      open={open}
      onClose={submitting ? () => undefined : onClose}
      size="md"
      closeOnOverlayClick={!submitting}
      title={t("signatures.sign.title")}
      subtitle={
        signerPlacement
          ? t("signatures.sign.subtitleWithPlacement", {
              name: signerName,
              placement: signerPlacement,
            })
          : t("signatures.sign.subtitle", { name: signerName })
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            {t("common.cancel")}
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={submitting} disabled={!canSign}>
            {t("signatures.sign.submit")}
          </Button>
        </>
      }
    >
      {documentLabel && (
        <p className="em-sig-modal__doc">
          {t("signatures.sign.documentLine", { document: documentLabel })}
        </p>
      )}

      {error && <Banner tone="danger">{error}</Banner>}

      <FormField
        label={t("signatures.sign.printedName")}
        htmlFor="signature-printed-name"
        hint={t("signatures.sign.printedNameHint")}
        required
      >
        <Input
          id="signature-printed-name"
          value={printedName}
          onChange={(event) => setPrintedName(event.target.value)}
          placeholder={t("signatures.sign.printedNamePlaceholder")}
          disabled={submitting}
        />
      </FormField>

      <SignaturePad value={draft} onChange={setDraft} disabled={submitting} />

      <div className="em-sig-loc">
        <span className="em-sig-loc__icon">
          <FontAwesomeIcon icon={faLocationDot} />
        </span>
        {renderLocationStatus()}
        {!locating && locationOutcome?.status !== "captured" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={requestLocation}
            disabled={submitting}
            leftIcon={<FontAwesomeIcon icon={faLocationCrosshairs} />}
          >
            {t("signatures.sign.retryLocation")}
          </Button>
        )}
      </div>

      <div className="em-sig-consent">
        <Checkbox
          name="signature-consent"
          className="em-sig-consent__box"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
          disabled={submitting}
          label={t("signatures.sign.consent")}
        />
      </div>
    </Modal>
  );
};
