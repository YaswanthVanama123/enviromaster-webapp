import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FiEdit3 } from "react-icons/fi";
import {
  faDownload,
  faFileAlt,
  faExternalLinkAlt,
  faRotate,
  faTriangleExclamation,
  faFileShield,
  faCertificate,
} from "@fortawesome/free-solid-svg-icons";
import { pdfApi, signatureApi } from "../backendservice/api";
import type { SignatureRoomResponse } from "../backendservice/api/signatureApi";
import { Button } from "./atoms/Button";
import { Spinner } from "./atoms/Spinner";
import { Banner, Modal } from "./molecules";
import { Toast } from "./admin/Toast";
import type { ToastType } from "./admin/Toast";
import { SignerStatusPanel } from "./signatures/SignerStatusPanel";
import { SignatureActionModals } from "./signatures/SignatureActionModals";
import { useSignatureActions } from "./signatures/useSignatureActions";

const isNarrowViewport = () =>
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  ) || window.innerWidth <= 1024;

export default function SignatureRoom() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { agreementId = "" } = useParams<{ agreementId: string }>();

  const returnPath =
    (location.state as { returnPath?: string } | null)?.returnPath ||
    "/saved-pdfs";

  const [room, setRoom] = useState<SignatureRoomResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(true);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const [signerPickerOpen, setSignerPickerOpen] = useState(false);
  const [showSignedCopy, setShowSignedCopy] = useState(true);
  const [toast, setToast] = useState<{
    message: string;
    type: ToastType;
  } | null>(null);

  const pdfUrlRef = useRef<string | null>(null);

  const showToast = useCallback(
    (message: string, type: ToastType) => setToast({ message, type }),
    [],
  );

  const actions = useSignatureActions({
    onUpdated: setRoom,
    onToast: showToast,
  });

  const documentId = room?.document.id ?? null;
  const documentKind = room?.document.kind ?? null;
  const signedAvailable = room?.request.signedPdf?.available ?? false;
  const viewingSigned = signedAvailable && showSignedCopy;

  const loadRoom = useCallback(async () => {
    if (!agreementId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const data = await signatureApi.getRoom(agreementId);
      setRoom(data);
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : t("signatures.room.loadFailed"),
      );
    } finally {
      setLoading(false);
    }
  }, [agreementId, t]);

  useEffect(() => {
    loadRoom();
  }, [loadRoom]);

  useEffect(() => {
    if (!documentId || !documentKind) return;

    let cancelled = false;
    setPdfLoading(true);
    setPdfError(null);

    const fetchPdf = async () => {
      try {
        const blob = viewingSigned
          ? await signatureApi.downloadSignedPdf(agreementId)
          : documentKind === "version"
            ? await pdfApi.downloadVersionPdf(documentId, false)
            : await pdfApi.downloadPdf(documentId);
        if (cancelled) return;
        if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
        const objectUrl = URL.createObjectURL(blob);
        pdfUrlRef.current = objectUrl;
        setPdfUrl(objectUrl);
      } catch (error) {
        if (!cancelled) {
          setPdfError(
            error instanceof Error
              ? error.message
              : t("signatures.room.pdfFailed"),
          );
        }
      } finally {
        if (!cancelled) setPdfLoading(false);
      }
    };

    fetchPdf();
    return () => {
      cancelled = true;
    };
  }, [documentId, documentKind, viewingSigned, agreementId, t]);

  useEffect(
    () => () => {
      if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
    },
    [],
  );

  const pendingSigners = useMemo(
    () =>
      (room?.request.signers || []).filter(
        (signer) => signer.status !== "signed",
      ),
    [room],
  );

  const handleDownload = async () => {
    if (!room) return;
    try {
      setDownloading(true);
      const blob = viewingSigned
        ? await signatureApi.downloadSignedPdf(room.request.agreementId)
        : room.document.kind === "version"
          ? await pdfApi.downloadVersionPdf(room.document.id, false)
          : await pdfApi.downloadPdf(room.document.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      const baseName = (room.document.fileName || "agreement.pdf").replace(
        /\.pdf$/i,
        "",
      );
      anchor.download = viewingSigned
        ? `${baseName}_signed.pdf`
        : `${baseName}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch {
      showToast(t("signatures.room.downloadFailed"), "error");
    } finally {
      setDownloading(false);
    }
  };

  const openSignFlow = () => {
    if (!room) return;
    if (pendingSigners.length === 0) {
      showToast(t("signatures.room.allSigned"), "success");
      return;
    }
    if (pendingSigners.length === 1) {
      actions.startSign(
        room.request.agreementId,
        pendingSigners[0],
        room.document.label,
      );
      return;
    }
    setSignerPickerOpen(true);
  };

  const handleSyncVersion = async () => {
    if (!room) return;
    try {
      const next = await signatureApi.syncToLatestVersion(
        room.request.agreementId,
      );
      setRoom(next);
      showToast(t("signatures.room.versionSynced"), "success");
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : t("signatures.room.versionSyncFailed"),
        "error",
      );
    }
  };

  if (loading) {
    return (
      <div className="em-sig-room em-sig-room--centered">
        <Spinner size="lg" />
        <p>{t("signatures.room.loading")}</p>
      </div>
    );
  }

  if (loadError || !room) {
    return (
      <div className="em-sig-room em-sig-room--centered">
        <FontAwesomeIcon
          icon={faTriangleExclamation}
          className="em-sig-room__error-icon"
        />
        <h2>{t("signatures.room.loadFailed")}</h2>
        <p>{loadError}</p>
        <div className="em-sig-room__error-actions">
          <Button variant="secondary" onClick={() => navigate(returnPath)}>
            {t("common.back")}
          </Button>
          <Button variant="primary" onClick={loadRoom}>
            {t("common.refresh")}
          </Button>
        </div>
      </div>
    );
  }

  const { request, document: doc } = room;

  return (
    <div className="em-sig-room">
      <div className="em-sig-room__toolbar">
        <div className="em-sig-room__toolbar-left">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate(returnPath)}
          >
            ← {t("common.back")}
          </Button>
          <div className="em-sig-room__heading">
            <h2 className="em-sig-room__title">{request.agreementTitle}</h2>
            <span className="em-sig-room__subtitle">
              {t("signatures.room.documentLine", {
                document: doc.label,
                signed: request.signedCount,
                total: request.totalSigners,
              })}
            </span>
          </div>
        </div>

        <div className="em-sig-room__toolbar-right">
          <Button
            variant="primary"
            leftIcon={<FiEdit3 />}
            onClick={openSignFlow}
            disabled={pendingSigners.length === 0}
          >
            {t("signatures.room.sign")}
          </Button>

          {signedAvailable && (
            <div className="em-sig-room__copy-toggle" role="group">
              <button
                type="button"
                className={`em-sig-room__copy-btn ${!showSignedCopy ? "em-sig-room__copy-btn--active" : ""}`}
                onClick={() => setShowSignedCopy(false)}
              >
                {t("signatures.room.copyOriginal")}
              </button>
              <button
                type="button"
                className={`em-sig-room__copy-btn ${showSignedCopy ? "em-sig-room__copy-btn--active" : ""}`}
                onClick={() => setShowSignedCopy(true)}
              >
                <FontAwesomeIcon icon={faFileShield} />{" "}
                {t("signatures.room.copySigned")}
              </button>
            </div>
          )}

          <Button
            variant="ghost"
            onClick={handleDownload}
            loading={downloading}
            leftIcon={<FontAwesomeIcon icon={faDownload} />}
          >
            {viewingSigned
              ? t("signatures.room.downloadSigned")
              : t("common.download")}
          </Button>
        </div>
      </div>

      {signedAvailable && viewingSigned && (
        <div className="em-sig-room__seal">
          <FontAwesomeIcon
            icon={faCertificate}
            className="em-sig-room__seal-icon"
          />
          <div className="em-sig-room__seal-text">
            <strong>{t("signatures.room.sealTitle")}</strong>
            <span>
              {t("signatures.room.sealBody", {
                signed: request.signedCount,
                total: request.totalSigners,
                envelope: request.envelopeId,
              })}
            </span>
          </div>
          <code
            className="em-sig-room__seal-hash"
            title={request.signedPdf.sha256 ?? ""}
          >
            SHA-256 {request.signedPdf.sha256?.slice(0, 16)}…
          </code>
        </div>
      )}

      {room.hasNewerVersion && (
        <Banner tone="warning" title={t("signatures.room.newerVersionTitle")}>
          <div className="em-sig-room__banner-body">
            <span>
              {t("signatures.room.newerVersionBody", {
                pinned: doc.label,
                latest: room.latestVersion?.label ?? "",
              })}
            </span>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<FontAwesomeIcon icon={faRotate} />}
              onClick={handleSyncVersion}
            >
              {t("signatures.room.useLatest")}
            </Button>
          </div>
        </Banner>
      )}

      <div className="em-sig-room__body">
        <div className="em-sig-room__viewer">
          {pdfLoading ? (
            <div className="em-sig-room__viewer-state">
              <Spinner size="lg" />
              <p>{t("signatures.room.loadingPdf")}</p>
            </div>
          ) : pdfError || !pdfUrl ? (
            <div className="em-sig-room__viewer-state">
              <FontAwesomeIcon icon={faTriangleExclamation} size="2x" />
              <p>{pdfError || t("signatures.room.pdfFailed")}</p>
            </div>
          ) : isNarrowViewport() ? (
            <div className="em-sig-room__viewer-state">
              <FontAwesomeIcon icon={faFileAlt} size="3x" />
              <h3>{t("signatures.room.mobileTitle")}</h3>
              <p>{t("signatures.room.mobileHint")}</p>
              <Button
                variant="primary"
                leftIcon={<FontAwesomeIcon icon={faExternalLinkAlt} />}
                onClick={() => window.open(pdfUrl, "_blank")}
              >
                {t("signatures.room.openPdf")}
              </Button>
            </div>
          ) : (
            <iframe
              src={`${pdfUrl}#toolbar=1&navpanes=0`}
              className="em-sig-room__iframe"
              title={doc.label}
            />
          )}
        </div>

        <aside className="em-sig-room__aside">
          <SignerStatusPanel
            agreementId={request.agreementId}
            request={request}
            busySignerId={actions.busySignerId}
            canModify
            onSign={(signer) =>
              actions.startSign(request.agreementId, signer, doc.label)
            }
            onSendInvite={(signer) =>
              actions.sendInvite(request.agreementId, signer)
            }
            onCopyLink={actions.copyLink}
            onCreateLink={(signer) =>
              actions.createLink(request.agreementId, signer)
            }
            onResetSigner={(signer) =>
              actions.resetSigner(request.agreementId, signer)
            }
            onRevokeLink={(signer) =>
              actions.revokeLink(request.agreementId, signer)
            }
            onEdit={(signer) => actions.startEdit(request.agreementId, signer)}
            onRemove={(signer) =>
              actions.askRemove(request.agreementId, signer)
            }
            onShowLocation={actions.showLocation}
            onAddSigner={() => actions.startAdd(request.agreementId)}
          />
        </aside>
      </div>

      <Modal
        open={signerPickerOpen}
        onClose={() => setSignerPickerOpen(false)}
        size="sm"
        title={t("signatures.picker.title")}
        subtitle={t("signatures.picker.subtitle")}
      >
        <ul className="em-sig-picker">
          {pendingSigners.map((signer) => (
            <li key={signer.id}>
              <button
                type="button"
                className="em-sig-picker__item"
                onClick={() => {
                  setSignerPickerOpen(false);
                  actions.startSign(request.agreementId, signer, doc.label);
                }}
              >
                <span className="em-sig-picker__name">{signer.name}</span>
                <span className="em-sig-picker__placement">
                  {signer.placement || t(`signatures.roles.${signer.role}`)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Modal>

      <SignatureActionModals actions={actions} />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
