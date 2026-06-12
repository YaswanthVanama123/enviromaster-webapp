import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  faMoneyBill,
  faBox,
  faCog,
  faChartBar,
  faCheckCircle,
  faExclamationTriangle,
  faClipboard,
  faFile,
  faDatabase,
  faWrench,
  faSync,
  faFolder,
  faHdd,
  faEdit,
  faRocket,
  faChartLine,
  faArchive,
  faFileAlt,
  faSearch,
  faCaretRight,
  faTags,
  faInfo,
  faWarning
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { backupUtils } from '../../backendservice/api/pricingBackupApi';
import { usePricingBackupDetails } from '../../backendservice/hooks/usePricingBackups';
import type { PricingBackup } from '../../backendservice/types/pricingBackup.types';

interface BackupDetailsModalProps {
  backup: PricingBackup;
  onClose: () => void;
}

export const BackupDetailsModal: React.FC<BackupDetailsModalProps> = ({
  backup,
  onClose
}) => {
  const { t } = useTranslation();
  const { backup: detailedBackup, snapshot, loading: snapshotLoading, error: snapshotError } = usePricingBackupDetails(backup.changeDayId);
  const [activeTab, setActiveTab] = useState<'overview' | 'content' | 'metadata'>('overview');

  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const extractAllPricingFromConfig = (config: any) => {
    if (!config || typeof config !== 'object') return [];

    const pricingData: Array<{
      name: string;
      price: number;
      unit?: string;
      description?: string;
      category?: string;
    }> = [];

    const findPricingValues = (obj: any, path: string = '', depth: number = 0) => {
      if (depth > 4 || !obj || typeof obj !== 'object') return;

      Object.entries(obj).forEach(([key, value]) => {
        const currentPath = path ? `${path}.${key}` : key;

        if (typeof value === 'number' && value > 0) {
          const lowerKey = key.toLowerCase();
          const lowerPath = currentPath.toLowerCase();

          if (lowerKey.includes('rate') ||
              lowerKey.includes('price') ||
              lowerKey.includes('charge') ||
              lowerKey.includes('cost') ||
              lowerKey.includes('fee') ||
              lowerKey.includes('minimum') ||
              lowerKey.includes('discount') ||
              lowerPath.includes('pricing')) {

            let unit = 'per service';
            if (lowerKey.includes('sqft') || lowerKey.includes('sq')) unit = 'per sq ft';
            else if (lowerKey.includes('hour')) unit = 'per hour';
            else if (lowerKey.includes('fixture')) unit = 'per fixture';
            else if (lowerKey.includes('unit')) unit = 'per unit';
            else if (lowerKey.includes('room')) unit = 'per room';
            else if (lowerKey.includes('window')) unit = 'per window';
            else if (lowerKey.includes('drain')) unit = 'per drain';
            else if (lowerKey.includes('trap')) unit = 'per trap';
            else if (lowerKey.includes('bathroom')) unit = 'per bathroom';
            else if (lowerKey.includes('minimum')) unit = 'minimum charge';
            else if (lowerKey.includes('discount')) unit = 'discount rate';
            else if (lowerKey.includes('week')) unit = 'per week';
            else if (lowerKey.includes('visit')) unit = 'per visit';
            else if (lowerKey.includes('install')) unit = 'installation';

            const nameParts = currentPath.split('.');
            const readableName = nameParts
              .map(part => part.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()))
              .join(' - ');

            let category = 'Service Pricing';
            if (currentPath.includes('geographic')) category = 'Geographic Pricing';
            else if (currentPath.includes('frequency') || currentPath.includes('fixture')) category = 'Frequency Rates';
            else if (currentPath.includes('minimum')) category = 'Minimum Charges';
            else if (currentPath.includes('install')) category = 'Installation Fees';
            else if (currentPath.includes('trip')) category = 'Trip Charges';
            else if (currentPath.includes('volume')) category = 'Volume Pricing';
            else if (currentPath.includes('addon') || currentPath.includes('additional')) category = 'Additional Services';
            else if (currentPath.includes('window')) category = 'Window Pricing';
            else if (currentPath.includes('area')) category = 'Area Pricing';
            else if (currentPath.includes('core')) category = 'Base Rates';

            pricingData.push({
              name: readableName,
              price: value,
              unit,
              category
            });
          }
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          findPricingValues(value, currentPath, depth + 1);
        }
      });
    };

    findPricingValues(config);
    return pricingData;
  };

  const extractServicePricing = (config: any, serviceId: string) => {
    return extractAllPricingFromConfig(config);
  };

  const displayBackup = detailedBackup || backup;

  const documentCounts = snapshot ? {
    priceFixCount: snapshot.dataTypes?.priceFix?.count || 0,
    productCatalogCount: snapshot.dataTypes?.productCatalog?.totalCount || 0,
    serviceConfigCount: snapshot.dataTypes?.serviceConfigs?.count || 0
  } : (displayBackup.snapshotMetadata?.documentCounts || { priceFixCount: 0, productCatalogCount: 0, serviceConfigCount: 0 });

  const sizeInfo = {
    compressedSize: displayBackup.snapshotMetadata?.compressedSize || 0,
    originalSize: displayBackup.snapshotMetadata?.originalSize || 0,
    compressionRatio: displayBackup.snapshotMetadata?.compressionRatio || 0
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
      padding: '0',
      minWidth: '800px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      overflow: 'hidden',
      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
      display: 'flex',
      flexDirection: 'column'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '24px',
      borderBottom: '1px solid #e5e7eb'
    },
    title: {
      fontSize: '20px',
      fontWeight: '600',
      color: '#1f2937',
      margin: 0
    },
    subtitle: {
      fontSize: '14px',
      color: '#6b7280',
      marginTop: '4px'
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
    tabContainer: {
      display: 'flex',
      borderBottom: '1px solid #e5e7eb',
      backgroundColor: '#f9fafb'
    },
    tab: {
      padding: '12px 24px',
      fontSize: '14px',
      fontWeight: '500',
      backgroundColor: 'transparent',
      border: 'none',
      cursor: 'pointer',
      borderBottom: '2px solid transparent',
      transition: 'all 0.2s ease'
    },
    activeTab: {
      color: '#3b82f6',
      borderBottom: '2px solid #3b82f6',
      backgroundColor: 'white'
    },
    inactiveTab: {
      color: '#6b7280',
      borderBottom: '2px solid transparent'
    },
    content: {
      flex: 1,
      overflow: 'auto',
      padding: '24px'
    },
    infoGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '16px',
      marginBottom: '24px'
    },
    infoCard: {
      padding: '16px',
      backgroundColor: '#f9fafb',
      borderRadius: '8px',
      border: '1px solid #e5e7eb'
    },
    infoLabel: {
      fontSize: '12px',
      fontWeight: '500',
      color: '#6b7280',
      textTransform: 'uppercase',
      marginBottom: '4px'
    },
    infoValue: {
      fontSize: '16px',
      fontWeight: '600',
      color: '#1f2937'
    },
    infoSubvalue: {
      fontSize: '12px',
      color: '#6b7280',
      marginTop: '2px'
    },
    section: {
      marginBottom: '32px'
    },
    sectionTitle: {
      fontSize: '18px',
      fontWeight: '600',
      color: '#1f2937',
      marginBottom: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    dataTypeCard: {
      backgroundColor: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      padding: '20px',
      marginBottom: '16px'
    },
    dataTypeHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '12px'
    },
    dataTypeTitle: {
      fontSize: '16px',
      fontWeight: '600',
      color: '#1f2937',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    dataTypeCount: {
      fontSize: '14px',
      fontWeight: '500',
      color: '#3b82f6',
      backgroundColor: '#dbeafe',
      padding: '4px 8px',
      borderRadius: '12px'
    },
    dataPreview: {
      backgroundColor: '#f8fafc',
      border: '1px solid #e2e8f0',
      borderRadius: '6px',
      padding: '12px',
      fontSize: '12px',
      fontFamily: 'Monaco, "Lucida Console", monospace',
      color: '#475569',
      maxHeight: '200px',
      overflow: 'auto',
      whiteSpace: 'pre-wrap'
    },
    loadingState: {
      textAlign: 'center',
      padding: '48px 24px',
      color: '#6b7280'
    },
    errorState: {
      backgroundColor: '#fef2f2',
      border: '1px solid #fecaca',
      borderRadius: '6px',
      padding: '16px',
      color: '#dc2626',
      marginBottom: '16px'
    },
    warningBox: {
      backgroundColor: '#fef3c7',
      border: '1px solid #fde68a',
      borderRadius: '6px',
      padding: '12px',
      marginBottom: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    warningText: {
      fontSize: '14px',
      color: '#92400e'
    },
    metadataTable: {
      width: '100%',
      borderCollapse: 'collapse',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      overflow: 'hidden'
    },
    metadataRow: {
      borderBottom: '1px solid #f3f4f6'
    },
    metadataLabel: {
      padding: '12px 16px',
      backgroundColor: '#f9fafb',
      fontWeight: '500',
      fontSize: '14px',
      color: '#374151',
      width: '200px',
      borderRight: '1px solid #e5e7eb'
    },
    metadataValue: {
      padding: '12px 16px',
      fontSize: '14px',
      color: '#1f2937'
    },
    compressionBar: {
      width: '100%',
      height: '8px',
      backgroundColor: '#f3f4f6',
      borderRadius: '4px',
      overflow: 'hidden',
      marginTop: '8px'
    },
    compressionFill: {
      height: '100%',
      backgroundColor: '#10b981',
      borderRadius: '4px'
    },
    treeItem: {
      border: '1px solid #e5e7eb',
      borderRadius: '6px',
      marginBottom: '8px',
      backgroundColor: 'white'
    },
    treeItemHeader: {
      display: 'flex',
      alignItems: 'center',
      padding: '12px 16px',
      cursor: 'pointer',
      transition: 'background-color 0.2s ease',
      borderRadius: '6px'
    },
    treeItemContent: {
      padding: '0 16px 16px 40px',
      borderTop: '1px solid #f3f4f6'
    },
    expandIcon: {
      marginRight: '8px',
      fontSize: '12px',
      transition: 'transform 0.2s ease',
      color: '#6b7280'
    },
    expandIconExpanded: {
      transform: 'rotate(90deg)'
    },
    hierarchyLevel1: {
      paddingLeft: '0px'
    },
    hierarchyLevel2: {
      paddingLeft: '20px'
    },
    hierarchyLevel3: {
      paddingLeft: '40px'
    },
    priceTag: {
      backgroundColor: '#dcfce7',
      color: '#166534',
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: '500',
      marginLeft: '8px'
    },
    serviceStatusActive: {
      color: '#166534',
      fontWeight: 'bold'
    },
    serviceStatusInactive: {
      color: '#6b7280',
      fontWeight: 'normal'
    },
    badge: {
      padding: '4px 8px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: '500'
    }
  };

  const renderOverview = () => (
    <div>
      <div style={styles.infoGrid}>
        <div style={styles.infoCard}>
          <div style={styles.infoLabel}>{t("adminTools.backup.details.changeDay")}</div>
          <div style={styles.infoValue}>{backupUtils.formatChangeDay(displayBackup.changeDay)}</div>
          <div style={styles.infoSubvalue}>{t("adminTools.backup.details.daysAgo", { count: backupUtils.getDaysAgo(displayBackup.changeDay) })}</div>
        </div>
        <div style={styles.infoCard}>
          <div style={styles.infoLabel}>{t("adminTools.backup.details.backupSize")}</div>
          <div style={styles.infoValue}>{backupUtils.formatFileSize(sizeInfo.compressedSize)}</div>
          <div style={styles.infoSubvalue}>
            {sizeInfo.compressionRatio > 0 ? backupUtils.formatCompressionRatio(sizeInfo.compressionRatio) : t("adminTools.backup.details.noCompressionData")}
          </div>
        </div>
        <div style={styles.infoCard}>
          <div style={styles.infoLabel}>{t("adminTools.backup.details.trigger")}</div>
          <div style={styles.infoValue}>{backupUtils.formatBackupTrigger(displayBackup.backupTrigger)}</div>
          <div style={styles.infoSubvalue}>
            {t("adminTools.backup.details.createdLabel", { date: displayBackup.createdAt ? backupUtils.formatDate(displayBackup.createdAt) : t("adminTools.backup.details.unknown") })}
          </div>
        </div>
        <div style={styles.infoCard}>
          <div style={styles.infoLabel}>{t("adminTools.backup.details.status")}</div>
          <div style={styles.infoValue}>
            {displayBackup.restorationInfo?.hasBeenRestored ? <><FontAwesomeIcon icon={faSync} /> {t("adminTools.backup.details.restored")}</> : <><FontAwesomeIcon icon={faCheckCircle} /> {t("adminTools.backup.details.available")}</>}
          </div>
          <div style={styles.infoSubvalue}>
            {displayBackup.restorationInfo?.hasBeenRestored && displayBackup.restorationInfo?.lastRestoredAt ?
              t("adminTools.backup.details.lastRestored", { date: backupUtils.formatDate(displayBackup.restorationInfo.lastRestoredAt) }) :
              t("adminTools.backup.details.readyForRestoration")
            }
          </div>
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}><FontAwesomeIcon icon={faChartBar} /> {t("adminTools.backup.details.documentSummary")}</h3>
        <div style={styles.infoGrid}>
          <div style={styles.infoCard}>
            <div style={styles.infoLabel}>{t("adminTools.backup.details.priceFixRecords")}</div>
            <div style={styles.infoValue}>{documentCounts.priceFixCount}</div>
            <div style={styles.infoSubvalue}>{t("adminTools.backup.details.servicePricingConfigs")}</div>
          </div>
          <div style={styles.infoCard}>
            <div style={styles.infoLabel}>{t("adminTools.backup.details.productCatalog")}</div>
            <div style={styles.infoValue}>{documentCounts.productCatalogCount}</div>
            <div style={styles.infoSubvalue}>{t("adminTools.backup.details.productFamiliesItems")}</div>
          </div>
          <div style={styles.infoCard}>
            <div style={styles.infoLabel}>{t("adminTools.backup.details.serviceConfigs")}</div>
            <div style={styles.infoValue}>{documentCounts.serviceConfigCount}</div>
            <div style={styles.infoSubvalue}>{t("adminTools.backup.details.serviceConfigTemplates")}</div>
          </div>
        </div>
      </div>

      {displayBackup.changeContext && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}><FontAwesomeIcon icon={faEdit} /> {t("adminTools.backup.details.changeInformation")}</h3>
          <div style={styles.dataTypeCard}>
            <table style={styles.metadataTable}>
              <tbody>
                <tr style={styles.metadataRow}>
                  <td style={styles.metadataLabel}>{t("adminTools.backup.details.description")}</td>
                  <td style={styles.metadataValue}>
                    {displayBackup.changeContext?.changeDescription || t("adminTools.backup.details.noDescriptionProvided")}
                  </td>
                </tr>
                <tr style={styles.metadataRow}>
                  <td style={styles.metadataLabel}>{t("adminTools.backup.details.areasChanged")}</td>
                  <td style={styles.metadataValue}>
                    {displayBackup.changeContext?.changedAreas?.join(', ') || t("adminTools.backup.details.notSpecified")}
                  </td>
                </tr>
                <tr style={styles.metadataRow}>
                  <td style={styles.metadataLabel}>{t("adminTools.backup.details.changeCount")}</td>
                  <td style={styles.metadataValue}>{displayBackup.changeContext?.changeCount || 1} {t("adminTools.backup.details.changesSuffix")}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}><FontAwesomeIcon icon={faHdd} /> {t("adminTools.backup.details.storageEfficiency")}</h3>
        <div style={styles.dataTypeCard}>
          <table style={styles.metadataTable}>
            <tbody>
              <tr style={styles.metadataRow}>
                <td style={styles.metadataLabel}>{t("adminTools.backup.details.originalSize")}</td>
                <td style={styles.metadataValue}>
                  {backupUtils.formatFileSize(sizeInfo.originalSize)}
                </td>
              </tr>
              <tr style={styles.metadataRow}>
                <td style={styles.metadataLabel}>{t("adminTools.backup.details.compressedSize")}</td>
                <td style={styles.metadataValue}>
                  {backupUtils.formatFileSize(sizeInfo.compressedSize)}
                  {sizeInfo.originalSize > 0 && (
                    <div style={styles.compressionBar}>
                      <div
                        style={{
                          ...styles.compressionFill,
                          width: `${(sizeInfo.compressedSize / sizeInfo.originalSize) * 100}%`
                        }}
                      />
                    </div>
                  )}
                </td>
              </tr>
              <tr style={styles.metadataRow}>
                <td style={styles.metadataLabel}>{t("adminTools.backup.details.spaceSaved")}</td>
                <td style={styles.metadataValue}>
                  {sizeInfo.originalSize > 0 ? (
                    <>
                      {backupUtils.formatFileSize(sizeInfo.originalSize - sizeInfo.compressedSize)} ({Math.round((1 - sizeInfo.compressionRatio) * 100)}%)
                    </>
                  ) : t("adminTools.backup.details.noSizeData")}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    if (snapshotLoading) {
      return (
        <div style={styles.loadingState}>
          <div>{t("adminTools.backup.details.loadingContent")}</div>
        </div>
      );
    }

    if (snapshotError) {
      return (
        <div style={styles.errorState}>
          <strong>{t("adminTools.backup.details.errorLoadingContent")}</strong> {snapshotError}
        </div>
      );
    }

    if (!snapshot) {
      return (
        <div style={styles.loadingState}>
          <div>{t("adminTools.backup.details.noContentPreview")}</div>
        </div>
      );
    }

    return (
      <div>
        <div style={styles.warningBox}>
          <FontAwesomeIcon icon={faExclamationTriangle} />
          <span style={styles.warningText}>
            {t("adminTools.backup.details.expandHint")}
          </span>
        </div>

        <div style={styles.section}>
          <div style={styles.dataTypeCard}>
            <div style={styles.dataTypeHeader}>
              <h4 style={styles.dataTypeTitle}>
                <FontAwesomeIcon icon={faMoneyBill} /> {t("adminTools.backup.details.pricingOverviewSummary")}
              </h4>
            </div>

            <div style={{ padding: '16px' }}>
              {snapshot.dataTypes?.productCatalog?.active && (
                <div style={{ marginBottom: '16px' }}>
                  {(() => {
                    const allProducts = snapshot.dataTypes.productCatalog.active.families?.flatMap(f => f.products || []) || [];
                    const pricedProducts = allProducts.filter(p => p.basePrice?.amount);
                    const totalProducts = allProducts.length;

                    return (
                      <div style={{
                        backgroundColor: pricedProducts.length > 0 ? '#f0fdf4' : '#fef3c7',
                        border: `2px solid ${pricedProducts.length > 0 ? '#10b981' : '#f59e0b'}`,
                        borderRadius: '8px',
                        padding: '16px'
                      }}>
                        <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px', color: '#374151' }}>
                          <FontAwesomeIcon icon={faBox} /> {t("adminTools.backup.details.productCatalogPricing")}
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: pricedProducts.length > 0 ? '#166534' : '#92400e' }}>
                          {pricedProducts.length > 0 ? (
                            <><FontAwesomeIcon icon={faCheckCircle} /> {t("adminTools.backup.details.productsPriced", { priced: pricedProducts.length, total: totalProducts })}</>
                          ) : (
                            <><FontAwesomeIcon icon={faExclamationTriangle} /> {t("adminTools.backup.details.noProductPrices", { total: totalProducts })}</>
                          )}
                        </div>
                        {pricedProducts.length > 0 && (
                          <div style={{ marginTop: '8px', fontSize: '14px', color: '#6b7280' }}>
                            {t("adminTools.backup.details.productsReady")}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              <div style={{
                backgroundColor: (() => {
                  const servicesPricingBreakdown = snapshot.dataTypes?.serviceConfigs?.documents?.map(config => {
                    const hasStandardPricing = config.pricing && Object.keys(config.pricing).length > 0 &&
                      Object.values(config.pricing).some(tier => tier?.basePrice?.amount || tier?.price);
                    const servicePricing = extractServicePricing(config, config.serviceId);
                    const hasServicePricing = servicePricing && servicePricing.length > 0;
                    return hasStandardPricing || hasServicePricing;
                  }) || [];

                  const servicesWithAnyPricing = servicesPricingBreakdown.filter(Boolean);
                  const pricingFixCount = snapshot.dataTypes?.priceFix?.count || 0;
                  const hasServicePricing = servicesWithAnyPricing.length > 0 || pricingFixCount > 0;
                  return hasServicePricing ? '#f0fdf4' : '#fef3c7';
                })(),
                border: `2px solid ${(() => {
                  const servicesPricingBreakdown = snapshot.dataTypes?.serviceConfigs?.documents?.map(config => {
                    const hasStandardPricing = config.pricing && Object.keys(config.pricing).length > 0 &&
                      Object.values(config.pricing).some(tier => tier?.basePrice?.amount || tier?.price);
                    const servicePricing = extractServicePricing(config, config.serviceId);
                    const hasServicePricing = servicePricing && servicePricing.length > 0;
                    return hasStandardPricing || hasServicePricing;
                  }) || [];

                  const servicesWithAnyPricing = servicesPricingBreakdown.filter(Boolean);
                  const pricingFixCount = snapshot.dataTypes?.priceFix?.count || 0;
                  const hasServicePricing = servicesWithAnyPricing.length > 0 || pricingFixCount > 0;
                  return hasServicePricing ? '#10b981' : '#f59e0b';
                })()}`,
                borderRadius: '8px',
                padding: '16px'
              }}>
                <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px', color: '#374151' }}>
                  <FontAwesomeIcon icon={faWrench} /> {t("adminTools.backup.details.servicePricingConfiguration")}
                </div>
                <div style={{
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: (() => {
                    const servicesPricingBreakdown = snapshot.dataTypes?.serviceConfigs?.documents?.map(config => {
                      const hasStandardPricing = config.pricing && Object.keys(config.pricing).length > 0 &&
                        Object.values(config.pricing).some(tier => tier?.basePrice?.amount || tier?.price);
                      const servicePricing = extractServicePricing(config, config.serviceId);
                      const hasServicePricing = servicePricing && servicePricing.length > 0;
                      return hasStandardPricing || hasServicePricing;
                    }) || [];

                    const servicesWithAnyPricing = servicesPricingBreakdown.filter(Boolean);
                    const pricingFixCount = snapshot.dataTypes?.priceFix?.count || 0;
                    const hasServicePricing = servicesWithAnyPricing.length > 0 || pricingFixCount > 0;
                    return hasServicePricing ? '#166534' : '#92400e';
                  })()
                }}>
                  {(() => {
                    const servicesPricingBreakdown = snapshot.dataTypes?.serviceConfigs?.documents?.map(config => {
                      const hasStandardPricing = config.pricing && Object.keys(config.pricing).length > 0 &&
                        Object.values(config.pricing).some(tier => tier?.basePrice?.amount || tier?.price);
                      const servicePricing = extractServicePricing(config, config.serviceId);
                      const hasServicePricing = servicePricing && servicePricing.length > 0;

                      return {
                        serviceId: config.serviceId,
                        hasStandardPricing,
                        hasServicePricing,
                        serviceRateCount: servicePricing?.length || 0,
                        standardTierCount: hasStandardPricing ? Object.keys(config.pricing).length : 0,
                        hasAnyPricing: hasStandardPricing || hasServicePricing
                      };
                    }) || [];

                    const servicesWithAnyPricing = servicesPricingBreakdown.filter(s => s.hasAnyPricing);
                    const pricingFixCount = snapshot.dataTypes?.priceFix?.count || 0;
                    const totalServices = snapshot.dataTypes?.serviceConfigs?.count || 0;

                    if (servicesWithAnyPricing.length > 0 || pricingFixCount > 0) { 
                      return (
                        <div>
                          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#166534', marginBottom: '8px' }}>
                            <FontAwesomeIcon icon={faCheckCircle} /> {t("adminTools.backup.details.servicesHavePricing", { count: servicesWithAnyPricing.length, extra: pricingFixCount > 0 ? t("adminTools.backup.details.priceFixServicesExtra", { count: pricingFixCount }) : '' })}
                          </div>
                          <div style={{ fontSize: '14px', color: '#374151' }}>
                            <strong>{t("adminTools.backup.details.servicePricingDetails")}</strong>
                            <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                              {servicesWithAnyPricing.map(service => (
                                <li key={service.serviceId} style={{ marginBottom: '4px' }}>
                                  <strong>{service.serviceId}</strong>:
                                  {service.hasServicePricing && ` ${service.serviceRateCount !== 1 ? t("adminTools.backup.details.rateOther", { count: service.serviceRateCount }) : t("adminTools.backup.details.rateOne", { count: service.serviceRateCount })}`}
                                  {service.hasServicePricing && service.hasStandardPricing && ' + '}
                                  {service.hasStandardPricing && ` ${service.standardTierCount !== 1 ? t("adminTools.backup.details.tierOther", { count: service.standardTierCount }) : t("adminTools.backup.details.tierOne", { count: service.standardTierCount })}`}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      );
                    } else {
                      return (
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#92400e' }}>
                          <FontAwesomeIcon icon={faExclamationTriangle} /> {t("adminTools.backup.details.noServicePricing", { count: totalServices })}
                        </div>
                      );
                    }
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {snapshot.dataTypes?.productCatalog && (
          <div style={styles.section}>
            <div style={styles.dataTypeCard}>
              <div style={styles.dataTypeHeader}>
                <h4 style={styles.dataTypeTitle}>
                  <FontAwesomeIcon icon={faBox} /> {t("adminTools.backup.details.productCatalogHierarchy")}
                </h4>
                <span style={styles.dataTypeCount}>
                  {snapshot.dataTypes.productCatalog.totalCount} {t("adminTools.backup.details.catalogs")}
                </span>
              </div>

              {snapshot.dataTypes.productCatalog.active ? (
                <div style={styles.hierarchyLevel1}>
                  <div style={styles.treeItem}>
                    <div
                      style={{
                        ...styles.treeItemHeader,
                        backgroundColor: expandedItems.has('catalog-main') ? '#f8fafc' : 'transparent'
                      }}
                      onClick={() => toggleExpanded('catalog-main')}
                    >
                      <span style={{
                        ...styles.expandIcon,
                        ...(expandedItems.has('catalog-main') ? styles.expandIconExpanded : {})
                      }}>
                        <FontAwesomeIcon icon={faCaretRight} />
                      </span>
                      <strong><FontAwesomeIcon icon={faClipboard} /> {snapshot.dataTypes.productCatalog.active.version}</strong>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '12px' }}>
                        <span style={{...styles.badge, backgroundColor: '#dbeafe', color: '#1e40af'}}>
                          {snapshot.dataTypes.productCatalog.active.families?.length || 0} {t("adminTools.backup.details.families")}
                        </span>
                        {(() => {
                          const allProducts = snapshot.dataTypes.productCatalog.active.families?.flatMap(f => f.products || []) || [];
                          const pricedProducts = allProducts.filter(p => p.basePrice?.amount);
                          const totalProducts = allProducts.length;

                          return pricedProducts.length > 0 ? (
                            <span style={{
                              backgroundColor: '#166534',
                              color: 'white',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: '500'
                            }}>
                              <FontAwesomeIcon icon={faMoneyBill} /> {t("adminTools.backup.details.productsPricedBadge", { priced: pricedProducts.length, total: totalProducts })}
                            </span>
                          ) : (
                            <span style={{
                              backgroundColor: '#fef3c7',
                              color: '#92400e',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: '500'
                            }}>
                              <FontAwesomeIcon icon={faExclamationTriangle} /> {t("adminTools.backup.details.noPricesSet")}
                            </span>
                          );
                        })()}
                      </div>
                    </div>

                    {expandedItems.has('catalog-main') && (
                      <div style={styles.treeItemContent}>
                        <div style={styles.hierarchyLevel2}>
                          <div style={{ marginBottom: '16px', fontSize: '14px', color: '#374151' }}>
                            <div><strong>{t("adminTools.backup.details.catalogId")}</strong> {snapshot.dataTypes.productCatalog.active._id}</div>
                            <div><strong>{t("adminTools.backup.details.version")}</strong> {snapshot.dataTypes.productCatalog.active.version}</div>
                            <div><strong>{t("adminTools.backup.details.lastUpdated")}</strong> {new Date(snapshot.dataTypes.productCatalog.active.lastUpdated).toLocaleDateString()}</div>
                          </div>

                          {snapshot.dataTypes.productCatalog.active.families?.map((family, familyIndex) => (
                            <div key={familyIndex} style={styles.treeItem}>
                              <div
                                style={{
                                  ...styles.treeItemHeader,
                                  backgroundColor: expandedItems.has(`family-${familyIndex}`) ? '#f0f9ff' : 'transparent'
                                }}
                                onClick={() => toggleExpanded(`family-${familyIndex}`)}
                              >
                                <span style={{
                                  ...styles.expandIcon,
                                  ...(expandedItems.has(`family-${familyIndex}`) ? styles.expandIconExpanded : {})
                                }}>
                                  <FontAwesomeIcon icon={faCaretRight} />
                                </span>
                                <strong><FontAwesomeIcon icon={faFolder} /> {family.familyName || family.name || t("adminTools.backup.details.familyFallback", { num: familyIndex + 1 })}</strong>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '12px' }}>
                                  <span style={{...styles.badge, backgroundColor: '#fef3c7', color: '#92400e'}}>
                                    {t("adminTools.backup.details.productsBadge", { count: family.products?.length || 0 })}
                                  </span>
                                  {family.products && family.products.some(p => p.basePrice?.amount) && (
                                    <span style={{
                                      backgroundColor: '#166534',
                                      color: 'white',
                                      padding: '4px 8px',
                                      borderRadius: '4px',
                                      fontSize: '12px',
                                      fontWeight: '500'
                                    }}>
                                      <FontAwesomeIcon icon={faMoneyBill} /> {t("adminTools.backup.details.pricedItems", { count: family.products.filter(p => p.basePrice?.amount).length })}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {expandedItems.has(`family-${familyIndex}`) && (
                                <div style={styles.treeItemContent}>
                                  <div style={styles.hierarchyLevel3}>
                                    {family.description && (
                                      <div style={{ marginBottom: '12px', fontSize: '14px', color: '#6b7280' }}>
                                        <strong>{t("adminTools.backup.details.description")}:</strong> {family.description}
                                      </div>
                                    )}

                                    {family.products?.map((product, productIndex) => (
                                      <div key={productIndex} style={styles.treeItem}>
                                        <div
                                          style={{
                                            ...styles.treeItemHeader,
                                            backgroundColor: expandedItems.has(`product-${familyIndex}-${productIndex}`) ? '#f0fdf4' : 'transparent'
                                          }}
                                          onClick={() => toggleExpanded(`product-${familyIndex}-${productIndex}`)}
                                        >
                                          <span style={{
                                            ...styles.expandIcon,
                                            ...(expandedItems.has(`product-${familyIndex}-${productIndex}`) ? styles.expandIconExpanded : {})
                                          }}>
                                            <FontAwesomeIcon icon={faCaretRight} />
                                          </span>
                                          <div style={{ display: 'flex', alignItems: 'center', flex: 1, justifyContent: 'space-between' }}>
                                            <strong><FontAwesomeIcon icon={faBox} /> {product.name || product.productName || t("adminTools.backup.details.productFallback", { num: productIndex + 1 })}</strong>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                              {product.basePrice?.amount ? (
                                                <span style={{
                                                  ...styles.priceTag,
                                                  fontSize: '14px',
                                                  fontWeight: 'bold',
                                                  backgroundColor: '#166534',
                                                  color: 'white'
                                                }}>
                                                  <FontAwesomeIcon icon={faMoneyBill} /> ${product.basePrice.amount}/{product.basePrice.uom || t("adminTools.backup.details.perUnit")}
                                                </span>
                                              ) : (
                                                <span style={{
                                                  backgroundColor: '#fef3c7',
                                                  color: '#92400e',
                                                  padding: '4px 8px',
                                                  borderRadius: '4px',
                                                  fontSize: '12px',
                                                  fontWeight: '500'
                                                }}>
                                                  {t("adminTools.backup.details.noPriceSet")}
                                                </span>                                              )}
                                            </div>
                                          </div>
                                        </div>

                                        {expandedItems.has(`product-${familyIndex}-${productIndex}`) && (
                                          <div style={styles.treeItemContent}>
                                            {product.basePrice?.amount ? (
                                              <div style={{
                                                backgroundColor: '#166534',
                                                color: 'white',
                                                padding: '16px',
                                                borderRadius: '8px',
                                                marginBottom: '16px',
                                                textAlign: 'center',
                                                fontSize: '20px',
                                                fontWeight: 'bold'
                                              }}>
                                                <FontAwesomeIcon icon={faMoneyBill} /> {t("adminTools.backup.details.priceLabel", { amount: product.basePrice.amount, currency: product.basePrice.currency || 'USD' })}
                                                <div style={{ fontSize: '14px', opacity: 0.9, marginTop: '4px' }}>
                                                  {t("adminTools.backup.details.perUnitLabel", { uom: product.basePrice.uom || t("adminTools.backup.details.perUnit") })}
                                                </div>
                                              </div>
                                            ) : (
                                              <div style={{
                                                backgroundColor: '#fef3c7',
                                                color: '#92400e',
                                                padding: '16px',
                                                borderRadius: '8px',
                                                marginBottom: '16px',
                                                textAlign: 'center',
                                                fontSize: '16px',
                                                fontWeight: 'bold',
                                                border: '2px dashed #f59e0b'
                                              }}>
                                                <FontAwesomeIcon icon={faExclamationTriangle} /> {t("adminTools.backup.details.noPriceConfigured")}
                                              </div>
                                            )}

                                            <div style={{ fontSize: '14px', color: '#374151' }}>
                                              {product.description && (
                                                <div style={{ marginBottom: '8px' }}>
                                                  <strong>{t("adminTools.backup.details.description")}:</strong> {product.description}
                                                </div>
                                              )}
                                              {product.key && (
                                                <div style={{ marginBottom: '8px' }}>
                                                  <strong>{t("adminTools.backup.details.productKey")}</strong> {product.key}
                                                </div>
                                              )}
                                              {product.kind && (
                                                <div style={{ marginBottom: '8px' }}>
                                                  <strong>{t("adminTools.backup.details.productKind")}</strong> {product.kind}
                                                </div>
                                              )}
                                              {product.familyKey && (
                                                <div style={{ marginBottom: '8px' }}>
                                                  <strong>{t("adminTools.backup.details.family")}</strong> {product.familyKey}
                                                </div>
                                              )}
                                              {product.frequency && (
                                                <div style={{ marginBottom: '8px' }}>
                                                  <strong>{t("adminTools.backup.details.frequency")}</strong> {product.frequency}
                                                </div>
                                              )}
                                              {product.basePrice && (
                                                <div style={{ marginBottom: '8px' }}>
                                                  <strong>{t("adminTools.backup.details.pricingDetails")}</strong>
                                                  <div style={{ marginTop: '4px', fontSize: '13px', color: '#6b7280' }}>
                                                    • {t("adminTools.backup.details.currency")} {product.basePrice.currency || 'USD'}
                                                    • {t("adminTools.backup.details.unitOfMeasure")} {product.basePrice.uom || t("adminTools.backup.details.perUnit")}
                                                    {product.basePrice.amount && `• ${t("adminTools.backup.details.baseAmount", { amount: product.basePrice.amount })}`}
                                                  </div>
                                                </div>
                                              )}
                                              <div style={{ marginBottom: '8px' }}>
                                                <strong>{t("adminTools.backup.details.adminDisplay")}</strong> {product.displayByAdmin ? t("adminTools.backup.details.yes") : t("adminTools.backup.details.no")}
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                  {t("adminTools.backup.details.noActiveCatalog")}
                </div>
              )}
            </div>
          </div>
        )}

        {snapshot.dataTypes?.serviceConfigs && (
          <div style={styles.section}>
            <div style={styles.dataTypeCard}>
              <div style={styles.dataTypeHeader}>
                <h4 style={styles.dataTypeTitle}>
                  <FontAwesomeIcon icon={faCog} /> {t("adminTools.backup.details.serviceConfigHierarchy")}
                </h4>
                <span style={styles.dataTypeCount}>
                  {snapshot.dataTypes.serviceConfigs.count} {t("adminTools.backup.details.servicesCount")}
                </span>
              </div>

              <div style={{ marginBottom: '16px', fontSize: '14px', color: '#374151' }}>
                <strong>{t("adminTools.backup.details.activeServices")}</strong> {t("adminTools.backup.details.activeServicesValue", { active: snapshot.dataTypes.serviceConfigs.activeCount, total: snapshot.dataTypes.serviceConfigs.count })}
              </div>

              {snapshot.dataTypes.serviceConfigs.documents && snapshot.dataTypes.serviceConfigs.documents.length > 0 ? (
                <div style={styles.hierarchyLevel1}>
                  {snapshot.dataTypes.serviceConfigs.documents.map((config, configIndex) => (
                    <div key={configIndex} style={styles.treeItem}>
                      <div
                        style={{
                          ...styles.treeItemHeader,
                          backgroundColor: expandedItems.has(`service-${configIndex}`) ? '#f8fafc' : 'transparent',
                          borderLeft: `4px solid ${config.isActive ? '#10b981' : '#6b7280'}`
                        }}
                        onClick={() => toggleExpanded(`service-${configIndex}`)}
                      >
                        <span style={{
                          ...styles.expandIcon,
                          ...(expandedItems.has(`service-${configIndex}`) ? styles.expandIconExpanded : {})
                        }}>
                          <FontAwesomeIcon icon={faCaretRight} />
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                          <strong style={config.isActive ? styles.serviceStatusActive : styles.serviceStatusInactive}>
                            <FontAwesomeIcon icon={faWrench} /> {config.serviceId}
                          </strong>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '12px' }}>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: '500',
                              backgroundColor: config.isActive ? '#dcfce7' : '#f3f4f6',
                              color: config.isActive ? '#166534' : '#6b7280'
                            }}>
                              {config.isActive ? t("adminTools.backup.details.active") : t("adminTools.backup.details.inactive")}
                            </span>
                            {(() => {
                              const servicePricing = extractServicePricing(config, config.serviceId);
                              const hasStandardPricing = config.pricing && Object.keys(config.pricing).length > 0;
                              const hasServicePricing = servicePricing && servicePricing.length > 0;

                              if (hasServicePricing || hasStandardPricing) {
                                return (
                                  <span style={{
                                    backgroundColor: '#166534',
                                    color: 'white',
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    fontSize: '12px',
                                    fontWeight: '500'
                                  }}>
                                    <FontAwesomeIcon icon={faMoneyBill} /> {hasServicePricing ? (servicePricing.length !== 1 ? t("adminTools.backup.details.rateOther", { count: servicePricing.length }) : t("adminTools.backup.details.rateOne", { count: servicePricing.length })) : ''}{hasServicePricing && hasStandardPricing ? ' + ' : ''}{hasStandardPricing ? (Object.keys(config.pricing).length !== 1 ? t("adminTools.backup.details.tierOther", { count: Object.keys(config.pricing).length }) : t("adminTools.backup.details.tierOne", { count: Object.keys(config.pricing).length })) : ''}
                                  </span>
                                );
                              }
                              return null;
                            })()}
                          </div>
                          <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#6b7280' }}>
                            {config.version || t("adminTools.backup.details.noVersion")}
                          </span>
                        </div>
                      </div>

                      {expandedItems.has(`service-${configIndex}`) && (
                        <div style={styles.treeItemContent}>
                          <div style={styles.hierarchyLevel2}>
                            <div style={{ marginBottom: '16px', fontSize: '14px', color: '#374151' }}>
                              {config.description && (
                                <div style={{ marginBottom: '8px' }}>
                                  <strong>{t("adminTools.backup.details.description")}:</strong> {config.description}
                                </div>
                              )}
                              {config.category && (
                                <div style={{ marginBottom: '8px' }}>
                                  <strong>{t("adminTools.backup.details.category")}</strong> {config.category}
                                </div>
                              )}
                              {config.lastUpdated && (
                                <div style={{ marginBottom: '8px' }}>
                                  <strong>{t("adminTools.backup.details.lastUpdated")}</strong> {new Date(config.lastUpdated).toLocaleDateString()}
                                </div>
                              )}
                            </div>

                            {config.settings && Object.keys(config.settings).length > 0 && (
                              <div style={styles.treeItem}>
                                <div
                                  style={{
                                    ...styles.treeItemHeader,
                                    backgroundColor: expandedItems.has(`settings-${configIndex}`) ? '#f0f9ff' : 'transparent'
                                  }}
                                  onClick={() => toggleExpanded(`settings-${configIndex}`)}
                                >
                                  <span style={{
                                    ...styles.expandIcon,
                                    ...(expandedItems.has(`settings-${configIndex}`) ? styles.expandIconExpanded : {})
                                  }}>
                                    <FontAwesomeIcon icon={faCaretRight} />
                                  </span>
                                  <strong><FontAwesomeIcon icon={faCog} /> {t("adminTools.backup.details.configurationSettings")}</strong>
                                  <span style={{...styles.badge, backgroundColor: '#e0e7ff', color: '#3730a3', marginLeft: '12px'}}>
                                    {t("adminTools.backup.details.settingsBadge", { count: Object.keys(config.settings).length })}
                                  </span>
                                </div>

                                {expandedItems.has(`settings-${configIndex}`) && (
                                  <div style={styles.treeItemContent}>
                                    <div style={styles.hierarchyLevel3}>
                                      {Object.entries(config.settings).map(([key, value]) => (
                                        <div key={key} style={{
                                          padding: '8px 12px',
                                          margin: '4px 0',
                                          backgroundColor: '#f8fafc',
                                          border: '1px solid #e2e8f0',
                                          borderRadius: '4px',
                                          fontSize: '13px'
                                        }}>
                                          <strong>{key}:</strong> {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {(() => {
                              const servicePricing = extractServicePricing(config, config.serviceId);
                              const hasStandardPricing = config.pricing && Object.keys(config.pricing).length > 0;
                              const hasServicePricing = servicePricing && servicePricing.length > 0;

                              return (hasStandardPricing || hasServicePricing) && (
                                <div style={styles.treeItem}>
                                  <div
                                    style={{
                                      ...styles.treeItemHeader,
                                      backgroundColor: expandedItems.has(`pricing-${configIndex}`) ? '#f0fdf4' : 'transparent'
                                    }}
                                    onClick={() => toggleExpanded(`pricing-${configIndex}`)}
                                  >
                                    <span style={{
                                      ...styles.expandIcon,
                                      ...(expandedItems.has(`pricing-${configIndex}`) ? styles.expandIconExpanded : {})
                                    }}>
                                      <FontAwesomeIcon icon={faCaretRight} />
                                    </span>
                                    <strong><FontAwesomeIcon icon={faMoneyBill} /> {t("adminTools.backup.details.servicePricingDetailsTitle")}</strong>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '12px' }}>
                                      {hasServicePricing && (
                                        <span style={{...styles.badge, backgroundColor: '#dcfce7', color: '#166534'}}>
                                          {servicePricing.length !== 1 ? t("adminTools.backup.details.rateOther", { count: servicePricing.length }) : t("adminTools.backup.details.rateOne", { count: servicePricing.length })}
                                        </span>
                                      )}
                                      {hasStandardPricing && (
                                        <span style={{...styles.badge, backgroundColor: '#e0e7ff', color: '#3730a3'}}>
                                          {Object.keys(config.pricing).length !== 1 ? t("adminTools.backup.details.tierOther", { count: Object.keys(config.pricing).length }) : t("adminTools.backup.details.tierOne", { count: Object.keys(config.pricing).length })}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {expandedItems.has(`pricing-${configIndex}`) && (
                                    <div style={styles.treeItemContent}>
                                      <div style={styles.hierarchyLevel3}>
                                        {hasServicePricing && (
                                          <div style={{ marginBottom: '20px' }}>
                                            <h4 style={{
                                              fontSize: '16px',
                                              fontWeight: '600',
                                              color: '#166534',
                                              marginBottom: '12px',
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '8px'
                                            }}>
                                              <FontAwesomeIcon icon={faTags} /> {t("adminTools.backup.details.currentServiceRates")}
                                            </h4>
                                            {(() => {
                                              const groupedPricing = servicePricing.reduce((groups, item) => {
                                                const category = item.category || 'General Pricing';
                                                if (!groups[category]) groups[category] = [];
                                                groups[category].push(item);
                                                return groups;
                                              }, {} as Record<string, typeof servicePricing>);

                                              return Object.entries(groupedPricing).map(([category, items]) => (
                                                <div key={category} style={{ marginBottom: '16px' }}>
                                                  <div style={{
                                                    fontSize: '14px',
                                                    fontWeight: '500',
                                                    color: '#374151',
                                                    marginBottom: '8px',
                                                    borderBottom: '1px solid #e5e7eb',
                                                    paddingBottom: '4px'
                                                  }}>
                                                    {category}
                                                  </div>
                                                  {items.map((item, index) => (
                                                    <div key={index} style={{
                                                      padding: '16px',
                                                      margin: '6px 0',
                                                      backgroundColor: '#166534',
                                                      color: 'white',
                                                      borderRadius: '8px',
                                                      display: 'flex',
                                                      justifyContent: 'space-between',
                                                      alignItems: 'center',
                                                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                                                    }}>
                                                      <div style={{ flex: 1 }}>
                                                        <div style={{ fontSize: '15px', fontWeight: 'bold' }}>
                                                          {item.name}
                                                        </div>
                                                        {item.unit && (
                                                          <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '2px' }}>
                                                            {item.unit}
                                                          </div>
                                                        )}
                                                        {item.description && (
                                                          <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '4px' }}>
                                                            {item.description}
                                                          </div>
                                                        )}
                                                      </div>
                                                      <div style={{
                                                        fontSize: '20px',
                                                        fontWeight: 'bold',
                                                        textAlign: 'right',
                                                        marginLeft: '16px'
                                                      }}>
                                                        <FontAwesomeIcon icon={faMoneyBill} /> ${typeof item.price === 'number' ? item.price.toFixed(2) : item.price}
                                                      </div>
                                                    </div>
                                                  ))}
                                                </div>
                                              ));
                                            })()}
                                          </div>
                                        )}

                                        {hasStandardPricing && (
                                          <div>
                                            <h4 style={{
                                              fontSize: '16px',
                                              fontWeight: '600',
                                              color: '#3730a3',
                                              marginBottom: '12px',
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '8px'
                                            }}>
                                              <FontAwesomeIcon icon={faClipboard} /> {t("adminTools.backup.details.pricingTiers")}
                                            </h4>
                                            {Object.entries(config.pricing).map(([tierKey, tierData]) => (
                                              <div key={tierKey} style={{
                                                padding: '16px',
                                                margin: '6px 0',
                                                backgroundColor: '#3730a3',
                                                color: 'white',
                                                borderRadius: '8px',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                                              }}>
                                                <div>
                                                  <div style={{ fontSize: '15px', fontWeight: 'bold' }}>
                                                    {t("adminTools.backup.details.tierName", { name: tierData?.name || tierKey })}
                                                  </div>
                                                  <div style={{ fontSize: '12px', opacity: 0.9 }}>
                                                    {tierData?.basePrice?.uom ? t("adminTools.backup.details.perUnitLabel", { uom: tierData.basePrice.uom }) : t("adminTools.backup.details.perServiceCall")}
                                                  </div>
                                                  {tierData?.description && (
                                                    <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '2px' }}>
                                                      {tierData.description}
                                                    </div>
                                                  )}
                                                </div>
                                                <div style={{
                                                  fontSize: '20px',
                                                  fontWeight: 'bold'
                                                }}>
                                                  <FontAwesomeIcon icon={faMoneyBill} /> ${tierData?.basePrice?.amount || tierData?.price || 'N/A'}
                                                  {tierData?.basePrice?.currency && tierData.basePrice.currency !== 'USD' && (
                                                    <span style={{ fontSize: '14px', marginLeft: '4px' }}>
                                                      {tierData.basePrice.currency}
                                                    </span>
                                                  )}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        )}

                                        {!hasServicePricing && !hasStandardPricing && (
                                          <div style={{
                                            backgroundColor: '#fef3c7',
                                            border: '2px dashed #f59e0b',
                                            borderRadius: '8px',
                                            padding: '20px',
                                            textAlign: 'center',
                                            color: '#92400e',
                                            fontWeight: 'bold'
                                          }}>
                                            <FontAwesomeIcon icon={faExclamationTriangle} /> {t("adminTools.backup.details.noPricingForService")}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                  {t("adminTools.backup.details.noServiceConfigDetails")}
                </div>
              )}
            </div>
          </div>
        )}

        {snapshot.dataTypes?.priceFix && snapshot.dataTypes.priceFix.documents && snapshot.dataTypes.priceFix.documents.length > 0 && (
          <div style={styles.section}>
            <div style={styles.dataTypeCard}>
              <div style={styles.dataTypeHeader}>
                <h4 style={styles.dataTypeTitle}>
                  <FontAwesomeIcon icon={faMoneyBill} /> {t("adminTools.backup.details.servicePricingInformation")}
                </h4>
                <span style={styles.dataTypeCount}>
                  {snapshot.dataTypes.priceFix.count} {t("adminTools.backup.details.pricingRecords")}
                </span>
              </div>

              <div style={styles.hierarchyLevel1}>
                {snapshot.dataTypes.priceFix.documents.map((pricing, pricingIndex) => (
                  <div key={pricingIndex} style={styles.treeItem}>
                    <div
                      style={{
                        ...styles.treeItemHeader,
                        backgroundColor: expandedItems.has(`pricing-${pricingIndex}`) ? '#f0fdf4' : 'transparent'
                      }}
                      onClick={() => toggleExpanded(`pricing-${pricingIndex}`)}
                    >
                      <span style={{
                        ...styles.expandIcon,
                        ...(expandedItems.has(`pricing-${pricingIndex}`) ? styles.expandIconExpanded : {})
                      }}>
                        <FontAwesomeIcon icon={faCaretRight} />
                      </span>
                      <strong><FontAwesomeIcon icon={faMoneyBill} /> {pricing.serviceId || t("adminTools.backup.details.unknownService")}</strong>
                      {pricing.pricing && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '12px' }}>
                          <span style={{...styles.badge, backgroundColor: '#dcfce7', color: '#166534'}}>
                            {t("adminTools.backup.details.pricingTiersBadge", { count: Object.keys(pricing.pricing).length })}
                          </span>
                          {(() => {
                            const hasValidPricing = Object.values(pricing.pricing).some(tier =>
                              tier?.basePrice?.amount || tier?.price
                            );
                            return hasValidPricing ? (
                              <span style={{
                                backgroundColor: '#166534',
                                color: 'white',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: '500'
                              }}>
                                <FontAwesomeIcon icon={faMoneyBill} /> {t("adminTools.backup.details.pricesConfigured")}
                              </span>
                            ) : (
                              <span style={{
                                backgroundColor: '#fef3c7',
                                color: '#92400e',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: '500'
                              }}>
                                <FontAwesomeIcon icon={faExclamationTriangle} /> {t("adminTools.backup.details.noPricesSet")}
                              </span>
                            );
                          })()}
                        </div>
                      )}
                    </div>

                    {expandedItems.has(`pricing-${pricingIndex}`) && (
                      <div style={styles.treeItemContent}>
                        {pricing.pricing && (
                          <div style={styles.hierarchyLevel2}>
                            {Object.entries(pricing.pricing).map(([tierKey, tierData]) => (
                              <div key={tierKey} style={{
                                padding: '20px',
                                margin: '8px 0',
                                backgroundColor: '#166534',
                                color: 'white',
                                borderRadius: '8px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                              }}>
                                <div>
                                  <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                                    {t("adminTools.backup.details.pricingTierName", { name: tierData?.name || tierKey })}
                                  </div>
                                  <div style={{ fontSize: '14px', opacity: 0.9 }}>
                                    {t("adminTools.backup.details.serviceLabel", { serviceId: pricing.serviceId })}
                                  </div>
                                  {tierData?.basePrice?.uom && (
                                    <div style={{ fontSize: '12px', opacity: 0.8 }}>
                                      {t("adminTools.backup.details.perUnitLabel", { uom: tierData.basePrice.uom })}
                                    </div>
                                  )}
                                  {tierData?.description && (
                                    <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>
                                      {tierData.description}
                                    </div>
                                  )}
                                </div>
                                <div style={{
                                  fontSize: '28px',
                                  fontWeight: 'bold'
                                }}>
                                  <FontAwesomeIcon icon={faMoneyBill} /> ${tierData?.basePrice?.amount || tierData?.price || 'N/A'}
                                  {tierData?.basePrice?.currency && tierData.basePrice.currency !== 'USD' && (
                                    <div style={{ fontSize: '14px', marginTop: '4px' }}>
                                      {tierData.basePrice.currency}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderMetadata = () => (
    <div>
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}><FontAwesomeIcon icon={faWrench} /> {t("adminTools.backup.details.technicalMetadata")}</h3>
        <div style={styles.dataTypeCard}>
          <table style={styles.metadataTable}>
            <tbody>
              <tr style={styles.metadataRow}>
                <td style={styles.metadataLabel}>{t("adminTools.backup.details.backupId")}</td>
                <td style={styles.metadataValue}>{displayBackup.changeDayId}</td>
              </tr>
              <tr style={styles.metadataRow}>
                <td style={styles.metadataLabel}>{t("adminTools.backup.details.changeDay")}</td>
                <td style={styles.metadataValue}>{displayBackup.changeDay}</td>
              </tr>
              <tr style={styles.metadataRow}>
                <td style={styles.metadataLabel}>{t("adminTools.backup.details.firstChangeTimestamp")}</td>
                <td style={styles.metadataValue}>
                  {displayBackup.firstChangeTimestamp ? backupUtils.formatDate(displayBackup.firstChangeTimestamp) : t("adminTools.backup.details.unknown")}
                </td>
              </tr>
              <tr style={styles.metadataRow}>
                <td style={styles.metadataLabel}>{t("adminTools.backup.details.backupCreated")}</td>
                <td style={styles.metadataValue}>
                  {displayBackup.createdAt ? backupUtils.formatDate(displayBackup.createdAt) : t("adminTools.backup.details.unknown")}
                </td>
              </tr>
              <tr style={styles.metadataRow}>
                <td style={styles.metadataLabel}>{t("adminTools.backup.details.lastModified")}</td>
                <td style={styles.metadataValue}>
                  {displayBackup.updatedAt ? backupUtils.formatDate(displayBackup.updatedAt) : t("adminTools.backup.details.unknown")}
                </td>
              </tr>
              <tr style={styles.metadataRow}>
                <td style={styles.metadataLabel}>{t("adminTools.backup.details.compressionRatio")}</td>
                <td style={styles.metadataValue}>
                  {sizeInfo.compressionRatio > 0 ? sizeInfo.compressionRatio.toFixed(3) : 'N/A'}
                </td>
              </tr>
              <tr style={styles.metadataRow}>
                <td style={styles.metadataLabel}>{t("adminTools.backup.details.dataTypesIncluded")}</td>
                <td style={styles.metadataValue}>
                  {displayBackup.snapshotMetadata?.includedDataTypes ?
                    Object.entries(displayBackup.snapshotMetadata.includedDataTypes)
                      .filter(([, included]) => included)
                      .map(([type]) => type)
                      .join(', ') || t("adminTools.backup.details.noneSpecified")
                    : t("adminTools.backup.details.defaultDataTypes")
                  }
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {displayBackup.restorationInfo?.hasBeenRestored && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}><FontAwesomeIcon icon={faSync} /> {t("adminTools.backup.details.restorationHistory")}</h3>
          <div style={styles.dataTypeCard}>
            <table style={styles.metadataTable}>
              <tbody>
                <tr style={styles.metadataRow}>
                  <td style={styles.metadataLabel}>{t("adminTools.backup.details.restorationStatus")}</td>
                  <td style={styles.metadataValue}><FontAwesomeIcon icon={faCheckCircle} /> {t("adminTools.backup.details.previouslyRestored")}</td>
                </tr>
                <tr style={styles.metadataRow}>
                  <td style={styles.metadataLabel}>{t("adminTools.backup.details.lastRestoredDate")}</td>
                  <td style={styles.metadataValue}>
                    {displayBackup.restorationInfo?.lastRestoredAt ?
                      backupUtils.formatDate(displayBackup.restorationInfo.lastRestoredAt) :
                      t("adminTools.backup.details.notAvailable")
                    }
                  </td>
                </tr>
                {displayBackup.restorationInfo?.restorationNotes && (
                  <tr style={styles.metadataRow}>
                    <td style={styles.metadataLabel}>{t("adminTools.backup.details.restorationNotes")}</td>
                    <td style={styles.metadataValue}>{displayBackup.restorationInfo.restorationNotes}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>{t("adminTools.backup.details.title")}</h2>
            <div style={styles.subtitle}>
              {backupUtils.formatChangeDay(displayBackup.changeDay)} - {backupUtils.formatFileSize(sizeInfo.compressedSize)}
            </div>
          </div>
          <button style={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </div>

        <div style={styles.tabContainer}>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'overview' ? styles.activeTab : styles.inactiveTab)
            }}
            onClick={() => setActiveTab('overview')}
          >
            <FontAwesomeIcon icon={faClipboard} /> {t("adminTools.backup.details.tabOverview")}
          </button>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'content' ? styles.activeTab : styles.inactiveTab)
            }}
            onClick={() => setActiveTab('content')}
          >
            <FontAwesomeIcon icon={faFile} /> {t("adminTools.backup.details.tabContent")}
          </button>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'metadata' ? styles.activeTab : styles.inactiveTab)
            }}
            onClick={() => setActiveTab('metadata')}
          >
            <FontAwesomeIcon icon={faWrench} /> {t("adminTools.backup.details.tabMetadata")}
          </button>
        </div>

        <div style={styles.content}>
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'content' && renderContent()}
          {activeTab === 'metadata' && renderMetadata()}
        </div>
      </div>
    </div>
  );
};
