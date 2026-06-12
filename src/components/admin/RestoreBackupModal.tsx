import React, { useState } from 'react';
import { useTranslation, Trans } from "react-i18next";
import { FaExclamationTriangle } from "react-icons/fa";
import { backupUtils } from '../../backendservice/api/pricingBackupApi';
import type { PricingBackup } from '../../backendservice/types/pricingBackup.types';

interface RestoreBackupModalProps {
  backup: PricingBackup;
  onClose: () => void;
  onRestore: (changeDayId: string, notes?: string) => Promise<void>;
  loading: boolean;
}

export const RestoreBackupModal: React.FC<RestoreBackupModalProps> = ({
  backup,
  onClose,
  onRestore,
  loading
}) => {
  const { t } = useTranslation();
  const [notes, setNotes] = useState('');
  const [confirmationText, setConfirmationText] = useState('');
  const [understood, setUnderstood] = useState(false);

  const requiredConfirmation = 'RESTORE';
  const canRestore = understood && confirmationText === requiredConfirmation;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canRestore) return;
    await onRestore(backup.changeDayId, notes || undefined);
  };

  const styles: Record<string, React.CSSProperties> = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    },
    modal: {
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '24px',
      minWidth: '600px',
      maxWidth: '90vw',
      maxHeight: '90vh',
      overflow: 'auto',
      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px',
      paddingBottom: '16px',
      borderBottom: '1px solid #e5e7eb'
    },
    title: {
      fontSize: '20px',
      fontWeight: '600',
      color: '#1f2937',
      margin: 0
    },
    closeButton: {
      background: 'none',
      border: 'none',
      fontSize: '24px',
      cursor: 'pointer',
      color: '#6b7280',
      padding: '0',
      width: '32px',
      height: '32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '6px'
    },
    content: {
      marginBottom: '24px'
    },
    warningBox: {
      backgroundColor: '#fef3c7',
      border: '1px solid #fde68a',
      borderRadius: '6px',
      padding: '16px',
      marginBottom: '20px'
    },
    warningTitle: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '16px',
      fontWeight: '600',
      color: '#92400e',
      margin: '0 0 8px 0'
    },
    warningText: {
      fontSize: '14px',
      color: '#92400e',
      lineHeight: '1.5',
      margin: 0
    },
    backupDetails: {
      backgroundColor: '#f9fafb',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '20px'
    },
    backupTitle: {
      fontSize: '16px',
      fontWeight: '600',
      color: '#1f2937',
      marginBottom: '12px'
    },
    detailsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '16px'
    },
    detailItem: {
      display: 'flex',
      flexDirection: 'column',
      gap: '4px'
    },
    detailLabel: {
      fontSize: '12px',
      fontWeight: '500',
      color: '#6b7280',
      textTransform: 'uppercase'
    },
    detailValue: {
      fontSize: '14px',
      color: '#374151',
      fontWeight: '500'
    },
    dataCountsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '12px',
      marginTop: '12px'
    },
    dataCountItem: {
      textAlign: 'center',
      padding: '8px',
      backgroundColor: 'white',
      borderRadius: '6px',
      border: '1px solid #e5e7eb'
    },
    countValue: {
      fontSize: '18px',
      fontWeight: '700',
      color: '#1f2937'
    },
    countLabel: {
      fontSize: '12px',
      color: '#6b7280'
    },
    formGroup: {
      marginBottom: '20px'
    },
    label: {
      display: 'block',
      fontSize: '14px',
      fontWeight: '500',
      color: '#374151',
      marginBottom: '8px'
    },
    textarea: {
      width: '100%',
      minHeight: '80px',
      padding: '12px',
      fontSize: '14px',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      resize: 'vertical',
      fontFamily: 'inherit'
    },
    input: {
      width: '100%',
      padding: '12px',
      fontSize: '14px',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      fontFamily: 'inherit'
    },
    helpText: {
      fontSize: '12px',
      color: '#6b7280',
      marginTop: '4px'
    },
    checkbox: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '8px',
      marginBottom: '16px'
    },
    checkboxInput: {
      marginTop: '2px'
    },
    checkboxLabel: {
      fontSize: '14px',
      color: '#374151',
      lineHeight: '1.5'
    },
    actions: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '12px',
      paddingTop: '20px',
      borderTop: '1px solid #e5e7eb'
    },
    button: {
      padding: '10px 20px',
      fontSize: '14px',
      fontWeight: '500',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      transition: 'all 0.2s ease'
    },
    cancelButton: {
      backgroundColor: '#f3f4f6',
      color: '#374151',
      border: '1px solid #d1d5db'
    },
    restoreButton: {
      backgroundColor: '#ef4444',
      color: 'white'
    },
    disabledButton: {
      opacity: 0.5,
      cursor: 'not-allowed'
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>{t("adminTools.backup.restore.title")}</h2>
          <button
            style={styles.closeButton}
            onClick={onClose}
            disabled={loading}
          >
            ×
          </button>
        </div>

        <div style={styles.content}>
          <div style={styles.warningBox}>
            <h3 style={styles.warningTitle}>
              <FaExclamationTriangle /> {t("adminTools.backup.restore.importantWarning")}
            </h3>
            <p style={styles.warningText}>
              <Trans i18nKey="adminTools.backup.restore.warningText" values={{ date: backupUtils.formatChangeDay(backup.changeDay) }} components={[<span />, <strong />]} />
            </p>
          </div>

          <div style={styles.backupDetails}>
            <h3 style={styles.backupTitle}>{t("adminTools.backup.restore.detailsTitle")}</h3>

            <div style={styles.detailsGrid}>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>{t("adminTools.backup.restore.changeDay")}</span>
                <span style={styles.detailValue}>{backupUtils.formatChangeDay(backup.changeDay)}</span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>{t("adminTools.backup.restore.created")}</span>
                <span style={styles.detailValue}>{backupUtils.formatDate(backup.createdAt)}</span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>{t("adminTools.backup.restore.trigger")}</span>
                <span style={styles.detailValue}>{backupUtils.formatBackupTrigger(backup.backupTrigger)}</span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>{t("adminTools.backup.restore.size")}</span>
                <span style={styles.detailValue}>{backupUtils.formatFileSize(backup.snapshotMetadata.compressedSize)}</span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>{t("adminTools.backup.restore.compression")}</span>
                <span style={styles.detailValue}>{backupUtils.formatCompressionRatio(backup.snapshotMetadata.compressionRatio)}</span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>{t("adminTools.backup.restore.daysAgo")}</span>
                <span style={styles.detailValue}>{backupUtils.getDaysAgo(backup.changeDay)} {t("adminTools.backup.restore.daysSuffix")}</span>
              </div>
            </div>

            <div style={styles.dataCountsGrid}>
              <div style={styles.dataCountItem}>
                <div style={styles.countValue}>{backup.snapshotMetadata.documentCounts.priceFixCount}</div>
                <div style={styles.countLabel}>{t("adminTools.backup.restore.priceFixes")}</div>
              </div>
              <div style={styles.dataCountItem}>
                <div style={styles.countValue}>{backup.snapshotMetadata.documentCounts.productCatalogCount}</div>
                <div style={styles.countLabel}>{t("adminTools.backup.restore.products")}</div>
              </div>
              <div style={styles.dataCountItem}>
                <div style={styles.countValue}>{backup.snapshotMetadata.documentCounts.serviceConfigCount}</div>
                <div style={styles.countLabel}>{t("adminTools.backup.restore.services")}</div>
              </div>
            </div>

            {backup.changeContext.changeDescription && (
              <div style={{ marginTop: '12px' }}>
                <span style={styles.detailLabel}>{t("adminTools.backup.restore.changeDescription")}</span>
                <div style={{ fontSize: '14px', color: '#374151', marginTop: '4px' }}>
                  {backup.changeContext.changeDescription}
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit}>
            <div style={styles.formGroup}>
              <label style={styles.label} htmlFor="notes">
                {t("adminTools.backup.restore.notesLabel")}
              </label>
              <textarea
                id="notes"
                style={styles.textarea}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t("adminTools.backup.restore.notesPlaceholder")}
                disabled={loading}
              />
              <div style={styles.helpText}>
                {t("adminTools.backup.restore.notesHelp")}
              </div>
            </div>

            <div style={styles.checkbox}>
              <input
                type="checkbox"
                id="understood"
                style={styles.checkboxInput}
                checked={understood}
                onChange={(e) => setUnderstood(e.target.checked)}
                disabled={loading}
              />
              <label style={styles.checkboxLabel} htmlFor="understood">
                <Trans i18nKey="adminTools.backup.restore.understoodLabel" components={[<span />, <strong />]} />
              </label>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label} htmlFor="confirmation">
                {t("adminTools.backup.restore.confirmationLabel")}
              </label>
              <input
                type="text"
                id="confirmation"
                style={styles.input}
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder={t("adminTools.backup.restore.confirmationPlaceholder")}
                disabled={loading || !understood}
              />
              <div style={styles.helpText}>
                {t("adminTools.backup.restore.confirmationHelp")}
              </div>
            </div>

            <div style={styles.actions}>
              <button
                type="button"
                style={{
                  ...styles.button,
                  ...styles.cancelButton,
                  ...(loading ? styles.disabledButton : {})
                }}
                onClick={onClose}
                disabled={loading}
              >
                {t("common.cancel")}
              </button>
              <button
                type="submit"
                style={{
                  ...styles.button,
                  ...styles.restoreButton,
                  ...(loading || !canRestore ? styles.disabledButton : {})
                }}
                disabled={loading || !canRestore}
              >
                {loading ? t("adminTools.backup.restore.restoring") : t("adminTools.backup.restore.restoreButton")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
