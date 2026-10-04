import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { signatureApi } from "../../backendservice/api/signatureApi";

export interface SignatureImageProps {
  agreementId: string;
  signerId: string;
  className?: string;
  version?: string | null;
  fallback?: React.ReactNode;
}

export const SignatureImage: React.FC<SignatureImageProps> = ({
  agreementId,
  signerId,
  className = "",
  version,
  fallback,
}) => {
  const { t } = useTranslation();
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    setFailed(false);
    setUrl(null);

    signatureApi
      .downloadSignerImage(agreementId, signerId)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [agreementId, signerId, version]);

  if (failed) {
    if (fallback !== undefined) return <>{fallback}</>;
    return <span className="em-sig-image__fallback">{t("signatures.rows.imageUnavailable")}</span>;
  }

  if (!url) {
    return <span className="em-sig-image__fallback">{t("common.loading")}</span>;
  }

  return <img src={url} alt={t("signatures.rows.signatureAlt")} className={`em-sig-image ${className}`} />;
};
