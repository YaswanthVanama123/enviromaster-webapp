import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTimes,
  faPlus,
  faSync,
  faSpinner,
  faFileAlt,
  faHistory,
  faInfo
} from "@fortawesome/free-solid-svg-icons";
import type { VersionStatus } from "../backendservice/api/versionApi";
import "./VersionDialog.css";

interface VersionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  versionStatus: VersionStatus | null;
  onCreateVersion: (replaceRecent: boolean, changeNotes: string) => Promise<void>;
  onReplaceMain: (changeNotes: string) => Promise<void>;
  loading?: boolean;
}

export const VersionDialog: React.FC<VersionDialogProps> = ({
  isOpen,
  onClose,
  versionStatus,
  onCreateVersion,
  onReplaceMain,
  loading = false
}) => {
  const { t } = useTranslation();
  const [selectedAction, setSelectedAction] = useState<'create_version' | 'replace_recent'>('create_version');
  const [changeNotes, setChangeNotes] = useState("");

  const getRecommendedAction = React.useCallback(() => {
    if (versionStatus?.isFirstTime) return 'create_version';
    return 'create_version';
  }, [versionStatus]);

  const resetToRecommended = React.useCallback(() => {
    setSelectedAction(getRecommendedAction());
    setChangeNotes("");
  }, [getRecommendedAction]);

  React.useEffect(() => {
    if (versionStatus) {
      resetToRecommended();
    }
  }, [versionStatus, resetToRecommended]);

  if (!isOpen || !versionStatus) return null;

  const handleConfirm = async () => {
    try {
      const replaceRecent = selectedAction === 'replace_recent';
      await onCreateVersion(replaceRecent, changeNotes);
    } catch (error) {
      console.error('Version action failed:', error);
    }
  };

  const renderActionOption = (
    actionType: typeof selectedAction,
    title: string,
    description: string,
    icon: any,
    recommended?: boolean
  ) => (
    <div
      className={`version-dialog__action-option ${
        selectedAction === actionType ? 'selected' : ''
      } ${recommended ? 'recommended' : ''}`}
      onClick={() => setSelectedAction(actionType)}
    >
      <div className="version-dialog__action-header">
        <FontAwesomeIcon icon={icon} />
        <span className="version-dialog__action-title">{title}</span>
        {recommended && <span className="version-dialog__recommended-badge">{t("versionDialog.recommended")}</span>}
      </div>
      <p className="version-dialog__action-description">{description}</p>
    </div>
  );

  return (
    <div className="version-dialog">
      <div className="version-dialog__overlay" onClick={onClose} />
      <div className="version-dialog__modal">
        <div className="version-dialog__header">
          <h2>{t("versionDialog.title")}</h2>
          <button className="version-dialog__close" onClick={onClose} disabled={loading}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        <div className="version-dialog__body">
          <div className="version-dialog__status">
            <FontAwesomeIcon icon={faInfo} />
            <div className="version-dialog__status-content">
              <p>
                <strong>{t("versionDialog.agreementLabel")}</strong> {versionStatus.agreement.headerTitle}
              </p>
              <p>
                {t("versionDialog.currentVersions", { count: versionStatus.totalVersions })}
                {versionStatus.totalVersions > 0 && t("versionDialog.latestVersion", { number: versionStatus.latestVersionNumber })}
              </p>
            </div>
          </div>

          <div className="version-dialog__actions">
            <h3>{t("versionDialog.howToSave")}</h3>

            {renderActionOption(
              'create_version',
              t("versionDialog.createVersionTitle"),
              t("versionDialog.createVersionDescription", { number: versionStatus.latestVersionNumber + 1 }),
              faPlus,
              true
            )}

            {versionStatus.totalVersions > 0 && renderActionOption(
              'replace_recent',
              t("versionDialog.replaceRecentTitle"),
              t("versionDialog.replaceRecentDescription", { number: versionStatus.latestVersionNumber }),
              faSync,
              false
            )}
          </div>

          <div className="version-dialog__notes">
            <label htmlFor="changeNotes" className="version-dialog__notes-label">
              {t("versionDialog.notesLabel")}
            </label>
            <textarea
              id="changeNotes"
              className="version-dialog__notes-textarea"
              placeholder={t("versionDialog.notesPlaceholder")}
              value={changeNotes}
              onChange={(e) => setChangeNotes(e.target.value)}
              rows={3}
              disabled={loading}
            />
          </div>

          {versionStatus.versions.length > 0 && (
            <div className="version-dialog__history">
              <h4>
                <FontAwesomeIcon icon={faHistory} />
                {t("versionDialog.existingVersions", { count: versionStatus.versions.length })}
              </h4>
              <div className="version-dialog__version-list">
                {versionStatus.versions.slice(0, 3).map((version) => (
                  <div key={version.id} className="version-dialog__version-item">
                    <span className="version-number">v{version.versionNumber}</span>
                    <span className="version-date">
                      {new Date(version.createdAt).toLocaleDateString()}
                    </span>
                    <span className="version-size">
                      {Math.round(version.sizeBytes / 1024)}KB
                    </span>
                  </div>
                ))}
                {versionStatus.versions.length > 3 && (
                  <div className="version-dialog__version-item">
                    <span className="version-more">
                      {t("versionDialog.moreVersions", { count: versionStatus.versions.length - 3 })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="version-dialog__footer">
          <button
            className="version-dialog__btn version-dialog__btn--secondary"
            onClick={onClose}
            disabled={loading}
          >
            {t("common.cancel")}
          </button>
          <button
            className="version-dialog__btn version-dialog__btn--primary"
            onClick={handleConfirm}
            disabled={
              loading ||
              !changeNotes.trim()
            }
          >
            {loading ? (
              <>
                <FontAwesomeIcon icon={faSpinner} spin />
                {t("versionDialog.saving")}
              </>
            ) : (
              <>
                {selectedAction === 'create_version' && t("versionDialog.createVersionButton", { number: versionStatus.latestVersionNumber + 1 })}
                {selectedAction === 'replace_recent' && t("versionDialog.replaceVersionButton", { number: versionStatus.latestVersionNumber })}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
