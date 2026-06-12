import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { pdfApi, emailApi, manualUploadApi } from "../backendservice/api";
import type { SavedFileListItem, SavedFileGroup } from "../backendservice/api/pdfApi";
import { Toast } from "./admin/Toast";
import type { ToastType } from "./admin/Toast";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheckSquare, faTrash, faClipboardList, faExclamationTriangle, faPaperclip
} from "@fortawesome/free-solid-svg-icons";
import EmailComposer, { type EmailData } from "./EmailComposer";
import { ZohoUpload } from "./ZohoUpload";
import { BiginTaskModal } from "./BiginTaskModal";
import "./SavedFiles.css";
import { getDocumentTypeForSavedFile } from "../utils/savedFileDocumentType";
import { AgreementRow } from "./SavedFiles/AgreementRow";

type FileStatus =
  | "saved"
  | "draft"
  | "pending_approval"
  | "approved_salesman"
  | "approved_admin";

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const sec = Math.max(1, Math.floor(diffMs / 1000));
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (day > 0) return `${day} day${day > 1 ? "s" : ""} ago`;
  if (hr > 0) return `${hr} hour${hr > 1 ? "s" : ""} ago`;
  if (min > 0) return `${min} minute${min > 1 ? "s" : ""} ago`;
  return `${sec} sec ago`;
}

function formatDeletionMeta(deletedBy?: string | null, deletedAt?: string | null) {
  const parts: string[] = [];
  if (deletedBy) {
    parts.push(`by ${deletedBy}`);
  }
  if (deletedAt) {
    const timestamp = new Date(deletedAt);
    if (!Number.isNaN(timestamp.getTime())) {
      parts.push(`on ${timestamp.toLocaleString()}`);
    }
  }
  return parts.length > 0 ? parts.join(" ") : null;
}

const STATUS_LABEL: Record<FileStatus, string> = {
  saved: "Saved",
  draft: "Draft",
  pending_approval: "Pending Approval",
  approved_salesman: "Approved by Salesman",
  approved_admin: "Approved by Admin",
};

interface SavedFilesGroupedProps {
  onDataLoaded?: (groups: SavedFileGroup[]) => void;
}

let hasInitiallyLoaded = false;

export default function SavedFilesGrouped({ onDataLoaded }: SavedFilesGroupedProps) {
  const { t } = useTranslation();
  const [groups, setGroups] = useState<SavedFileGroup[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [totalGroups, setTotalGroups] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const [groupsPerPage] = useState(20);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ message: string; type: ToastType } | null>(null);
  const queryRef = useRef(query);

  useEffect(() => {
    queryRef.current = query;
  }, [query]);

  const isFetchingRef = useRef(false);

  const [selectedFiles, setSelectedFiles] = useState<Record<string, boolean>>({});
  const [selectedGroups, setSelectedGroups] = useState<Record<string, boolean>>({});

  const [emailComposerOpen, setEmailComposerOpen] = useState(false);
  const [currentEmailFile, setCurrentEmailFile] = useState<SavedFileListItem | null>(null);

  const [zohoUploadOpen, setZohoUploadOpen] = useState(false);
  const [currentZohoFile, setCurrentZohoFile] = useState<SavedFileListItem | null>(null);

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [currentTaskAgreement, setCurrentTaskAgreement] = useState<{ id: string; title: string } | null>(null);

  const [bulkZohoUploadOpen, setBulkZohoUploadOpen] = useState(false);
  const [selectedFilesForBulkUpload, setSelectedFilesForBulkUpload] = useState<SavedFileListItem[]>([]);

  const [updatingStatus, setUpdatingStatus] = useState<Record<string, boolean>>({});

  const [logsModalOpen, setLogsModalOpen] = useState(false);
  const [currentLogsFile, setCurrentLogsFile] = useState<SavedFileListItem | null>(null);
  const [versionLogs, setVersionLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{type: 'file' | 'folder', id: string, title: string, fileType?: string} | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const normalizedDeleteText = deleteConfirmText.trim().toUpperCase();
  const isDeleteConfirmed = normalizedDeleteText === 'DELETE';

  const [fileWatermarkStates, setFileWatermarkStates] = useState<Map<string, boolean>>(new Map());

  const handleWatermarkToggle = useCallback((fileId: string, checked: boolean) => {
    setFileWatermarkStates(prev => {
      const newMap = new Map(prev);
      newMap.set(fileId, checked);
      return newMap;
    });
  }, []);

  const handleAddFile = useCallback((group: SavedFileGroup) => {
    console.log('Add file not implemented in SavedFilesGrouped');
  }, []);

  const handleAgreementZohoUpload = useCallback((group: SavedFileGroup) => {
    console.log('Agreement Zoho upload not implemented in SavedFilesGrouped');
  }, []);

  const handleAgreementTaskCreate = useCallback((group: SavedFileGroup) => {
    setCurrentTaskAgreement({ id: group.id, title: group.agreementTitle });
    setTaskModalOpen(true);
  }, []);

  const handleDateChange = useCallback(async (agreementId: string, newDate: string) => {
    console.log('Date change not implemented in SavedFilesGrouped');
  }, []);

  const handleStatusChange = useCallback((file: SavedFileListItem, newStatus: string) => {
    handleStatusUpdate(file.id, newStatus, file.fileType);
  }, []);

  const navigate = useNavigate();
  const location = useLocation();
  const isInAdminContext = location.pathname.includes("/admin-panel");
  const returnPath = isInAdminContext ? "/admin-panel/saved-pdfs" : "/saved-pdfs";

  const fetchGroups = useCallback(async (page = 1, search = "") => {
    if (isFetchingRef.current) {
      console.log('⏭️ [SAVED-FILES-GROUPED] Skipping duplicate call - already fetching or loading');
      return;
    }

    isFetchingRef.current = true;

    setLoading(true);
    setError(null);

    try {
      console.log(`📁 [SAVED-FILES-GROUPED] Fetching items - page ${page} with search: "${search}"`);

      const requestParams = {
        search: search.trim() || undefined,
        includeLogs: true,
        includeDrafts: true,
        isDeleted: false
      };

      console.log(`📡 [SAVED-FILES-GROUPED] Request params:`, requestParams);

      const groupedResponse = await pdfApi.getSavedFilesGrouped(page, groupsPerPage, requestParams);

      console.log(`📁 [SAVED-FILES-GROUPED] Response:`, {
        groupsCount: groupedResponse.groups.length,
        totalGroups: groupedResponse.totalGroups,
        sampleGroup: groupedResponse.groups[0] ? {
          id: groupedResponse.groups[0].id,
          title: groupedResponse.groups[0].agreementTitle,
          fileCount: groupedResponse.groups[0].fileCount,
          files: groupedResponse.groups[0].files.map(f => ({
            id: f.id,
            fileName: f.fileName,
            fileType: f.fileType
          }))
        } : null
      });

      const allGroups = groupedResponse.groups;

      setGroups(allGroups);
      setTotalGroups(groupedResponse.totalGroups);
      setTotalFiles(allGroups.reduce((sum, group) => sum + group.fileCount, 0));
      setCurrentPage(page);

      if (onDataLoaded) {
        onDataLoaded(allGroups);
      }

      console.log(`✅ [SAVED-FILES-GROUPED] Loaded ${allGroups.length} groups, ${groupedResponse.totalGroups} total`);
    } catch (err) {
      console.error("❌ Error fetching grouped saved files:", err);
      setError(t("savedFiles.toast.loadError"));
      setGroups([]);
      setTotalGroups(0);
      setTotalFiles(0);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [groupsPerPage]);

  const isFirstSearchRender = useRef(true);

  useEffect(() => {
    if (hasInitiallyLoaded) {
      console.log(`⏭️ [SAVED-FILES-GROUPED] Skipping duplicate initial load`);
      return;
    }
    hasInitiallyLoaded = true;
    console.log(`📁 [SAVED-FILES-GROUPED] Initial load`);
    fetchGroups(1, queryRef.current);

    return () => {
      setTimeout(() => {
        hasInitiallyLoaded = false;
        isFirstSearchRender.current = true;
        console.log(`🔄 [SAVED-FILES-GROUPED] Flags reset after unmount (navigating away)`);
      }, 50);
    };
  }, [fetchGroups]);

  useEffect(() => {
    if (!hasInitiallyLoaded) return;

    if (isFirstSearchRender.current) {
      isFirstSearchRender.current = false;
      console.log(`⏭️ [SAVED-FILES-GROUPED] Skipping search effect on first render`);
      return;
    }

    console.log(`🔍 [SAVED-FILES-GROUPED] Search query changed to: "${query}"`);

    const timeoutId = setTimeout(() => {
      fetchGroups(1, query);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [query]);

  const selectedFileIds = useMemo(() =>
    Object.entries(selectedFiles)
      .filter(([, selected]) => selected)
      .map(([id]) => id),
    [selectedFiles]
  );

  const selectedFileObjects = useMemo(() => {
    const allFiles: SavedFileListItem[] = [];
    groups.forEach(group => allFiles.push(...group.files));
    return allFiles.filter(file => selectedFiles[file.id]);
  }, [groups, selectedFiles]);

  const hasSelectedFiles = selectedFileIds.length > 0;

  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles(prev => ({ ...prev, [fileId]: !prev[fileId] }));
  };

  const toggleGroupSelection = (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;

    const isGroupSelected = group.files.every(file => selectedFiles[file.id]);
    const newSelectedFiles = { ...selectedFiles };

    group.files.forEach(file => {
      newSelectedFiles[file.id] = !isGroupSelected;
    });

    setSelectedFiles(newSelectedFiles);
  };

  const selectAllFiles = () => {
    const newSelectedFiles: Record<string, boolean> = {};
    groups.forEach(group => {
      group.files.forEach(file => {
        newSelectedFiles[file.id] = true;
      });
    });
    setSelectedFiles(newSelectedFiles);
  };

  const clearAllSelections = () => {
    setSelectedFiles({});
  };

  const getGroupSelectionState = (group: SavedFileGroup) => {
    const selectedCount = group.files.filter(file => selectedFiles[file.id]).length;
    if (selectedCount === 0) return 'none';
    if (selectedCount === group.files.length) return 'all';
    return 'partial';
  };

  const handleBulkZohoUpload = () => {
    const filesWithPdf = selectedFileObjects.filter(file => file.hasPdf);
    if (filesWithPdf.length === 0) {
      setToastMessage({
        message: t("savedFiles.toast.selectFilesWithPdf"),
        type: "error"
      });
      return;
    }
    setSelectedFilesForBulkUpload(filesWithPdf);
    setBulkZohoUploadOpen(true);
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const isGroupExpanded = (groupId: string) => expandedGroups.has(groupId);

  const handleView = async (file: SavedFileListItem, watermark: boolean = false) => {
    try {
      if (file.fileType === "version_log") {
        console.log("👁️ [VIEW LOG] Navigating to PDF viewer", file.id);
        navigate("/pdf-viewer", {
          state: {
            documentId: file.id,
            fileName: file.title,
            originalReturnPath: returnPath,
            documentType: "version-log",
            fileType: "version_log"
          },
        });
        return;
      }

      if (file.fileType === "attached_pdf") {
        console.log("?? [VIEW ATTACHED] Navigating to PDF viewer", file.id);
        navigate("/pdf-viewer", {
          state: {
            documentId: file.id,
            fileName: file.title,
            originalReturnPath: returnPath,
            documentType: "manual-upload",
            fileType: "attached_pdf"
          },
        });
        return;
      }

      if (file.fileType === "version_pdf") {
        console.log("?? [VIEW VERSION] Navigating to PDF viewer", file.id);
        navigate("/pdf-viewer", {
          state: {
            documentId: file.id,
            fileName: file.title,
            originalReturnPath: returnPath,
            documentType: "version",
            fileType: "version_pdf"
          },
        });
        return;
      }

      console.log(`?? [VIEW] Loading detailed data for file: ${file.id}`);
      await pdfApi.getSavedFileDetails(file.id);
      navigate("/pdf-viewer", {
        state: {
          documentId: file.id,
          fileName: file.title,
          originalReturnPath: returnPath,
        },
      });
    } catch (err) {
      setToastMessage({
        message: t("savedFiles.toast.viewError"),
        type: "error"
      });
    }
  };

  const handleDownload = async (file: SavedFileListItem, watermark: boolean = false) => {
    try {
      let blob: Blob;
      let fileName = file.title;

      if (file.fileType === "version_log") {
        blob = await pdfApi.downloadVersionLog(file.id);
        fileName = file.fileName || file.title;
      } else if (file.fileType === "attached_pdf") {
        blob = await manualUploadApi.downloadFile(file.id);
        fileName = file.fileName || file.title;
      } else if (file.fileType === "version_pdf") {
        blob = await pdfApi.downloadVersionPdf(file.id);
        fileName = file.fileName || file.title;
      } else {
        blob = await pdfApi.downloadPdf(file.id);
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeName = (fileName || "EnviroMaster_Document").replace(/[^\w\-]+/g, "_");
      const extension = file.fileType === "version_log" ? ".txt" : ".pdf";
      a.download = safeName.endsWith(extension) ? safeName : safeName + extension;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setToastMessage({ message: t("savedFiles.toast.downloadFileError"), type: "error" });
    }
  };

  const handleEmail = (file: SavedFileListItem) => {
    setCurrentEmailFile(file);
    setEmailComposerOpen(true);
  };

  const handleZohoUpload = (file: SavedFileListItem) => {
    if (!file.hasPdf) {
      setToastMessage({
        message: t("savedFiles.toast.noPdfToUpload"),
        type: "error"
      });
      return;
    }
    setCurrentZohoFile(file);
    setZohoUploadOpen(true);
  };

  const handleViewLogs = async (file: SavedFileListItem) => {
    if (file.fileType !== 'version_pdf') {
      setToastMessage({
        message: t("savedFiles.toast.logsOnlyVersionPdfs"),
        type: "error"
      });
      return;
    }

    setCurrentLogsFile(file);
    setLogsModalOpen(true);
    setLoadingLogs(true);
    setVersionLogs([]);

    try {
      console.log(`📋 [VIEW LOGS] Fetching logs for version: ${file.id}`);

      const response = await fetch(`/api/pdf/version-changes/log/${file.id}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch logs: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.log) {
        console.log(`✅ [VIEW LOGS] Found log for version ${file.id}:`, data.log);
        setVersionLogs([data.log]); 
      } else {
        console.log(`ℹ️ [VIEW LOGS] No change log found for version ${file.id}`);
        setVersionLogs([]);
      }
    } catch (err) {
      console.error('❌ [VIEW LOGS] Failed to fetch version logs:', err);
      setToastMessage({
        message: t("savedFiles.toast.loadLogsError"),
        type: "error"
      });
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleEdit = async (file: SavedFileListItem, groupId?: string) => {
    try {
      const agreementId = groupId || file.agreementId || file.id;
      if (file.fileType === 'version_pdf') {
        console.log(`✏️ [EDIT VERSION] Editing agreement for version: ${file.title}, agreement: ${agreementId}`);
        await pdfApi.getCustomerHeaderForEdit(agreementId);
        navigate(`/edit/pdf/${agreementId}`, {
          state: {
            editing: true,
            id: agreementId,
            returnPath: returnPath,
          },
        });
      } else {
        console.log(`✏️ [EDIT] Loading detailed data for file: ${file.id}, agreement: ${groupId}`);
        await pdfApi.getSavedFileDetails(file.id);
        navigate(`/edit/pdf/${groupId}`, {
          state: {
            editing: true,
            id: groupId,
            returnPath: returnPath,
          },
        });
      }
    } catch (err) {
      setToastMessage({
        message: t("savedFiles.toast.editError"),
        type: "error"
      });
    }
  };

  const handleEditAgreement = async (group: SavedFileGroup) => {
    try {
      console.log(`📝 [EDIT AGREEMENT] Loading detailed data for draft agreement: ${group.id}`);

      await pdfApi.getCustomerHeaderForEdit(group.id);

      navigate(`/edit/pdf/${group.id}`, {
        state: {
          editing: true,
          id: group.id,
          returnPath: returnPath,
        },
      });
    } catch (err) {
      setToastMessage({
        message: t("savedFiles.toast.editAgreementError"),
        type: "error"
      });
    }
  };

  const handleStatusUpdate = async (fileId: string, newStatus: string, fileType?: string) => {
    setUpdatingStatus(prev => ({ ...prev, [fileId]: true }));
    try {
      console.log(`📊 [STATUS-UPDATE] Updating ${fileType || 'unknown'} file ${fileId} to status: ${newStatus}`);

      if (fileType === 'version_pdf') {
        await pdfApi.updateVersionStatus(fileId, newStatus);
      } else if (fileType === 'attached_pdf') {
        await manualUploadApi.updateStatus(fileId, newStatus);
      } else {
        await pdfApi.updateDocumentStatus(fileId, newStatus);
      }

      console.log(`✅ [STATUS-UPDATE] Successfully updated status for ${fileId}`);

      setGroups(prevGroups =>
        prevGroups.map(group => {
          if (group.id === fileId) {
            return { ...group, statuses: [newStatus] };
          }
          return {
            ...group,
            files: group.files.map(file =>
              file.id === fileId ? { ...file, status: newStatus } : file
            )
          };
        })
      );

      setToastMessage({
        message: t("savedFiles.toast.statusUpdated"),
        type: "success"
      });
    } catch (error) {
      console.error("Failed to update status:", error);
      setToastMessage({
        message: t("savedFiles.toast.statusUpdateFailed"),
        type: "error"
      });
    } finally {
      setUpdatingStatus(prev => ({ ...prev, [fileId]: false }));
    }
  };

  const handleDelete = (type: 'file' | 'folder', id: string, title: string, fileType?: string) => {
    setItemToDelete({ type, id, title, fileType });
    setDeleteConfirmText('');
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete || !isDeleteConfirmed) {
      setToastMessage({
        message: t("savedFiles.toast.typeDeleteToConfirm"),
        type: "error"
      });
      return;
    }

    try {
      let result;

      if (itemToDelete.type === 'folder') {
        result = await pdfApi.deleteAgreement(itemToDelete.id);
      } else {
        result = await pdfApi.deleteFile(itemToDelete.id, {
          fileType: itemToDelete.fileType
        });
      }

      if (result.success) {
        setDeleteConfirmOpen(false);
        setItemToDelete(null);
        setDeleteConfirmText('');

        setToastMessage({
          message: itemToDelete.type === 'folder' ? t("savedFiles.toast.movedToTrashAgreement") : t("savedFiles.toast.movedToTrashFile"),
          type: "success"
        });

        await fetchGroups(currentPage, query);
      } else {
        setToastMessage({
          message: result.message || t("savedFiles.toast.deleteFailed"),
          type: "error"
        });
      }
    } catch (error) {
      console.error("Failed to delete:", error);
      setToastMessage({
        message: t("savedFiles.toast.deleteFailed"),
        type: "error"
      });
    }
  };

  return (
    <section className="sf">
      <div className="sf__toolbar">
        <div className="sf__search">
          <input
            type="text"
            placeholder={t("savedFiles.searchAgreements")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="sf__actions">
          {hasSelectedFiles && (
            <>
              <div className="sf__selection-info" style={{
                fontSize: '14px',
                color: '#6b7280',
                fontWeight: '500',
                padding: '0 8px'
              }}>
                {t("savedFiles.filesSelected", { count: selectedFileIds.length })}
              </div>

              <button
                type="button"
                className="sf__btn sf__btn--light"
                onClick={clearAllSelections}
              >
                {t("savedFiles.clearSelection")}
              </button>

              <button
                type="button"
                className="sf__btn sf__btn--primary zoho-upload-btn"
                onClick={handleBulkZohoUpload}
                disabled={selectedFileObjects.filter(f => f.hasPdf).length === 0}
              >
                <FontAwesomeIcon icon={faUpload} style={{ marginRight: '6px' }} />
                {t("savedFiles.uploadToBigin", { count: selectedFileObjects.filter(f => f.hasPdf).length })}
              </button>
            </>
          )}

          {!hasSelectedFiles && (
            <button
              type="button"
              className="sf__btn sf__btn--light"
              onClick={selectAllFiles}
              disabled={totalFiles === 0}
            >
              <FontAwesomeIcon icon={faCheckSquare} style={{ marginRight: '6px' }} />
              {t("savedFiles.selectAll")}
            </button>
          )}
        </div>

        <div className="sf__stats">
          {t("savedFiles.agreementsAndFiles", { agreements: totalGroups, files: totalFiles })}
        </div>
      </div>

      <div className="sf__groups">
        {loading && (
          <>
            {Array.from({ length: 5 }).map((_, idx) => (
              <div
                key={`skeleton-${idx}`}
                style={{
                  background: '#fff',
                  border: '1px solid #e6e6e6',
                  borderRadius: '10px',
                  marginBottom: '8px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                  padding: '16px',
                  animation: 'pulse 1.5s ease-in-out infinite'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    background: '#e5e7eb',
                    borderRadius: '4px'
                  }} />

                  <div style={{
                    width: '14px',
                    height: '14px',
                    background: '#e5e7eb',
                    borderRadius: '4px'
                  }} />

                  <div style={{
                    width: '18px',
                    height: '18px',
                    background: '#fef3c7',
                    borderRadius: '4px'
                  }} />

                  <div style={{ flex: 1 }}>
                    <div style={{
                      height: '16px',
                      background: '#e5e7eb',
                      borderRadius: '4px',
                      width: '60%',
                      marginBottom: '8px'
                    }} />
                    <div style={{
                      height: '12px',
                      background: '#f3f4f6',
                      borderRadius: '4px',
                      width: '40%'
                    }} />
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{
                      width: '70px',
                      height: '28px',
                      background: '#f3f4f6',
                      borderRadius: '6px'
                    }} />
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {!loading && error && (
          <div className="sf__error">
            {error}
          </div>
        )}

        {!loading && !error && groups.length === 0 && (
          <div className="sf__empty">
            {query ? t("savedFiles.empty.noAgreementsMatching", { query }) : t("savedFiles.empty.noAgreements")}
          </div>
        )}

        {!loading && !error && groups.map((group) => {
          const isExpanded = expandedGroups.has(group.id);
          const selectionState = getGroupSelectionState(group);

          return (
            <AgreementRow
              key={group.id}
              agreement={group}
              isExpanded={isExpanded}
              selectionState={selectionState}
              selectedFiles={selectedFiles}
              statusChangeLoading={updatingStatus}
              fileWatermarkStates={fileWatermarkStates}
              isInAdminContext={isInAdminContext}
              isTrashView={false}
              onToggleExpand={toggleGroup}
              onToggleSelection={toggleGroupSelection}
              onFileToggleSelection={toggleFileSelection}
              onAddFile={handleAddFile}
              onEditAgreement={handleEditAgreement}
              onDelete={handleDelete}
              onAgreementZohoUpload={handleAgreementZohoUpload}
              onAgreementTaskCreate={handleAgreementTaskCreate}
              onDateChange={handleDateChange}
              onView={handleView}
              onDownload={handleDownload}
              onEmail={handleEmail}
              onZohoUpload={handleZohoUpload}
              onEdit={handleEdit}
              onStatusChange={handleStatusChange}
              onWatermarkToggle={handleWatermarkToggle}
              onRestore={(type, id, title, fileType) => {
                console.log('Restore not available in normal view');
              }}
            />
          );
        })}
      </div>

      <div className="sf__pager">
        <div className="sf__page-info">
          {t("savedFiles.pageInfoAgreements", { from: Math.min((currentPage - 1) * groupsPerPage + 1, totalGroups), to: Math.min(currentPage * groupsPerPage, totalGroups), total: totalGroups })}
        </div>
      </div>

      {toastMessage && (
        <Toast
          message={toastMessage.message}
          type={toastMessage.type}
          onClose={() => setToastMessage(null)}
        />
      )}

      <EmailComposer
          isOpen={emailComposerOpen}
          onClose={() => setEmailComposerOpen(false)}
          onSend={async (emailData: EmailData) => {
            if (!currentEmailFile) return;
            const documentType = getDocumentTypeForSavedFile(currentEmailFile);
            await emailApi.sendEmailWithPdfById({
              to: emailData.to,
              from: emailData.from,
              subject: emailData.subject,
              body: emailData.body,
              documentId: currentEmailFile.id,
              fileName: currentEmailFile.title,
              documentType,
            });
          setToastMessage({
            message: t("savedFiles.toast.emailSent"),
            type: "success"
          });
          setEmailComposerOpen(false);
          setCurrentEmailFile(null);
        }}
        attachment={currentEmailFile ? {
          id: currentEmailFile.id,
          fileName: currentEmailFile.title,
          downloadUrl: pdfApi.getPdfDownloadUrl(currentEmailFile.id),
          documentType: getDocumentTypeForSavedFile(currentEmailFile)
        } : undefined}
        defaultSubject={currentEmailFile ? t("savedFiles.email.subject", { name: currentEmailFile.title, status: STATUS_LABEL[currentEmailFile.status as FileStatus] }) : ''}
        defaultBody={currentEmailFile ? t("savedFiles.email.bodyCustomerHeader", { name: currentEmailFile.title, status: STATUS_LABEL[currentEmailFile.status as FileStatus] }) : ''}
        userEmail=""
      />

      {zohoUploadOpen && currentZohoFile && (
      <ZohoUpload
        agreementId={currentZohoFile.agreementId || currentZohoFile.id}
        agreementTitle={currentZohoFile.title}
        bulkFiles={[{
          id: currentZohoFile.id,
          fileName: currentZohoFile.fileName,
          title: currentZohoFile.title,
          fileType: currentZohoFile.fileType
        }]}
        onClose={() => {
            setZohoUploadOpen(false);
            setCurrentZohoFile(null);
          }}
          onSuccess={() => {
            setZohoUploadOpen(false);
            setCurrentZohoFile(null);
            fetchGroups(currentPage, query);
            setToastMessage({
              message: t("savedFiles.toast.uploadedToZohoBigin"),
              type: "success"
            });
          }}
        />
      )}

      {taskModalOpen && currentTaskAgreement && (
        <BiginTaskModal
          agreementId={currentTaskAgreement.id}
          agreementTitle={currentTaskAgreement.title}
          onClose={() => { setTaskModalOpen(false); setCurrentTaskAgreement(null); }}
          onSuccess={() => {
            setToastMessage({ message: t("savedFiles.toast.taskCreated"), type: "success" });
          }}
        />
      )}

      {logsModalOpen && currentLogsFile && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '800px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              borderBottom: '2px solid #e5e7eb',
              paddingBottom: '16px'
            }}>
              <h3 style={{
                margin: 0,
                fontSize: '20px',
                fontWeight: '600',
                color: '#374151'
              }}>
                {t("savedFiles.logs.title", { title: currentLogsFile.title })}
              </h3>
              <button
                onClick={() => {
                  setLogsModalOpen(false);
                  setCurrentLogsFile(null);
                  setVersionLogs([]);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6b7280',
                  padding: '4px'
                }}
                title={t("common.close")}
              >
                ×
              </button>
            </div>

            {loadingLogs && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px',
                color: '#6b7280'
              }}>
                <div>{t("savedFiles.logs.loading")}</div>
              </div>
            )}

            {!loadingLogs && versionLogs.length === 0 && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px',
                color: '#6b7280',
                textAlign: 'center'
              }}>
                <FontAwesomeIcon
                  icon={faClipboardList}
                  style={{ fontSize: '48px', marginBottom: '16px', color: '#d1d5db' }}
                />
                <div style={{ fontSize: '18px', fontWeight: '500', marginBottom: '8px' }}>
                  {t("savedFiles.logs.noLogsTitle")}
                </div>
                <div style={{ fontSize: '14px' }}>
                  {t("savedFiles.logs.noLogsBody")}
                </div>
              </div>
            )}

            {!loadingLogs && versionLogs.length > 0 && versionLogs.map((log, logIndex) => (
              <div key={logIndex} style={{
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                marginBottom: '16px',
                overflow: 'hidden'
              }}>
                <div style={{
                  background: '#f9fafb',
                  padding: '16px',
                  borderBottom: '1px solid #e5e7eb'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: '8px'
                  }}>
                    <div>
                      <div style={{
                        fontSize: '16px',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '4px'
                      }}>
                        {t("savedFiles.logs.versionChanges", { version: log.versionNumber })}
                      </div>
                      <div style={{
                        fontSize: '14px',
                        color: '#6b7280'
                      }}>
                        {t("savedFiles.logs.changesLogged", { count: log.totalChanges })}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: '500',
                        color: log.totalPriceImpact >= 0 ? '#059669' : '#dc2626',
                        marginBottom: '4px'
                      }}>
                        {log.totalPriceImpact >= 0 ? '+' : ''}${log.totalPriceImpact != null ? log.totalPriceImpact.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '0.00'}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: '#6b7280'
                      }}>
                        {t("savedFiles.logs.totalImpact")}
                      </div>
                    </div>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '16px',
                    marginTop: '12px',
                    padding: '12px',
                    background: '#fff',
                    borderRadius: '6px',
                    fontSize: '13px'
                  }}>
                    <div>
                      <span style={{ fontWeight: '500', color: '#374151' }}>{t("savedFiles.logs.salesperson")}</span>
                      <span style={{ marginLeft: '8px', color: '#6b7280' }}>
                        {log.salespersonName || t("savedFiles.logs.unknown")}
                      </span>
                    </div>
                    <div>
                      <span style={{ fontWeight: '500', color: '#374151' }}>{t("savedFiles.logs.action")}</span>
                      <span style={{
                        marginLeft: '8px',
                        color: '#6b7280',
                        textTransform: 'capitalize'
                      }}>
                        {log.saveAction?.replace('_', ' ') || t("savedFiles.logs.unknown")}
                      </span>
                    </div>
                    <div>
                      <span style={{ fontWeight: '500', color: '#374151' }}>{t("savedFiles.logs.date")}</span>
                      <span style={{ marginLeft: '8px', color: '#6b7280' }}>
                        {log.createdAt ? new Date(log.createdAt).toLocaleDateString() : t("savedFiles.logs.unknown")}
                      </span>
                    </div>
                    {log.hasSignificantChanges && (
                      <div>
                        <span style={{
                          background: '#fef3c7',
                          color: '#92400e',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '600'
                        }}>
                          <FontAwesomeIcon icon={faExclamationTriangle} /> {t("savedFiles.logs.significantChanges")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {log.changes && log.changes.length > 0 && (
                  <div style={{ padding: '16px' }}>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '12px'
                    }}>
                      {t("savedFiles.logs.priceOverrideChanges")}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {log.changes.map((change, changeIndex) => (
                        <div key={changeIndex} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '12px',
                          background: change.changeAmount >= 0 ? '#f0fdf4' : '#fef2f2',
                          borderRadius: '6px',
                          fontSize: '13px'
                        }}>
                          <div style={{ flex: 1 }}>
                            <div style={{
                              fontWeight: '500',
                              color: '#374151',
                              marginBottom: '2px'
                            }}>
                              {change.productName}
                            </div>
                            <div style={{ color: '#6b7280', fontSize: '12px' }}>
                              {change.fieldDisplayName}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', minWidth: '120px' }}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              fontSize: '12px',
                              color: '#6b7280',
                              marginBottom: '2px'
                            }}>
                              <span>${change.originalValue != null ? change.originalValue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '0.00'}</span>
                              <span>→</span>
                              <span>${change.newValue != null ? change.newValue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '0.00'}</span>
                            </div>
                            <div style={{
                              fontWeight: '600',
                              color: change.changeAmount >= 0 ? '#059669' : '#dc2626'
                            }}>
                              {change.changeAmount >= 0 ? '+' : ''}${change.changeAmount != null ? change.changeAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '0.00'}
                              {change.changePercentage !== undefined && change.changePercentage !== null && (
                                <span style={{ marginLeft: '4px' }}>
                                  ({change.changePercentage >= 0 ? '+' : ''}{change.changePercentage.toFixed(1)}%)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(!log.changes || log.changes.length === 0) && (
                  <div style={{
                    padding: '16px',
                    textAlign: 'center',
                    color: '#6b7280',
                    fontSize: '14px'
                  }}>
                    {t("savedFiles.logs.noIndividualChanges")}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {bulkZohoUploadOpen && selectedFilesForBulkUpload.length > 0 && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <h3 style={{
              margin: '0 0 16px',
              fontSize: '18px',
              fontWeight: '600',
              color: '#374151'
            }}>
              {t("savedFiles.bulkModal.title", { count: selectedFilesForBulkUpload.length })}
            </h3>

            <div style={{
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '20px'
            }}>
              <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
                {t("savedFiles.bulkModal.selectedFiles")}
              </div>
              {selectedFilesForBulkUpload.map((file, index) => (
                <div key={file.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '4px 0',
                  fontSize: '13px'
                }}>
                  <FontAwesomeIcon icon={faFileAlt} style={{ color: '#2563eb' }} />
                  <span>{file.title}</span>
                  <span style={{ color: '#10b981' }}><FontAwesomeIcon icon={faPaperclip} /></span>
                </div>
              ))}
            </div>

            <p style={{
              fontSize: '14px',
              color: '#6b7280',
              marginBottom: '20px'
            }}>
              {t("savedFiles.bulkModal.description")}
            </p>

            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                type="button"
                style={{
                  background: '#f3f4f6',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
                onClick={() => {
                  setBulkZohoUploadOpen(false);
                  setSelectedFilesForBulkUpload([]);
                }}
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                style={{
                  background: '#f59e0b',
                  border: '1px solid #f59e0b',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#fff'
                }}
                onClick={async () => {
                  try {
                    setBulkZohoUploadOpen(false);
                    setSelectedFilesForBulkUpload([]);
                    clearAllSelections();

                    setToastMessage({
                      message: t("savedFiles.toast.bulkUploaded", { count: selectedFilesForBulkUpload.length }),
                      type: "success"
                    });

                    await fetchGroups(currentPage, query);
                  } catch (error) {
                    setToastMessage({
                      message: t("savedFiles.toast.bulkUploadFailed"),
                      type: "error"
                    });
                  }
                }}
              >
                <FontAwesomeIcon icon={faUpload} style={{ marginRight: '6px' }} />
                {t("savedFiles.uploadAll")}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmOpen && itemToDelete && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '16px'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: '#fef2f2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <FontAwesomeIcon
                  icon={faTrash}
                  style={{
                    color: '#dc2626',
                    fontSize: '20px'
                  }}
                />
              </div>
              <div>
                <h3 style={{
                  margin: '0 0 4px',
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#374151'
                }}>
                  {itemToDelete.type === 'folder' ? t("savedFiles.deleteModal.titleAgreement") : t("savedFiles.deleteModal.titleFile")}
                </h3>
                <p style={{
                  margin: 0,
                  fontSize: '14px',
                  color: '#6b7280'
                }}>
                  {t("savedFiles.deleteModal.subtitle")}
                </p>
              </div>
            </div>

            <div style={{
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '20px'
            }}>
              <p style={{
                margin: '0 0 8px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151'
              }}>
                {itemToDelete.type === 'folder' ? t("savedFiles.deleteModal.agreementLabel", { title: itemToDelete.title }) : t("savedFiles.deleteModal.fileLabel", { title: itemToDelete.title })}
              </p>
              <p style={{
                margin: 0,
                fontSize: '12px',
                color: '#6b7280'
              }}>
                {itemToDelete.type === 'folder'
                  ? t("savedFiles.deleteModal.noteAgreement")
                  : t("savedFiles.deleteModal.noteFile")
                }
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                {t("savedFiles.deleteModal.typeToConfirm")}
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  textTransform: 'uppercase'
                }}
                autoFocus
              />
            </div>

            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                type="button"
                style={{
                  background: '#f3f4f6',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151'
                }}
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setItemToDelete(null);
                  setDeleteConfirmText('');
                }}
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                style={{
                  background: isDeleteConfirmed ? '#dc2626' : '#f3f4f6',
                  border: `1px solid ${isDeleteConfirmed ? '#dc2626' : '#d1d5db'}`,
                  borderRadius: '8px',
                  padding: '8px 16px',
                  cursor: isDeleteConfirmed ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: isDeleteConfirmed ? '#fff' : '#9ca3af',
                  opacity: isDeleteConfirmed ? 1 : 0.6
                }}
                onClick={confirmDelete}
                disabled={!isDeleteConfirmed}
              >
                <FontAwesomeIcon icon={faTrash} style={{ marginRight: '6px' }} />
                {t("savedFiles.deleteModal.moveToTrash")}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
