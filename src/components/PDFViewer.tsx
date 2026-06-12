import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExclamationTriangle, faLightbulb, faFileAlt, faPencilAlt, faDownload, faSpinner, faExternalLinkAlt } from "@fortawesome/free-solid-svg-icons";
import { FaTint, FaMagic } from "react-icons/fa";
import { Toast } from "./admin/Toast";
import type { ToastType } from "./admin/Toast";
import { pdfApi } from "../backendservice/api";
import { manualUploadApi } from "../backendservice/api/manualUploadApi";
import { versionApi } from "../backendservice/api/versionApi";
import "./PDFViewer.css";

type DocumentType = 'agreement' | 'manual-upload' | 'attached-file' | 'version' | 'version-log';

type LocationState = {
  documentId?: string;
  fileName?: string;
  documentType?: DocumentType;
  watermark?: boolean;
  fromEdit?: boolean;
  originalReturnPath?: string;
  originalReturnState?: any;
  includeDeleted?: boolean;
};

const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

const isMobileOrMediumDevice = () => {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isMediumScreen = window.innerWidth <= 1024;
  return isMobile || isMediumScreen;
};

export default function PDFViewer() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const {
    documentId,
    fileName,
    documentType,
    watermark: initialWatermark = false,
    fromEdit = false,
    originalReturnPath,
    originalReturnState,
    includeDeleted = false
  } = (location.state || {}) as LocationState;

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<any>(null);
  const [downloading, setDownloading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ message: string; type: ToastType } | null>(null);
  const [showWatermark, setShowWatermark] = useState(initialWatermark);
  const [textContent, setTextContent] = useState<string | null>(null);
  const isLogFile = documentType === 'version-log';

  useEffect(() => {
    if (!documentId) {
      setError(t("pdfViewer.noDocumentId"));
      setLoading(false);
      return;
    }

    const fetchPDF = async () => {
      try {
        setLoading(true);

        if (documentType === 'version-log') {
          const blob = await pdfApi.downloadVersionLog(documentId, includeDeleted);
          const text = await blob.text();
          setTextContent(text);
          return;
        }

        let blob: Blob;
        let detectedType = documentType;

        if (documentType === 'manual-upload') {
          blob = await manualUploadApi.downloadFile(documentId);
          detectedType = 'manual-upload';
        } else if (documentType === 'attached-file') {
          blob = await pdfApi.downloadAttachedFile(documentId);
          detectedType = 'attached-file';
        } else if (documentType === 'agreement') {
          blob = await pdfApi.downloadPdf(documentId);
          detectedType = 'agreement';
        } else if (documentType === 'version') {
          blob = await pdfApi.downloadVersionPdf(documentId, showWatermark);
          detectedType = 'version';
        } else {
          try {
            blob = await pdfApi.downloadPdf(documentId);
            detectedType = 'agreement';
          } catch (agreementErr: any) {
            if (agreementErr.response?.status === 404) {
              try {
                blob = await pdfApi.downloadVersionPdf(documentId, showWatermark);
                detectedType = 'version';
              } catch (versionErr: any) {
                if (versionErr.response?.status === 404) {
                  try {
                    blob = await manualUploadApi.downloadFile(documentId);
                    detectedType = 'manual-upload';
                  } catch (manualErr: any) {
                    if (manualErr.response?.status === 404) {
                      try {
                        blob = await pdfApi.downloadAttachedFile(documentId);
                        detectedType = 'attached-file';
                      } catch (attachedErr: any) {
                        throw agreementErr;
                      }
                    } else {
                      throw manualErr;
                    }
                  }
                } else {
                  throw versionErr;
                }
              }
            } else {
              throw agreementErr;
            }
          }
        }

        const url = window.URL.createObjectURL(blob);
        setPdfUrl(url);
      } catch (err: any) {
        if (err.response?.data) {
          const errorData = err.response.data;
          setErrorDetails(errorData);

          if (errorData.error === "no_pdf") {
            setError(t("pdfViewer.pdfNotAvailable", { detail: errorData.detail }));
          } else {
            setError(errorData.detail || t("pdfViewer.unableToLoadPdfRetry"));
          }
        } else {
          setError(t("pdfViewer.unableToLoadPdfConnection"));
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPDF();

    return () => {
      if (pdfUrl) {
        window.URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [documentId, showWatermark]);

  const handleEdit = async () => {
    const editReturnPath = originalReturnPath || "/pdf-viewer";
    const editReturnState = originalReturnState || { documentId, fileName };

    let agreementId = documentId;

    if (documentType === 'version') {
      try {
        const versionData = await versionApi.getVersionForEdit(documentId);
        agreementId = versionData.versionInfo?.originalAgreementId || documentId;
      } catch (err) {
        console.error(`❌ [PDF-VIEWER] Failed to get agreement ID for version:`, err);
      }
    }

    navigate(`/edit/pdf/${agreementId}`, {
      state: {
        editing: true,
        id: agreementId,
        returnPath: editReturnPath,
        returnState: editReturnState,
        fromPdfViewer: true,
      },
    });
  };

  const handleDownload = async () => {
    if (!documentId) return;

    try {
      setDownloading(true);

      if (documentType === 'version-log') {
        const blob = await pdfApi.downloadVersionLog(documentId);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const safeName = (fileName || "Version_Changes").replace(/[^\w\-]+/g, "_") + ".txt";
        a.download = safeName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        setToastMessage({ message: t("pdfViewer.logFileDownloaded"), type: "success" });
        return;
      }

      let blob: Blob;

      if (documentType === 'version') {
        blob = await pdfApi.downloadVersionPdf(documentId, showWatermark);
      } else if (documentType === 'manual-upload') {
        blob = await manualUploadApi.downloadFile(documentId);
      } else if (documentType === 'attached-file') {
        blob = await pdfApi.downloadAttachedFile(documentId);
      } else {
        blob = await pdfApi.downloadPdf(documentId);
      }

      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      const safeName =
        (fileName || "EnviroMaster_Document").replace(/[^\w\-]+/g, "_") + ".pdf";
      a.download = safeName;
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
      setToastMessage({ message: t("pdfViewer.pdfDownloaded"), type: "success" });
    } catch (err) {
      console.error("Error downloading file:", err);
      setToastMessage({ message: t("pdfViewer.downloadFailed"), type: "error" });
    } finally {
      setDownloading(false);
    }
  };

  const handleBack = () => {
    if (fromEdit && originalReturnPath && originalReturnState) {
      navigate(originalReturnPath, { state: originalReturnState });
      return;
    }

    if (fromEdit) {
      if (window.location.href.includes('admin')) {
        navigate('/admin-panel');
      } else {
        navigate('/saved-pdfs');
      }
      return;
    }

    if (originalReturnPath && originalReturnState) {
      navigate(originalReturnPath, { state: originalReturnState });
      return;
    }

    if (originalReturnPath) {
      navigate(originalReturnPath);
      return;
    }

    const currentUrl = window.location.href;

    if (currentUrl.includes('admin')) {
      navigate('/admin-panel');
    } else {
      navigate('/saved-pdfs');
    }
  };

  const handleOpenPdfInNewTab = () => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    }
  };

  const handleOpenLogFileInNewTab = () => {
    if (textContent) {
      const blob = new Blob([textContent], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 100);
    }
  };

  if (loading) {
    return (
      <div className="pdf-viewer">
        <div className="pdf-viewer__loading">
          <div className="spinner"></div>
          <p>{isLogFile ? t("pdfViewer.loadingLog") : t("pdfViewer.loadingPdf")}</p>
        </div>
      </div>
    );
  }

  if (error || (!pdfUrl && !textContent)) {
    return (
      <div className="pdf-viewer">
        <div className="pdf-viewer__error">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
            <FontAwesomeIcon icon={faExclamationTriangle} style={{ color: '#f59e0b' }} />
            {t("pdfViewer.viewingErrorTitle", { type: isLogFile ? t("pdfViewer.logFile") : t("pdfViewer.pdf") })}
          </h2>
          <p className="error-message">{error || t("pdfViewer.unableToLoad", { type: isLogFile ? t("pdfViewer.logFile") : t("pdfViewer.pdf") })}</p>

          {errorDetails?.suggestions && (
            <div className="error-suggestions">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FontAwesomeIcon icon={faLightbulb} style={{ color: '#f59e0b' }} />
                {t("pdfViewer.suggestedSolutions")}
              </h3>
              <ul>
                {errorDetails.suggestions.map((suggestion: string, index: number) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}

          {errorDetails?.documentInfo && (
            <div className="document-info">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FontAwesomeIcon icon={faFileAlt} style={{ color: '#3b82f6' }} />
                {t("pdfViewer.documentInformation")}
              </h3>
              <ul>
                <li><strong>{t("pdfViewer.title")}</strong> {errorDetails.documentInfo.title}</li>
                <li><strong>{t("pdfViewer.status")}</strong> {errorDetails.documentInfo.status}</li>
                <li><strong>{t("pdfViewer.created")}</strong> {new Date(errorDetails.documentInfo.createdAt).toLocaleString()}</li>
              </ul>
            </div>
          )}

          <div className="error-actions">
            <button onClick={handleBack} className="pdf-viewer__btn pdf-viewer__btn--secondary">
              ← {t("pdfViewer.backToFiles")}
            </button>
            {errorDetails?.error === "no_pdf" && documentId && (
              <button
                onClick={handleEdit}
                className="pdf-viewer__btn pdf-viewer__btn--primary"
                title={t("pdfViewer.editRegenerateTooltip")}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <FontAwesomeIcon icon={faPencilAlt} />
                {t("pdfViewer.editRegenerate")}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pdf-viewer">
      <div className="pdf-viewer__toolbar">
        <div className="pdf-viewer__toolbar-left">
          <button onClick={handleBack} className="pdf-viewer__btn pdf-viewer__btn--secondary">
            ← {t("common.back")}
          </button>
          <h2 className="pdf-viewer__title">{fileName || t("pdfViewer.document")}</h2>
        </div>
        <div className="pdf-viewer__toolbar-right">
          {documentType === 'version' && (
            <div className="pdf-viewer__watermark-toggle">
              <label htmlFor="watermark-checkbox" className="watermark-toggle-label">
                <input
                  id="watermark-checkbox"
                  type="checkbox"
                  checked={showWatermark}
                  onChange={(e) => setShowWatermark(e.target.checked)}
                  className="watermark-checkbox"
                />
                <span className="watermark-label-text">
                  {showWatermark ? <><FaTint /> {t("pdfViewer.draftWatermark")}</> : <><FaMagic /> {t("pdfViewer.normalView")}</>}
                </span>
              </label>
            </div>
          )}
          <button
            onClick={handleDownload}
            className="pdf-viewer__btn pdf-viewer__btn--download"
            disabled={downloading}
            title={isLogFile ? t("pdfViewer.downloadLogFile") : t("pdfViewer.downloadPdf")}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {downloading ? (
              <>
                <FontAwesomeIcon icon={faSpinner} spin />
                {t("pdfViewer.downloading")}
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faDownload} />
                {t("common.download")}
              </>
            )}
          </button>
        </div>
      </div>

      <div className="pdf-viewer__container">
        {isMobileOrMediumDevice() ? (
          isLogFile && textContent ? (
            <div className="pdf-viewer__mobile-message">
              <div className="mobile-pdf-icon">
                <FontAwesomeIcon icon={faFileAlt} size="3x" style={{ color: '#10b981' }} />
              </div>
              <h3>{t("pdfViewer.logFileReady")}</h3>
              <p>
                {t("pdfViewer.mobileLogHint")}
              </p>
              <button
                onClick={handleOpenLogFileInNewTab}
                className="pdf-viewer__btn pdf-viewer__btn--primary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '16px',
                  padding: '14px 24px',
                  margin: '20px auto 10px',
                }}
              >
                <FontAwesomeIcon icon={faExternalLinkAlt} />
                {t("pdfViewer.openLogInBrowser")}
              </button>
              <p className="mobile-pdf-note">
                {t("pdfViewer.mobileLogNote")}
              </p>
            </div>
          ) : pdfUrl ? (
            <div className="pdf-viewer__mobile-message">
              <div className="mobile-pdf-icon">
                <FontAwesomeIcon
                  icon={faFileAlt}
                  size="3x"
                  style={{
                    color: documentType === 'manual-upload' || documentType === 'attached-file'
                      ? '#f59e0b'
                      : '#3b82f6'
                  }}
                />
              </div>
              <h3>
                {documentType === 'manual-upload' || documentType === 'attached-file'
                  ? t("pdfViewer.uploadedFileReady")
                  : t("pdfViewer.pdfReady")}
              </h3>
              <p>
                {documentType === 'manual-upload' || documentType === 'attached-file'
                  ? t("pdfViewer.mobileFileHint")
                  : t("pdfViewer.mobilePdfHint")}
              </p>
              <button
                onClick={handleOpenPdfInNewTab}
                className="pdf-viewer__btn pdf-viewer__btn--primary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '16px',
                  padding: '14px 24px',
                  margin: '20px auto 10px',
                }}
              >
                <FontAwesomeIcon icon={faExternalLinkAlt} />
                {documentType === 'manual-upload' || documentType === 'attached-file'
                  ? t("pdfViewer.openFileInBrowser")
                  : t("pdfViewer.openPdfInBrowser")}
              </button>
              <p className="mobile-pdf-note">
                {documentType === 'manual-upload' || documentType === 'attached-file'
                  ? t("pdfViewer.mobileFileNote")
                  : t("pdfViewer.mobilePdfNote")}
              </p>
            </div>
          ) : null
        ) : (
          isLogFile && textContent ? (
            <pre className="pdf-viewer__text-content" style={{
              padding: '20px',
              backgroundColor: '#1e1e1e',
              color: '#d4d4d4',
              fontFamily: 'Monaco, Consolas, "Courier New", monospace',
              fontSize: '13px',
              lineHeight: '1.5',
              overflow: 'auto',
              height: '100%',
              margin: 0,
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word'
            }}>
              {textContent}
            </pre>
          ) : pdfUrl ? (
            <iframe
              src={`${pdfUrl}#toolbar=1&navpanes=0`}
              className="pdf-viewer__iframe"
              title={t("pdfViewer.pdfViewerTitle")}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
              }}
            />
          ) : null
        )}
      </div>

      {toastMessage && (
        <Toast
          message={toastMessage.message}
          type={toastMessage.type}
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  );
}
