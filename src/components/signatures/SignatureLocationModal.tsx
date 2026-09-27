import React from "react";
import { useTranslation } from "react-i18next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMapLocationDot } from "@fortawesome/free-solid-svg-icons";
import { Button } from "../atoms/Button";
import { Modal } from "../molecules";
import type { Signer } from "../../backendservice/api/signatureApi";

export interface SignatureLocationModalProps {
  signer: Signer | null;
  onClose: () => void;
}

export const SignatureLocationModal: React.FC<SignatureLocationModalProps> = ({
  signer,
  onClose,
}) => {
  const { t } = useTranslation();
  const location = signer?.location ?? null;

  const rows: { label: string; value: string }[] = [];

  if (signer?.signedAt) {
    rows.push({
      label: t("signatures.location.signedAt"),
      value: new Date(signer.signedAt).toLocaleString(),
    });
  }
  if (location?.address) {
    rows.push({ label: t("signatures.location.address"), value: location.address });
  }
  if (location?.city) {
    rows.push({ label: t("signatures.location.city"), value: location.city });
  }
  if (location?.region) {
    rows.push({ label: t("signatures.location.region"), value: location.region });
  }
  if (location?.postalCode) {
    rows.push({ label: t("signatures.location.postalCode"), value: location.postalCode });
  }
  if (location?.country) {
    rows.push({ label: t("signatures.location.country"), value: location.country });
  }
  if (location?.latitude !== null && location?.longitude !== null && location) {
    rows.push({
      label: t("signatures.location.coordinates"),
      value: `${location.latitude!.toFixed(6)}, ${location.longitude!.toFixed(6)}`,
    });
  }
  if (location?.accuracyMeters != null) {
    rows.push({
      label: t("signatures.location.accuracy"),
      value: t("signatures.location.accuracyValue", { meters: location.accuracyMeters }),
    });
  }
  if (signer?.signedVia) {
    rows.push({
      label: t("signatures.location.signedVia"),
      value: t(`signatures.via.${signer.signedVia}`),
    });
  }

  return (
    <Modal
      open={!!signer}
      onClose={onClose}
      size="sm"
      title={t("signatures.location.title")}
      subtitle={signer ? signer.name : undefined}
      footer={
        <>
          {location?.mapUrl && (
            <Button
              variant="secondary"
              leftIcon={<FontAwesomeIcon icon={faMapLocationDot} />}
              onClick={() => window.open(location.mapUrl!, "_blank", "noopener,noreferrer")}
            >
              {t("signatures.location.openMap")}
            </Button>
          )}
          <Button variant="primary" onClick={onClose}>
            {t("common.close")}
          </Button>
        </>
      }
    >
      {rows.length === 0 ? (
        <p className="em-sig-loc__empty">{t("signatures.location.none")}</p>
      ) : (
        <dl className="em-sig-locdl">
          {rows.map((row) => (
            <div key={row.label} className="em-sig-locdl__row">
              <dt className="em-sig-locdl__label">{row.label}</dt>
              <dd className="em-sig-locdl__value">{row.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </Modal>
  );
};
