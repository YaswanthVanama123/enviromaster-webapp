import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FiEdit3 } from "react-icons/fi";
import {
  faCircleCheck,
  faTriangleExclamation,
  faFileAlt,
  faExternalLinkAlt,
  faBan,
} from "@fortawesome/free-solid-svg-icons";
import { signatureApi } from "../../backendservice/api/signatureApi";
import type {
  PublicSigningContext,
  SignPayload,
} from "../../backendservice/api/signatureApi";
import { faDownload, faShieldHalved } from "@fortawesome/free-solid-svg-icons";
import { Button } from "../atoms/Button";
import { Spinner } from "../atoms/Spinner";
import { Banner, Modal } from "../molecules";
import { SignModal } from "./SignModal";
import { formatLocationSummary } from "../../utils/geolocation";

const isNarrowViewport = () =>
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  ) || window.innerWidth <= 1024;

export default function PublicSignPage() {
  const { t } = useTranslation();
  const { token = "" } = useParams<{ token: string }>();

  const [context, setContext] = useState<PublicSigningContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const [signOpen, setSignOpen] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signError, setSignError] = useState<string | null>(null);
  const [completed, setCompleted] = useState<{
    signedAt: string;
    where: string;
  } | null>(null);

  const initialReceipt = useRef<string | null>(
    new URLSearchParams(window.location.search).get("receipt"),
  );
  const [receipt, setReceipt] = useState<string | null>(initialReceipt.current);
  const [showingSigned, setShowingSigned] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [declining, setDeclining] = useState(false);
  const [declined, setDeclined] = useState(false);

  const pdfUrlRef = useRef<string | null>(null);

  const showSignedCopy = useCallback(async (receiptToken: string) => {
    const blob = await signatureApi.downloadReceiptSignedPdf(receiptToken);
    if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
    const objectUrl = URL.createObjectURL(blob);
    pdfUrlRef.current = objectUrl;
    setPdfUrl(objectUrl);
    setPdfError(null);
    setShowingSigned(true);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    const openedReceipt = initialReceipt.current;
    if (openedReceipt) {
      try {
        const data = await signatureApi.getReceiptContext(openedReceipt);
        setContext({
          success: data.success,
          agreementTitle: data.agreementTitle,
          documentLabel: data.documentLabel,
          requestStatus: data.requestStatus,
          totalSigners: data.totalSigners,
          signedCount: data.signedCount,
          signer: {
            id: "",
            name: data.signer.name,
            email: "",
            title: "",
            role: data.signer.role,
            placement: data.signer.placement,
            status: "signed",
            signedAt: data.signer.signedAt,
          },
        });
        setCompleted({ signedAt: data.signer.signedAt || "", where: "" });
        if (data.signedPdfAvailable) {
          await showSignedCopy(openedReceipt);
        } else {
          setPdfError(t("signatures.public.signedPdfPending"));
        }
        setLoading(false);
        return;
      } catch {
        initialReceipt.current = null;
        setReceipt(null);
      }
    }

    try {
      const data = await signatureApi.getPublicContext(token);
      setContext(data);
      if (data.signer.status === "signed" && data.signer.signedAt) {
        setCompleted({ signedAt: data.signer.signedAt, where: "" });
      }
      if (data.signer.status === "declined") setDeclined(true);
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : t("signatures.public.invalidLink"),
      );
    } finally {
      setLoading(false);
    }
  }, [token, showSignedCopy, t]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!context || declined || showingSigned || receipt) return;

    let cancelled = false;
    signatureApi
      .downloadPublicPdf(token)
      .then((blob) => {
        if (cancelled) return;
        if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
        const objectUrl = URL.createObjectURL(blob);
        pdfUrlRef.current = objectUrl;
        setPdfUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setPdfError(t("signatures.public.pdfFailed"));
      });

    return () => {
      cancelled = true;
    };
  }, [context, declined, showingSigned, receipt, token, t]);

  useEffect(
    () => () => {
      if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
    },
    [],
  );

  const handleSign = async (payload: SignPayload) => {
    setSigning(true);
    setSignError(null);
    try {
      const result = await signatureApi.signPublic(token, payload);
      setSignOpen(false);
      setCompleted({
        signedAt: result.signedAt,
        where: formatLocationSummary(result.location),
      });

      if (result.receiptToken) {
        setReceipt(result.receiptToken);
        const url = new URL(window.location.href);
        url.searchParams.set("receipt", result.receiptToken);
        window.history.replaceState(null, "", url.toString());

        if (result.signedPdfAvailable) {
          try {
            await showSignedCopy(result.receiptToken);
          } catch {
            setPdfError(t("signatures.public.signedPdfPending"));
          }
        }
      }
    } catch (error) {
      setSignError(
        error instanceof Error
          ? error.message
          : t("signatures.public.signFailed"),
      );
    } finally {
      setSigning(false);
    }
  };

  const handleDownload = async () => {
    if (!receipt) return;
    setDownloading(true);
    try {
      const blob = await signatureApi.downloadReceiptSignedPdf(receipt);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${(context?.agreementTitle || "agreement").replace(
        /[^\w-]+/g,
        "_",
      )}_signed.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch {
      setPdfError(t("signatures.public.signedPdfPending"));
    } finally {
      setDownloading(false);
    }
  };

  const handleDecline = async () => {
    setDeclining(true);
    try {
      await signatureApi.declinePublic(token, declineReason);
      setDeclineOpen(false);
      setDeclined(true);
    } catch (error) {
      setSignError(
        error instanceof Error
          ? error.message
          : t("signatures.public.declineFailed"),
      );
    } finally {
      setDeclining(false);
    }
  };

  if (loading) {
    return (
      <div className="em-sig-public em-sig-public--centered">
        <Spinner size="lg" />
        <p>{t("signatures.public.loading")}</p>
      </div>
    );
  }

  if (loadError || !context) {
    return (
      <div className="em-sig-public em-sig-public--centered">
        <FontAwesomeIcon
          icon={faTriangleExclamation}
          className="em-sig-public__error-icon"
        />
        <h1>{t("signatures.public.invalidLinkTitle")}</h1>
        <p>{loadError}</p>
      </div>
    );
  }

  if (declined) {
    return (
      <div className="em-sig-public em-sig-public--centered">
        <FontAwesomeIcon icon={faBan} className="em-sig-public__error-icon" />
        <h1>{t("signatures.public.declinedTitle")}</h1>
        <p>{t("signatures.public.declinedBody")}</p>
      </div>
    );
  }

  return (
    <div className="em-sig-public">
      <header className="em-sig-public__header">
        <div>
          <h1 className="em-sig-public__title">{context.agreementTitle}</h1>
          <p className="em-sig-public__subtitle">
            {t("signatures.public.subtitle", {
              document: context.documentLabel,
              name: context.signer.name,
            })}
          </p>
        </div>
        {!completed && (
          <div className="em-sig-public__actions">
            <Button
              variant="primary"
              leftIcon={<FiEdit3 />}
              onClick={() => {
                setSignError(null);
                setSignOpen(true);
              }}
            >
              {t("signatures.public.sign")}
            </Button>
            <Button variant="ghost" onClick={() => setDeclineOpen(true)}>
              {t("signatures.public.decline")}
            </Button>
          </div>
        )}
      </header>

      {completed && (
        <Banner tone="success" title={t("signatures.public.doneTitle")}>
          <div className="em-sig-public__done">
            <span>
              <FontAwesomeIcon icon={faCircleCheck} />{" "}
              {completed.signedAt
                ? t("signatures.public.doneBody", {
                    time: new Date(completed.signedAt).toLocaleString(),
                  })
                : t("signatures.public.doneTitle")}
              {completed.where
                ? ` ${t("signatures.public.doneLocation", { place: completed.where })}`
                : ""}
            </span>
            {showingSigned && (
              <span className="em-sig-public__done-note">
                <FontAwesomeIcon icon={faShieldHalved} />{" "}
                {t("signatures.public.signedCopyShown")}
              </span>
            )}
            {receipt && (
              <Button
                variant="secondary"
                size="sm"
                loading={downloading}
                leftIcon={<FontAwesomeIcon icon={faDownload} />}
                onClick={handleDownload}
              >
                {t("signatures.public.downloadSigned")}
              </Button>
            )}
          </div>
        </Banner>
      )}

      <div className="em-sig-public__viewer">
        {pdfError ? (
          <div className="em-sig-public__viewer-state">
            <FontAwesomeIcon icon={faTriangleExclamation} size="2x" />
            <p>{pdfError}</p>
          </div>
        ) : !pdfUrl ? (
          <div className="em-sig-public__viewer-state">
            <Spinner size="lg" />
            <p>{t("signatures.public.loadingPdf")}</p>
          </div>
        ) : isNarrowViewport() ? (
          <div className="em-sig-public__viewer-state">
            <FontAwesomeIcon icon={faFileAlt} size="3x" />
            <h3>{t("signatures.public.mobileTitle")}</h3>
            <p>{t("signatures.public.mobileHint")}</p>
            <Button
              variant="secondary"
              leftIcon={<FontAwesomeIcon icon={faExternalLinkAlt} />}
              onClick={() => window.open(pdfUrl, "_blank")}
            >
              {t("signatures.public.openPdf")}
            </Button>
          </div>
        ) : (
          <iframe
            src={`${pdfUrl}#toolbar=1&navpanes=0`}
            className="em-sig-public__iframe"
            title={context.documentLabel}
          />
        )}
      </div>

      <SignModal
        open={signOpen}
        signerName={context.signer.name}
        signerPlacement={context.signer.placement}
        documentLabel={context.documentLabel}
        submitting={signing}
        error={signError}
        onClose={() => setSignOpen(false)}
        onSubmit={handleSign}
      />

      <Modal
        open={declineOpen}
        onClose={() => setDeclineOpen(false)}
        size="sm"
        title={t("signatures.public.declineTitle")}
        subtitle={t("signatures.public.declineSubtitle")}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setDeclineOpen(false)}
              disabled={declining}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="danger"
              onClick={handleDecline}
              loading={declining}
            >
              {t("signatures.public.declineConfirm")}
            </Button>
          </>
        }
      >
        <textarea
          className="em-input em-input--md em-sig-public__reason"
          rows={4}
          value={declineReason}
          onChange={(event) => setDeclineReason(event.target.value)}
          placeholder={t("signatures.public.declinePlaceholder")}
        />
      </Modal>
    </div>
  );
}
