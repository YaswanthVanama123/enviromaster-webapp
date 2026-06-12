import { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileAlt, faDownload, faTrash, faUpload, faCheckCircle, faTimes, faExclamationTriangle } from "@fortawesome/free-solid-svg-icons";
import { manualUploadApi } from "../backendservice/api";
import { Toast } from "./admin/Toast";
import type { ToastType } from "./admin/Toast";
import "./ManualUploads.css";

interface ManualUpload {
  _id: string;
  fileName: string;
  originalFileName: string;
  fileSize: number;
  description: string;
  uploadedBy: string;
  status: "uploaded" | "processing" | "completed" | "failed";
  createdAt: string;
  updatedAt: string;
  zoho?: {
    bigin?: {
      fileId: string | null;
      url: string | null;
    };
    crm?: {
      fileId: string | null;
      url: string | null;
    };
  };
}

export default function ManualUploads() {
  const { t } = useTranslation();
  const [uploads, setUploads] = useState<ManualUpload[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [description, setDescription] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [toastMessage, setToastMessage] = useState<{ message: string; type: ToastType } | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [uploadToDelete, setUploadToDelete] = useState<string | null>(null);

  const isFirstMount = useRef(true);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      console.log("📤 [MANUAL-UPLOADS] Initial load");
      fetchUploads();
    }
  }, []);

  const fetchUploads = async () => {
    setLoading(true);
    try {
      const data = await manualUploadApi.getManualUploads();
      setUploads(data.items || []);
    } catch (err) {
      console.error("Error fetching uploads:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles(filesArray);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      alert(t("manualUploads.selectAtLeastOne"));
      return;
    }

    setUploading(true);
    setUploadSuccess(false);
    setUploadProgress({ current: 0, total: selectedFiles.length });

    let successCount = 0;
    let failCount = 0;

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        try {
          setUploadProgress({ current: i + 1, total: selectedFiles.length });
          await manualUploadApi.uploadFile(selectedFiles[i], description);
          successCount++;
        } catch (err) {
          console.error(`Error uploading file ${selectedFiles[i].name}:`, err);
          failCount++;
        }
      }

      setSelectedFiles([]);
      setDescription("");
      setUploadProgress(null);

      if (successCount > 0) {
        setUploadSuccess(true);
        fetchUploads();
        setTimeout(() => setUploadSuccess(false), 3000);
      }

      if (failCount > 0) {
        alert(t("manualUploads.uploadPartial", { success: successCount, failed: failCount }));
      }
    } catch (err) {
      console.error("Error uploading files:", err);
      alert(t("manualUploads.uploadFailed"));
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const handleDownload = async (id: string, fileName: string) => {
    try {
      const blob = await manualUploadApi.downloadFile(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error downloading file:", err);
      alert(t("manualUploads.downloadFailed"));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("manualUploads.confirmDelete"))) return;

    try {
      await manualUploadApi.deleteFile(id);
      fetchUploads();
    } catch (err) {
      console.error("Error deleting upload:", err);
      alert(t("manualUploads.deleteFailed"));
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="manual-uploads">
      <div className="manual-uploads-header">
        <h2>{t("manualUploads.title")}</h2>
        <p className="subtitle">{t("manualUploads.subtitle")}</p>
      </div>

      <div className="upload-section-card">
        <h3>{t("manualUploads.uploadNewTitle")}</h3>
        <div className="upload-form">
          <div className="form-group">
            <label>{t("manualUploads.selectFilesLabel")}</label>
            <div className="file-input-wrapper">
              <input
                id="file-input"
                type="file"
                accept="application/pdf"
                onChange={handleFileSelect}
                disabled={uploading}
                multiple
                style={{ display: 'none' }}
              />
              <button
                type="button"
                className="choose-files-btn"
                onClick={() => document.getElementById('file-input')?.click()}
                disabled={uploading}
              >
                <FontAwesomeIcon icon={faFileAlt} style={{ marginRight: "10px" }} />
                {t("manualUploads.chooseFiles")}
              </button>
              {selectedFiles.length === 0 && (
                <span className="no-files-text">{t("manualUploads.noFilesSelected")}</span>
              )}
            </div>
            {selectedFiles.length > 0 && (
              <div className="selected-files-container">
                <div className="selected-files-header">
                  {t("manualUploads.selectedFilesHeader", { count: selectedFiles.length })}
                </div>
                {selectedFiles.map((file, index) => (
                  <div key={index} className="selected-file-item">
                    <FontAwesomeIcon icon={faFileAlt} size="lg" style={{ color: "#2563eb" }} />
                    <span className="file-info">
                      {file.name} <span className="file-size">({formatFileSize(file.size)})</span>
                    </span>
                    <button
                      className="remove-file-btn"
                      onClick={() => removeFile(index)}
                      disabled={uploading}
                      title={t("manualUploads.removeFileTitle")}
                    >
                      <FontAwesomeIcon icon={faTrash} size="sm" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="description">{t("manualUploads.descriptionLabel")}</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("manualUploads.descriptionPlaceholder")}
              rows={3}
              disabled={uploading}
            />
          </div>

          <button
            className="upload-button"
            onClick={handleUpload}
            disabled={selectedFiles.length === 0 || uploading}
          >
            <FontAwesomeIcon icon={faUpload} style={{ marginRight: "8px" }} />
            {uploading
              ? t("manualUploads.uploadingProgress", { current: uploadProgress?.current || 0, total: uploadProgress?.total || 0 })
              : (selectedFiles.length > 0 ? t("manualUploads.uploadFiles", { count: selectedFiles.length }) : t("manualUploads.uploadToZoho"))}
          </button>

          {uploadSuccess && (
            <div className="success-message">
              <FontAwesomeIcon icon={faCheckCircle} style={{ marginRight: "8px" }} />
              {t("manualUploads.uploadSuccessBanner")}
            </div>
          )}
        </div>
      </div>

      <div className="uploads-list-card">
        <h3>{t("manualUploads.uploadedFilesTitle")}</h3>
        {loading ? (
          <div className="loading">{t("manualUploads.loadingUploads")}</div>
        ) : uploads.length === 0 ? (
          <div className="empty-state">{t("manualUploads.emptyState")}</div>
        ) : (
          <div className="uploads-table-container">
            <table className="uploads-table">
              <thead>
                <tr>
                  <th>{t("manualUploads.colFileName")}</th>
                  <th>{t("manualUploads.colSize")}</th>
                  <th>{t("manualUploads.colStatus")}</th>
                  <th>{t("manualUploads.colUploaded")}</th>
                  <th>{t("manualUploads.colBiginStatus")}</th>
                  <th>{t("manualUploads.colActions")}</th>
                </tr>
              </thead>
              <tbody>
                {uploads.map((upload) => (
                  <tr key={upload._id}>
                    <td>
                      <div className="file-name">
                        <FontAwesomeIcon icon={faFileAlt} className="file-icon" size="lg" style={{ color: "#2563eb" }} />
                        <div>
                          <div className="file-title">{upload.fileName}</div>
                          {upload.description && (
                            <div className="file-description">{upload.description}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>{formatFileSize(upload.fileSize)}</td>
                    <td>
                      <span className={`status-badge status-${upload.status}`}>
                        {upload.status}
                      </span>
                    </td>
                    <td className="date-cell">{formatDate(upload.createdAt)}</td>
                    <td>
                      <div className="zoho-status">
                        {upload.zoho?.bigin?.fileId && (
                          <span className="zoho-tag zoho-bigin" title={t("manualUploads.biginTitle")}>
                            Bigin <FontAwesomeIcon icon={faCheckCircle} size="xs" style={{ marginLeft: "2px" }} />
                          </span>
                        )}
                        {upload.zoho?.crm?.fileId && (
                          <span className="zoho-tag zoho-crm" title={t("manualUploads.crmTitle")}>
                            CRM <FontAwesomeIcon icon={faCheckCircle} size="xs" style={{ marginLeft: "2px" }} />
                          </span>
                        )}
                        {!upload.zoho?.bigin?.fileId && !upload.zoho?.crm?.fileId && (
                          <span className="zoho-tag zoho-pending">{t("manualUploads.pending")}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="action-btn download-btn"
                          onClick={() => handleDownload(upload._id, upload.fileName)}
                          title={t("manualUploads.downloadTitle")}
                        >
                          <FontAwesomeIcon icon={faDownload} />
                        </button>
                        <button
                          className="action-btn delete-btn"
                          onClick={() => handleDelete(upload._id)}
                          title={t("manualUploads.deleteTitle")}
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
