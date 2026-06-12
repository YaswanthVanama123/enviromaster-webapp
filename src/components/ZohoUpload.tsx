import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTimes,
  faBuilding,
  faPlus,
  faUpload,
  faSpinner,
  faCheckCircle,
  faExclamationTriangle,
  faHistory,
  faSearch,
  faFileAlt
} from "@fortawesome/free-solid-svg-icons";
import { zohoApi } from "../backendservice/api";
import type { ZohoCompany, ZohoUploadStatus, ZohoPipelineOptions } from "../backendservice/api";
import { Toast } from "./admin/Toast";
import type { ToastType } from "./admin/Toast";
import { matchCompanyName, getMatchTypeLabel, getMatchTypeColor } from "../utils/fuzzyMatch";
import type { MatchType } from "../utils/fuzzyMatch";
import "./ZohoUpload.css";

interface ZohoUploadProps {
  agreementId: string;
  agreementTitle: string;
  onClose: () => void;
  onSuccess: () => void;
  bulkFiles?: Array<{ id: string; fileName: string; title: string; fileType?: string }>;
}

type UploadStep = 'loading' | 'first-time' | 'update' | 'uploading' | 'success' | 'error';

interface CompanyWithMatch extends ZohoCompany {
  matchType?: MatchType;
  matchScore?: number;
}

export const ZohoUpload: React.FC<ZohoUploadProps> = ({
  agreementId,
  agreementTitle,
  onClose,
  onSuccess,
  bulkFiles
}) => {
  const { t } = useTranslation();
  const [step, setStep] = useState<UploadStep>('loading');
  const [uploadStatus, setUploadStatus] = useState<ZohoUploadStatus | null>(null);
  const [allCompanies, setAllCompanies] = useState<ZohoCompany[]>([]);
  const [companies, setCompanies] = useState<CompanyWithMatch[]>([]);
  const [pipelineOptions, setPipelineOptions] = useState<ZohoPipelineOptions | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateCompany, setShowCreateCompany] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ message: string; type: ToastType } | null>(null);

  const [selectedCompany, setSelectedCompany] = useState<ZohoCompany | null>(null);
  const [dealName, setDealName] = useState('');
  const [pipelineName, setPipelineName] = useState('Sales Pipeline');
  const [stage, setStage] = useState('Proposal');
  const [noteText, setNoteText] = useState('');
  const [newCompany, setNewCompany] = useState({
    name: '',
    phone: '',
    email: '',
    website: '',
    address: ''
  });

  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [uploadMode, setUploadMode] = useState<"files" | "notes">("files");

  useEffect(() => {
    initializeUpload();
  }, [agreementId, bulkFiles]);

  useEffect(() => {
    if (bulkFiles && bulkFiles.length > 0) {
      console.log(`🔍 [BULK-FILES-DEBUG] Received ${bulkFiles.length} bulk files:`);
      bulkFiles.forEach((file, index) => {
        console.log(`   ${index + 1}. ${file.fileName} (ID: ${file.id}, Type: ${file.fileType || 'undefined'})`);
      });

      const allFileIds = new Set(bulkFiles.map(file => file.id));
      setSelectedFiles(allFileIds);
    } else {
      setSelectedFiles(new Set([agreementId]));
    }
  }, [bulkFiles, agreementId]);

  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
  };

  const selectAllFiles = () => {
    if (bulkFiles && bulkFiles.length > 0) {
      setSelectedFiles(new Set(bulkFiles.map(file => file.id)));
    }
  };

  const deselectAllFiles = () => {
    setSelectedFiles(new Set());
  };

  const getSelectedBulkFiles = () => {
    if (!bulkFiles) return null;
    return bulkFiles.filter(file => selectedFiles.has(file.id));
  };

  const getFileUploadStrategy = (file: any) => {
    if (file.fileType === 'main_pdf' || file.fileType === 'version_pdf') {
    return {
      type: 'agreement',
      route: 'updateUpload',
      useAgreementId: true,
      description: file.fileType === 'version_pdf' ? 'Version PDF' : 'Main Agreement'
    };
  }

  if (file.fileType === 'attached_pdf') {
    return {
      type: 'attached',
      route: 'uploadAttachedFile',
      useAgreementId: false,
      description: 'Manual Upload'
    };
  }

  if (file.fileType === 'version_log') {
    return {
      type: 'attached',
      route: 'uploadAttachedFile',
      useAgreementId: false,
      description: 'Version Log'
    };
  }

  const fileName = file.fileName?.toLowerCase() || '';
  if (fileName.includes('agreement') || fileName.includes('main')) {
      return {
        type: 'agreement',
        route: 'updateUpload',
        useAgreementId: true,
        description: 'Agreement (by filename)'
      };
    }

    return {      type: 'agreement',
      route: 'updateUpload',
      useAgreementId: true,
      description: 'Unknown (default to agreement)'
    };
  };

  const calculateZohoFileName = (file: any, dealName: string, version: number = 1) => {
    const strategy = getFileUploadStrategy(file);

    if (strategy.type === 'agreement') {
      return `${dealName.replace(/[^a-zA-Z0-9-_]/g, '_')}_v${version}.pdf`;
    } else {
      const cleanFileName = file.fileName.replace(/[^a-zA-Z0-9\-_.]/g, '_');
      if (file.fileType === 'version_log') {
        return `${cleanFileName.replace('.pdf', '')}_log.pdf`;
      }
      return `${cleanFileName.replace('.pdf', '')}_attached.pdf`;
    }
  };

  const initializeUpload = async () => {
    try {
      setLoading(true);
      setError(null);

      if (bulkFiles && bulkFiles.length > 0) {
        console.log(`🔍 [BULK] Checking folder mapping status for ${bulkFiles.length} files`);

        let existingMappingFound = false;
        let folderMapping = null;
        let checkedFiles = 0;
        const maxFilesToCheck = Math.min(3, bulkFiles.length);

        for (const file of bulkFiles.slice(0, maxFilesToCheck)) {
          try {
            const statusResult = await zohoApi.getUploadStatus(agreementId);
            checkedFiles++;

            console.log(`🔍 [BULK] File ${file.fileName} status:`, {
              isFirstTime: statusResult.isFirstTime,
              hasMapping: !!statusResult.mapping
            });

            if (!statusResult.isFirstTime && statusResult.mapping) {
              existingMappingFound = true;
              folderMapping = statusResult.mapping;
              console.log(`♻️ [BULK] Found existing mapping in folder:`, folderMapping);
              break;
            }
          } catch (err) {
            console.warn(`⚠️ [BULK] Could not check status for ${file.fileName}:`, err);
          }
        }

        if (existingMappingFound && folderMapping) {
          console.log(`♻️ [BULK] Using existing folder mapping - Update mode for ${bulkFiles.length} files`);
          setUploadStatus({ isFirstTime: false, mapping: folderMapping });

          const nextVersion = folderMapping.nextVersion || 2;
          const actualFileNames = bulkFiles.map(file =>
            calculateZohoFileName(file, folderMapping.dealName || 'Deal', nextVersion)
          );
          setStep('update');
          return;
        }

        console.log(`🆕 [BULK] New folder - Loading companies for ${bulkFiles.length} files`);
        const companiesResult = await zohoApi.getCompanies();
        if (!companiesResult.success) {
          throw new Error(companiesResult.error || 'Failed to load companies');
        }

        const allCompaniesData = companiesResult.companies || [];
        setAllCompanies(allCompaniesData);

        setCompanies(allCompaniesData);

        console.log(`✅ Loaded ${allCompaniesData.length} companies for client-side search`);

        const defaultDealName = bulkFiles.length === 1
          ? bulkFiles[0].title
          : `Bulk Upload - ${bulkFiles.length} Documents`;
        setDealName(defaultDealName);

        const actualFileNames = bulkFiles.map(file =>
          file.fileName || calculateZohoFileName(file, defaultDealName, 1)
        );

        setStep('first-time');
        return;
      }

      const statusResult = await zohoApi.getUploadStatus(agreementId);
      setUploadStatus(statusResult);

      if (statusResult.isFirstTime) {
        const companiesResult = await zohoApi.getCompanies();
        if (!companiesResult.success) {
          throw new Error(companiesResult.error || 'Failed to load companies');
        }

        const allCompaniesData = companiesResult.companies || [];
        setAllCompanies(allCompaniesData);

        setCompanies(allCompaniesData);

        console.log(`✅ Loaded ${allCompaniesData.length} companies for client-side search`);

        const defaultDealName = generateDealName(statusResult.agreement?.headerTitle || agreementTitle);
        setDealName(defaultDealName);

        setStep('first-time');
      } else {
        setStep('update');
      }
    } catch (err) {
      console.error('Failed to initialize upload:', err);

      if (err.message?.includes('authorization') || err.message?.includes('auth')) {
        setError(t('misc.zhIntegrationNotSetUp'));
      } else {
        setError(t('misc.zhFailedToLoadOptions'));
      }

      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadPipelineOptions = async () => {
      if (!selectedCompany) {
        setPipelineOptions({ success: false, pipelines: [], stages: [] });
        return;
      }

      try {
        console.log(`🔍 Loading pipeline options for company: ${selectedCompany.name} (${selectedCompany.id})`);
        const pipelineResult = await zohoApi.getCompanyPipelineOptions(selectedCompany.id);

        if (pipelineResult.success) {
          setPipelineOptions(pipelineResult);
          console.log(`✅ Loaded pipeline options:`, pipelineResult.pipelines?.length || 0, 'pipelines');

          if (pipelineResult.pipelines?.length > 0) {
            setPipelineName(pipelineResult.pipelines[0].value);
          }
          if (pipelineResult.stages?.length > 0) {
            const proposalStage = pipelineResult.stages.find(s =>
              s.label?.toLowerCase().includes('proposal') ||
              s.label?.toLowerCase().includes('price quote')
            );
            setStage(proposalStage?.value || pipelineResult.stages[0].value);
            console.log(`✅ Default stage set to: ${proposalStage?.label || pipelineResult.stages[0].label}`);
          }
        } else {
          console.error('Failed to load pipeline options:', pipelineResult.error);
        }
      } catch (error) {
        console.error('Error loading pipeline options:', error);
      }
    };

    loadPipelineOptions();
  }, [selectedCompany]);

  const generateDealName = (title: string) => {
    const cleanTitle = title?.trim() || 'Service Proposal';
    return `${cleanTitle} - EnviroMaster Services`;
  };

  const filterCompanies = useCallback((search: string) => {
    if (!search.trim()) {
      setCompanies(allCompanies);
      return;
    }

    console.log(`🔍 [CLIENT-SEARCH] Filtering ${allCompanies.length} companies for: "${search}"`);

    const companiesWithMatch: CompanyWithMatch[] = allCompanies.map(company => {
      const matchResult = matchCompanyName(company.name, search);
      return {
        ...company,
        matchType: matchResult.matchType,
        matchScore: matchResult.score
      };
    });

    const matchedCompanies = companiesWithMatch.filter(c => c.matchType !== 'none');

    const sortedCompanies = matchedCompanies.sort((a, b) => {
      const matchTypePriority: Record<MatchType, number> = {
        exact: 4,
        partial: 3,
        fuzzy: 2,
        none: 1
      };

      const priorityA = matchTypePriority[a.matchType || 'none'];
      const priorityB = matchTypePriority[b.matchType || 'none'];

      if (priorityA !== priorityB) {
        return priorityB - priorityA;
      }

      return (b.matchScore || 0) - (a.matchScore || 0);
    });

    console.log(`✅ [CLIENT-SEARCH] Found ${sortedCompanies.length} matches:`, {
      exact: sortedCompanies.filter(c => c.matchType === 'exact').length,
      partial: sortedCompanies.filter(c => c.matchType === 'partial').length,
      fuzzy: sortedCompanies.filter(c => c.matchType === 'fuzzy').length,
      total: sortedCompanies.length
    });

    setCompanies(sortedCompanies);
  }, [allCompanies]);

  useEffect(() => {
    if (step === 'first-time') {
      filterCompanies(searchTerm);
    }
  }, [searchTerm, filterCompanies, step]);

  const handleCreateCompany = async () => {
    if (!newCompany.name.trim()) {
      setToastMessage({ message: t('misc.zhCompanyNameRequired'), type: 'error' });
      return;
    }

    try {
      setLoading(true);
      const result = await zohoApi.createCompany(newCompany);

      if (result.success && result.company) {
        setSelectedCompany(result.company);

        setAllCompanies(prev => [result.company!, ...prev]);
        setCompanies(prev => [result.company!, ...prev]);

        setShowCreateCompany(false);
        setNewCompany({ name: '', phone: '', email: '', website: '', address: '' });
        setToastMessage({ message: t('misc.zhCompanyCreatedSuccess'), type: 'success' });
      } else {
        setToastMessage({ message: result.error || t('misc.zhFailedToCreateCompany'), type: 'error' });
      }
    } catch (err) {
      console.error('Failed to create company:', err);
      setToastMessage({ message: t('misc.zhFailedToCreateCompany'), type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleFirstTimeUpload = async () => {
    if (!selectedCompany) {
      setToastMessage({ message: t('misc.zhSelectCompanyError'), type: 'error' });
      return;
    }
    if (!dealName.trim()) {
      setToastMessage({ message: t('misc.zhDealNameRequired'), type: 'error' });
      return;
    }

    try {
      const trimmedNote = noteText.trim();
      const selectedBulkFiles = bulkFiles ? getSelectedBulkFiles() || [] : [];
      const hasSelectedBulkFiles = selectedBulkFiles.length > 0;
      const hasSingleSelection = (!bulkFiles || bulkFiles.length === 0) && selectedFiles.has(agreementId);
      const hasAnyFile = bulkFiles && bulkFiles.length > 0 ? hasSelectedBulkFiles : hasSingleSelection;
      const hasNotes = trimmedNote.length > 0;

      if (!hasAnyFile && !hasNotes) {
        setToastMessage({ message: t('misc.zhAddNoteOrFileError'), type: "error" });
        return;
      }

      setUploadMode(hasAnyFile ? "files" : "notes");
      setStep('uploading');

      if (bulkFiles && bulkFiles.length > 0) {
        if (!hasSelectedBulkFiles) {
          const result = await zohoApi.firstTimeUpload(agreementId, {
            companyId: selectedCompany.id,
            companyName: selectedCompany.name,
            dealName: dealName.trim(),
            pipelineName,
            stage,
            noteText: trimmedNote,
            skipFileUpload: true
          });

          if (result.success) {
            setStep('success');
            setToastMessage({ message: t('misc.zhDealCreatedNoteOnly'), type: 'success' });
            onSuccess();
          } else {
            setError(result.error || t('misc.zhUploadFailedGeneric'));
            setStep('error');
          }
          return;
        }

        console.log(`?Y? [BULK-FIRST-TIME] Creating single deal for ${selectedBulkFiles.length} selected files (out of ${bulkFiles.length} total)`);
        let dealId: string | null = null;
        let successCount = 0;
        let failCount = 0;

        const actualFileNames = selectedBulkFiles.map(file =>
          file.fileName || calculateZohoFileName(file, dealName.trim(), 1)
        );
        const bulkNoteText = `${trimmedNote}

Bulk upload of ${selectedBulkFiles.length} selected documents:
${actualFileNames.map(fileName => `• ${fileName}`).join('\n')}`;

        const hasVersionPdf = selectedBulkFiles.some(file => {
          const strategy = getFileUploadStrategy(file);
          return strategy.type === 'agreement';
        });
        const areAllAttachments = selectedBulkFiles.length > 0 && selectedBulkFiles.every(file => {
          const strategy = getFileUploadStrategy(file);
          return strategy.type === 'attached';
        });

        console.log(`?Y"? [BULK-FIRST-TIME] Analysis: ${selectedBulkFiles.length} files, hasVersionPdf: ${hasVersionPdf}`);

        for (const [index, file] of selectedBulkFiles.entries()) {
          try {
            const strategy = getFileUploadStrategy(file);
            console.log(`?Y" [BULK-FIRST-TIME] Processing file ${index + 1}/${selectedBulkFiles.length}: ${file.fileName} (${strategy.description})`);
            console.log(`?Y"? [BULK-FIRST-TIME] File details:`, {
              id: file.id,
              fileName: file.fileName,
              fileType: file.fileType,
              strategy: strategy
            });

            if (index === 0) {
              console.log(`?Y"? [BULK-FIRST-TIME] Creating deal ${hasVersionPdf ? 'without auto PDF upload' : 'with agreement PDF'}`);

              const result = await zohoApi.firstTimeUpload(agreementId, {
                companyId: selectedCompany.id,
                companyName: selectedCompany.name,
                dealName: dealName.trim(),
                pipelineName,
                stage,
                noteText: bulkNoteText,
                skipFileUpload: hasVersionPdf || areAllAttachments
              });

              if (result.success) {
                dealId = result.data?.deal?.id;
                console.log(`?o. [BULK-FIRST-TIME] Deal created with ID: ${dealId}`);

                if (!dealId) {
                  failCount++;
                  console.error(`??O [BULK-FIRST-TIME] Could not extract dealId from response:`, result.data);
                  break;
                }

                if (strategy.type === 'attached') {
                  console.log(`?Y"Z [BULK-FIRST-TIME] Adding first file as attached: ${file.fileName}`);

                  const attachedResult = await zohoApi.uploadAttachedFile(file.id, {
                    dealId: dealId,
                    noteText: `Bulk upload attached file: ${file.fileName}`,
                    dealName: dealName.trim(),
                    skipNoteCreation: true,
                    fileType: file.fileType
                  });

                  if (attachedResult.success) {
                    successCount++;
                    console.log(`?o. [BULK-FIRST-TIME] Added attached file to deal: ${file.fileName}`);
                  } else {
                    failCount++;
                    console.error(`??O [BULK-FIRST-TIME] Failed to add attached file ${file.fileName}:`, attachedResult.error);
                  }
                } else if (strategy.type === 'agreement') {
                  console.log(`?Y"? [BULK-FIRST-TIME] Adding first file as version PDF: ${file.fileName}`);

                  const versionResult = await zohoApi.updateUpload(agreementId, {
                    noteText: `First file in bulk upload: ${file.fileName}`,
                    dealId: dealId,
                    skipNoteCreation: true,
                    versionId: file.id
                  });

                  if (versionResult.success) {
                    successCount++;
                    console.log(`?o. [BULK-FIRST-TIME] Added version PDF to deal: ${file.fileName}`);
                  } else {
                    failCount++;
                    console.error(`??O [BULK-FIRST-TIME] Failed to add version PDF ${file.fileName}:`, versionResult.error);
                  }
                } else {
                  successCount++;
                  console.log(`?o. [BULK-FIRST-TIME] Agreement PDF auto-uploaded during deal creation`);
                }
              } else {
                failCount++;
                console.error(`??O [BULK-FIRST-TIME] Failed to create deal:`, result.error);
                break;
              }
            } else {
              if (!dealId) {
                failCount++;
                console.error(`??O [BULK-FIRST-TIME] No dealId available for file: ${file.fileName}`);
                continue;
              }

              const strategy = getFileUploadStrategy(file);
              console.log(`?Y"? [BULK-FIRST-TIME] Processing file: ${file.fileName} (${strategy.description})`);
              console.log(`?Y"? [BULK-FIRST-TIME] File details:`, {
                id: file.id,
                fileName: file.fileName,
                fileType: file.fileType,
                strategy: strategy
              });

              let result;

              if (strategy.type === 'agreement') {
                const targetId = strategy.useAgreementId ? agreementId : file.id;
                console.log(`?Y"? [BULK-FIRST-TIME] Using agreement route for: ${file.fileName} (targetId: ${targetId})`);

                result = await zohoApi.updateUpload(targetId, {
                  noteText: `Additional file in bulk upload: ${file.fileName}`,
                  skipNoteCreation: true,
                  versionId: file.id
                });
              } else if (strategy.type === 'attached') {
                console.log(`?Y"Z [BULK-FIRST-TIME] Using attached file route for: ${file.fileName} (fileId: ${file.id})`);

                result = await zohoApi.uploadAttachedFile(file.id, {
                  dealId: dealId,
                  noteText: `Additional file in bulk upload: ${file.fileName}`,
                  dealName: dealName.trim(),
                  skipNoteCreation: true,
                  fileType: file.fileType
                });
              } else {
                console.warn(`?s???? [BULK-FIRST-TIME] Unknown strategy type for ${file.fileName}, using agreement route`);
                result = await zohoApi.updateUpload(agreementId, {
                  noteText: `Additional file in bulk upload: ${file.fileName}`,
                  skipNoteCreation: true,
                  versionId: file.id
                });
              }

              if (result.success) {
                successCount++;
                console.log(`?o. [BULK-FIRST-TIME] Added file to deal: ${file.fileName}`);
              } else {
                failCount++;
                console.error(`??O [BULK-FIRST-TIME] Failed to add ${file.fileName} to deal:`, result.error);
              }
            }
          } catch (err) {
            failCount++;
            console.error(`?Y'? [BULK-FIRST-TIME] Error processing ${file.fileName}:`, err);
          }
        }

        if (successCount > 0) {
          setStep('success');
          const message = failCount > 0
            ? t('misc.zhCreatedDealPartial', { success: successCount, fail: failCount })
            : t('misc.zhCreatedDealAll', { count: successCount });
          setToastMessage({ message, type: successCount === selectedBulkFiles.length ? 'success' : 'warning' });
          onSuccess();
        } else {
          setError(t('misc.zhFailedCreateDealUpload'));
          setStep('error');
        }
        return;
      }

      const shouldSkipSingleFileUpload = !selectedFiles.has(agreementId);
      const result = await zohoApi.firstTimeUpload(agreementId, {
        companyId: selectedCompany.id,
        companyName: selectedCompany.name,
        dealName: dealName.trim(),
        pipelineName,
        stage,
        noteText: trimmedNote,
        skipFileUpload: shouldSkipSingleFileUpload
      });

      if (result.success) {
        setStep('success');
        setToastMessage({ message: t('misc.zhUploadedToBigin'), type: 'success' });
        onSuccess();
      } else {
        setError(result.error || t('misc.zhUploadFailedGeneric'));
        setStep('error');
      }
    } catch (err) {
      console.error('Upload failed:', err);
      setError(t('misc.zhUploadFailedRetry'));
      setStep('error');
    }
  };
  const sendUpdateNoteOnly = async () => {
    if (!uploadStatus?.mapping?.dealId) {
      setError(t('misc.zhNoExistingMapping'));
      setStep("error");
      return;
    }

    const updateResult = await zohoApi.updateUpload(agreementId, {
      dealId: uploadStatus.mapping.dealId,
      noteText: noteText.trim(),
      skipFileUpload: true
    });

    if (updateResult.success) {
      setStep("success");
      setToastMessage({ message: t('misc.zhAddedNoteToDeal', { dealName: uploadStatus.mapping.dealName }), type: "success" });
      onSuccess();
    } else {
      setError(updateResult.error || t('misc.zhUpdateFailed'));
      setStep("error");
    }
  };

  const handleUpdateUpload = async () => {
    if (!noteText.trim()) {
      setToastMessage({ message: t('misc.zhAddNotesAboutChanges'), type: 'error' });
      return;
    }

    try {
      const selectedBulkFiles = bulkFiles ? getSelectedBulkFiles() || [] : [];
      const hasSelectedBulkFiles = selectedBulkFiles.length > 0;
      const hasSingleSelection = (!bulkFiles || bulkFiles.length === 0) && selectedFiles.has(agreementId);
      const hasAnyFile = bulkFiles && bulkFiles.length > 0 ? hasSelectedBulkFiles : hasSingleSelection;
      setUploadMode(hasAnyFile ? "files" : "notes");
      setStep('uploading');

      if (bulkFiles && bulkFiles.length > 0) {
        if (selectedBulkFiles.length === 0) {
          await sendUpdateNoteOnly();
          return;
        }

        console.log(`♻️ [BULK-UPDATE] Processing ${selectedBulkFiles.length} selected files (out of ${bulkFiles.length} total) for existing folder`);
        let successCount = 0;
        let failCount = 0;
        let isFirstFileUpload = true;

        const nextVersion = uploadStatus?.mapping?.nextVersion || 2;
        const actualFileNames = selectedBulkFiles.map(file =>
          file.fileName || calculateZohoFileName(file, uploadStatus?.mapping?.dealName || 'Deal', nextVersion)
        );
        const bulkUpdateNoteText = `${noteText.trim()}\n\nUpdate with ${selectedBulkFiles.length} selected documents:\n${actualFileNames.map(fileName => `• ${fileName}`).join('\n')}`;

        for (const file of selectedBulkFiles) {
          try {
            const strategy = getFileUploadStrategy(file);
            console.log(`📤 [BULK-UPDATE] Processing file: ${file.fileName} (${strategy.description})`);
            console.log(`🔍 [BULK-UPDATE] File details:`, {
              id: file.id,
              fileName: file.fileName,
              fileType: file.fileType,
              strategy: strategy
            });

            let result;

            if (strategy.type === 'agreement') {
              const targetId = strategy.useAgreementId ? agreementId : file.id;
              console.log(`📝 [BULK-UPDATE] Using agreement route for: ${file.fileName} (targetId: ${targetId})`);

              result = await zohoApi.updateUpload(targetId, {
                noteText: isFirstFileUpload ? bulkUpdateNoteText : `Additional file in bulk update: ${file.fileName}`,
                skipNoteCreation: !isFirstFileUpload,
                versionId: file.id,
                versionFileName: file.fileName
              });
            } else if (strategy.type === 'attached') {
              console.log(`📎 [BULK-UPDATE] Using attached file route for: ${file.fileName} (fileId: ${file.id})`);
              const dealId = uploadStatus?.mapping?.dealId;

              if (!dealId) {
                throw new Error('Could not find existing deal ID - mapping information missing');
              }

              result = await zohoApi.uploadAttachedFile(file.id, {
                dealId: dealId,
                noteText: isFirstFileUpload ? bulkUpdateNoteText : `Additional file in bulk update: ${file.fileName}`,
                dealName: uploadStatus?.mapping?.dealName || 'Unknown Deal',
                skipNoteCreation: !isFirstFileUpload,
                fileType: file.fileType
              });
            } else {
              result = await zohoApi.updateUpload(agreementId, {
                noteText: isFirstFileUpload ? bulkUpdateNoteText : `Additional file in bulk update: ${file.fileName}`,
                skipNoteCreation: !isFirstFileUpload,
                versionId: file.id,
                versionFileName: file.fileName
              });
            }

            if (result.success) {
              successCount++;
              console.log(`✅ [BULK-UPDATE] Success: ${file.fileName}`);
              isFirstFileUpload = false; 
            } else {
              failCount++;
              console.error(`❌ [BULK-UPDATE] Failed: ${file.fileName}:`, result.error);
            }
          } catch (err) {
            failCount++;
            console.error(`💥 [BULK-UPDATE] Error uploading ${file.fileName}:`, err);
          }
        }

        if (successCount > 0) {
          setStep('success');
          const message = failCount > 0
            ? t('misc.zhAddedFilesPartial', { success: successCount, fail: failCount })
            : t('misc.zhAddedFilesAll', { count: successCount });
          setToastMessage({ message, type: successCount === selectedBulkFiles.length ? 'success' : 'warning' });
          onSuccess();
        } else {
          setError(t('misc.zhAllAdditionsFailed'));
          setStep('error');
        }
        return;
      }

      if (!selectedFiles.has(agreementId)) {
        await sendUpdateNoteOnly();
        return;
      }

      console.log(`📝 [SINGLE-UPDATE] Processing single file: ${agreementId}`);
      const result = await zohoApi.updateUpload(agreementId, {
        noteText: noteText.trim()
      });

      if (result.success) {
        setStep('success');
        setToastMessage({ message: t('misc.zhUploadedVersion', { version: uploadStatus?.mapping?.nextVersion || 'new' }), type: 'success' });
        onSuccess();
      } else {
        setError(result.error || t('misc.zhUploadFailedGeneric'));
        setStep('error');
      }
    } catch (err) {
      console.error('Update upload failed:', err);
      setError(t('misc.zhUploadFailedRetry'));
      setStep('error');
    }
  };

  const renderLoadingStep = () => (
    <div className="zoho-upload__step zoho-upload__step--loading">
      <div className="zoho-upload__loading">
        <FontAwesomeIcon icon={faSpinner} spin size="2x" />
        <p>{t('misc.zhLoadingOptions')}</p>
      </div>
    </div>
  );

  const renderFirstTimeStep = () => {
    const hasNotes = noteText.trim().length > 0;
    const warningColor = hasNotes ? '#f59e0b' : '#f44336';
    const noteOnlyMessage = bulkFiles && bulkFiles.length > 0
      ? t('misc.zhNoFilesSelectedFirstTime')
      : t('misc.zhNoFileSelected');
    const warningMessage = hasNotes
      ? noteOnlyMessage
      : t('misc.zhAddNoteOrFile');

    return (
      <div className="zoho-upload__step zoho-upload__step--first-time">
        <div className="zoho-upload__header">
        <h3>
          <FontAwesomeIcon icon={faUpload} />
          {bulkFiles && bulkFiles.length > 0
            ? t('misc.zhUploadFilesToBigin', { count: bulkFiles.length })
            : t('misc.zhFirstTimeUpload')
          }
        </h3>
        <p>
          {bulkFiles && bulkFiles.length > 0
            ? t('misc.zhUploadDocuments', { count: bulkFiles.length })
            : t('misc.zhNotUploadedYet')
          }
        </p>
      </div>

      <div className="zoho-upload__section">        <label className="zoho-upload__label">
          <FontAwesomeIcon icon={faFileAlt} />
          {bulkFiles && bulkFiles.length > 0
            ? t('misc.zhSelectDocuments', { selected: selectedFiles.size, total: bulkFiles.length })
            : t('misc.zhDocumentToUpload', { count: selectedFiles.has(agreementId) ? 1 : 0 })
          }
        </label>

        {bulkFiles && bulkFiles.length > 1 && (
          <div className="zoho-upload__selection-controls" style={{ marginBottom: '10px', display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="zoho-upload__btn zoho-upload__btn--secondary"
              onClick={selectAllFiles}
              style={{ padding: '5px 10px', fontSize: '12px' }}
            >
              {t('misc.zhSelectAll')}
            </button>
            <button
              type="button"
              className="zoho-upload__btn zoho-upload__btn--secondary"
              onClick={deselectAllFiles}
              style={{ padding: '5px 10px', fontSize: '12px' }}
            >
              {t('misc.zhDeselectAll')}
            </button>
          </div>
        )}

        <div className="zoho-upload__files-preview">
          {bulkFiles && bulkFiles.length > 0 ? (
            bulkFiles.map((file, index) => (
              <div key={file.id} className="zoho-upload__file-preview" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px' }}>
                <input
                  type="checkbox"
                  checked={selectedFiles.has(file.id)}
                  onChange={() => toggleFileSelection(file.id)}
                  style={{ marginRight: '8px' }}
                />
                <FontAwesomeIcon icon={faFileAlt} className="file-icon" />
                <span className="file-name" style={{ flex: 1 }}>{file.fileName}</span>
                <span style={{ fontSize: '12px', color: '#666' }}>
                  {(() => {
                    const strategy = getFileUploadStrategy(file);
                    return `(${strategy.description})`;
                  })()}
                </span>
              </div>
            ))
          ) : (
            <div className="zoho-upload__file-preview" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px' }}>
              <input
                type="checkbox"
                checked={selectedFiles.has(agreementId)}
                onChange={() => toggleFileSelection(agreementId)}
                style={{ marginRight: '8px' }}
              />
              <FontAwesomeIcon icon={faFileAlt} className="file-icon" />
              <span className="file-name" style={{ flex: 1 }}>{agreementTitle}</span>
              <span style={{ fontSize: '12px', color: '#666' }}>
                {t('misc.zhPdfDocument')}
              </span>
            </div>
          )}
        </div>

        {selectedFiles.size === 0 && (
          <div style={{ color: warningColor, fontSize: '14px', marginTop: '8px' }}>
            {warningMessage}
          </div>
        )}
      </div>

      <div className="zoho-upload__form">
        <div className="zoho-upload__section">
          <label className="zoho-upload__label">
            <FontAwesomeIcon icon={faBuilding} />
            {t('misc.zhSelectCompany')}
          </label>

          {!showCreateCompany ? (
            <>
              <div className="zoho-upload__search">
                <FontAwesomeIcon icon={faSearch} className="search-icon" />
                <input
                  type="text"
                  placeholder={t('misc.zhSearchCompanies')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="zoho-upload__search-input"
                />
              </div>

              <div className="zoho-upload__companies">
                {companies.length > 0 ? (
                  companies.map((company) => (
                    <div
                      key={company.id}
                      className={`zoho-upload__company ${selectedCompany?.id === company.id ? 'selected' : ''}`}
                      onClick={() => setSelectedCompany(company)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <div className="company-name">{company.name}</div>
                        {searchTerm && company.matchType && company.matchType !== 'none' && (
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: '600',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              backgroundColor: getMatchTypeColor(company.matchType),
                              color: '#ffffff',
                              whiteSpace: 'nowrap',
                              flexShrink: 0
                            }}
                            title={t('misc.zhMatchScore', { score: (company.matchScore || 0).toFixed(2) })}
                          >
                            {getMatchTypeLabel(company.matchType)}
                          </span>
                        )}
                      </div>
                      {company.phone && <div className="company-info">{company.phone}</div>}
                      {company.email && <div className="company-info">{company.email}</div>}
                    </div>
                  ))
                ) : (
                  <div className="zoho-upload__no-results">
                    {searchTerm ? t('misc.zhNoCompaniesForSearch', { term: searchTerm }) : t('misc.zhNoCompanies')}
                  </div>
                )}
              </div>

              <button
                type="button"
                className="zoho-upload__btn zoho-upload__btn--secondary"
                onClick={() => setShowCreateCompany(true)}
              >
                <FontAwesomeIcon icon={faPlus} />
                {t('misc.zhCreateNewCompany')}
              </button>
            </>
          ) : (
            <div className="zoho-upload__create-company">
              <h4>{t('misc.zhCreateNewCompany')}</h4>
              <input
                type="text"
                placeholder={t('misc.zhCompanyNamePlaceholder')}
                value={newCompany.name}
                onChange={(e) => setNewCompany(prev => ({ ...prev, name: e.target.value }))}
                className="zoho-upload__input"
                required
              />
              <input
                type="tel"
                placeholder={t('misc.zhPhone')}
                value={newCompany.phone}
                onChange={(e) => setNewCompany(prev => ({ ...prev, phone: e.target.value }))}
                className="zoho-upload__input"
              />
              <input
                type="email"
                placeholder={t('misc.zhEmail')}
                value={newCompany.email}
                onChange={(e) => setNewCompany(prev => ({ ...prev, email: e.target.value }))}
                className="zoho-upload__input"
              />
              <input
                type="url"
                placeholder={t('misc.zhWebsite')}
                value={newCompany.website}
                onChange={(e) => setNewCompany(prev => ({ ...prev, website: e.target.value }))}
                className="zoho-upload__input"
              />
              <input
                type="text"
                placeholder={t('misc.zhAddress')}
                value={newCompany.address}
                onChange={(e) => setNewCompany(prev => ({ ...prev, address: e.target.value }))}
                className="zoho-upload__input"
              />

              <div className="zoho-upload__button-group">
                <button
                  type="button"
                  className="zoho-upload__btn zoho-upload__btn--primary"
                  onClick={handleCreateCompany}
                  disabled={loading || !newCompany.name.trim()}
                >
                  {loading ? <FontAwesomeIcon icon={faSpinner} spin /> : t('misc.zhCreateCompany')}
                </button>
                <button
                  type="button"
                  className="zoho-upload__btn zoho-upload__btn--secondary"
                  onClick={() => setShowCreateCompany(false)}
                >
                  {t('misc.zhCancel')}
                </button>
              </div>
            </div>
          )}
        </div>

        {selectedCompany && !showCreateCompany && (
          <>
            <div className="zoho-upload__section">
              <label className="zoho-upload__label">{t('misc.zhDealName')}</label>
              <input
                type="text"
                value={dealName}
                onChange={(e) => setDealName(e.target.value)}
                className="zoho-upload__input"
                placeholder={t('misc.zhDealNamePlaceholder')}
                required
              />
            </div>

            <div className="zoho-upload__row">
              <div className="zoho-upload__col">
                <label className="zoho-upload__label">{t('misc.zhPipeline')}</label>
                <select
                  value={pipelineName}
                  onChange={(e) => setPipelineName(e.target.value)}
                  className="zoho-upload__select"
                >
                  {pipelineOptions?.pipelines?.map((pipeline) => (
                    <option key={pipeline.value} value={pipeline.value}>
                      {pipeline.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="zoho-upload__col">
                <label className="zoho-upload__label">{t('misc.zhStage')}</label>
                <select
                  value={stage}
                  onChange={(e) => setStage(e.target.value)}
                  className="zoho-upload__select"
                >
                  {pipelineOptions?.stages?.map((stageOption) => (
                    <option key={stageOption.value} value={stageOption.value}>
                      {stageOption.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="zoho-upload__section">
              <label className="zoho-upload__label">{t('misc.zhNotes')}</label>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                className="zoho-upload__textarea"
                placeholder={t('misc.zhNotesPlaceholder')}
                rows={4}
                required
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
  };

  const renderUpdateStep = () => {
    const hasNotes = noteText.trim().length > 0;
    const warningColor = hasNotes ? '#f59e0b' : '#f44336';
    const noteOnlyMessage = bulkFiles && bulkFiles.length > 0
      ? t('misc.zhNoFilesSelectedUpdate')
      : t('misc.zhNoFileSelected');
    const warningMessage = hasNotes
      ? noteOnlyMessage
      : t('misc.zhAddNoteOrFile');

    return (
      <div className="zoho-upload__step zoho-upload__step--update">
      <div className="zoho-upload__header">
        <h3>
          <FontAwesomeIcon icon={faHistory} />
          {t('misc.zhUploadUpdatedVersion')}
          {bulkFiles && bulkFiles.length > 1 && (
            <span style={{
              fontSize: '14px',
              fontWeight: 'normal',
              color: '#059669',
              marginLeft: '8px'
            }}>
              {t('misc.zhBulkFiles', { count: selectedFiles.size })}
            </span>
          )}
        </h3>
        <p>{t('misc.zhUploadedBeforeAddingVersion', { version: uploadStatus?.mapping?.nextVersion })}</p>

        {uploadStatus?.mapping && (
          <div style={{
            background: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: '8px',
            padding: '12px',
            margin: '12px 0',
            fontSize: '14px'
          }}>
            <div style={{
              fontWeight: '600',
              color: '#0369a1',
              marginBottom: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <FontAwesomeIcon icon={faBuilding} style={{ fontSize: '12px' }} />
              {bulkFiles && bulkFiles.length > 1 ? t('misc.zhAddingToExistingDealBulk') : t('misc.zhUploadingToExistingDeal')}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 12px', fontSize: '13px' }}>
              <span style={{ fontWeight: '500', color: '#6b7280' }}>{t('misc.zhCompany')}</span>
              <span style={{ color: '#374151' }}>{uploadStatus.mapping.companyName}</span>

              <span style={{ fontWeight: '500', color: '#6b7280' }}>{t('misc.zhDeal')}</span>
              <span style={{ color: '#374151' }}>{uploadStatus.mapping.dealName}</span>

              <span style={{ fontWeight: '500', color: '#6b7280' }}>{t('misc.zhCurrentVersion')}</span>
              <span style={{ color: '#374151' }}>v{uploadStatus.mapping.currentVersion}</span>

              <span style={{ fontWeight: '500', color: '#6b7280' }}>{t('misc.zhLastUpdated')}</span>
              <span style={{ color: '#374151' }}>{new Date(uploadStatus.mapping.lastUploadedAt).toLocaleDateString()}</span>

              {bulkFiles && bulkFiles.length > 1 && (
                <>
                  <span style={{ fontWeight: '500', color: '#6b7280' }}>{t('misc.zhUploadMode')}</span>
                  <span style={{ color: '#059669', fontWeight: '500' }}>
                    {t('misc.zhBulkUpdateSelected', { selected: selectedFiles.size, total: bulkFiles.length })}
                  </span>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="zoho-upload__section">
        <label className="zoho-upload__label">
          <FontAwesomeIcon icon={faFileAlt} />
          {bulkFiles && bulkFiles.length > 0
            ? t('misc.zhSelectDocuments', { selected: selectedFiles.size, total: bulkFiles.length })
            : t('misc.zhDocumentToUpload', { count: selectedFiles.has(agreementId) ? 1 : 0 })
          }
        </label>

        {bulkFiles && bulkFiles.length > 1 && (
          <div className="zoho-upload__selection-controls" style={{ marginBottom: '10px', display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="zoho-upload__btn zoho-upload__btn--secondary"
              onClick={selectAllFiles}
              style={{ padding: '5px 10px', fontSize: '12px' }}
            >
              {t('misc.zhSelectAll')}
            </button>
            <button
              type="button"
              className="zoho-upload__btn zoho-upload__btn--secondary"
              onClick={deselectAllFiles}
              style={{ padding: '5px 10px', fontSize: '12px' }}
            >
              {t('misc.zhDeselectAll')}
            </button>
          </div>
        )}

        <div className="zoho-upload__files-preview">
          {bulkFiles && bulkFiles.length > 0 ? (
            bulkFiles.map((file, index) => (
              <div key={file.id} className="zoho-upload__file-preview" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px' }}>
                <input
                  type="checkbox"
                  checked={selectedFiles.has(file.id)}
                  onChange={() => toggleFileSelection(file.id)}
                  style={{ marginRight: '8px' }}
                />
                <FontAwesomeIcon icon={faFileAlt} className="file-icon" />
                <span className="file-name" style={{ flex: 1 }}>{file.fileName}</span>
                <span style={{ fontSize: '12px', color: '#666' }}>
                  {(() => {
                    const strategy = getFileUploadStrategy(file);
                    return `(${strategy.description})`;
                  })()}
                </span>
              </div>
            ))
          ) : (
            <div className="zoho-upload__file-preview" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px' }}>
              <input
                type="checkbox"
                checked={selectedFiles.has(agreementId)}
                onChange={() => toggleFileSelection(agreementId)}
                style={{ marginRight: '8px' }}
              />
              <FontAwesomeIcon icon={faFileAlt} className="file-icon" />
              <span className="file-name" style={{ flex: 1 }}>{agreementTitle}</span>
              <span style={{ fontSize: '12px', color: '#666' }}>
                {t('misc.zhUpdatedPdfDocument')}
              </span>
            </div>
          )}
        </div>

        {selectedFiles.size === 0 && (
          <div style={{ color: warningColor, fontSize: '14px', marginTop: '8px' }}>
            {warningMessage}
          </div>
        )}
      </div>

      <div className="zoho-upload__form">
        <div className="zoho-upload__section">
          <label className="zoho-upload__label">
            {t('misc.zhWhatChanged')}
          </label>
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            className="zoho-upload__textarea"
            placeholder={t('misc.zhWhatChangedPlaceholder')}
            rows={4}
            required
          />
        </div>
      </div>
    </div>
    );
  };

  const renderUploadingStep = () => {
    const uploadingLabel = uploadMode === 'notes'
      ? t('misc.zhCreatingDealNote')
      : t('misc.zhCreatingDealUploading');
    const uploadingSubtext = uploadMode === 'notes'
      ? t('misc.zhAddingNote')
      : t('misc.zhCreatingDealUploadingSub');

    return (
      <div className="zoho-upload__step zoho-upload__step--uploading">
        <div className="zoho-upload__loading">
        <FontAwesomeIcon icon={faSpinner} spin size="2x" />
        <p>{uploadingLabel}</p>
        <small>{uploadingSubtext}</small>
      </div>
      </div>
    );
  };

  const renderSuccessStep = () => (
    <div className="zoho-upload__step zoho-upload__step--success">
      <div className="zoho-upload__result zoho-upload__result--success">
        <FontAwesomeIcon icon={faCheckCircle} size="3x" />
        <h3>{t('misc.zhUploadSuccessful')}</h3>
        <p>
          {uploadStatus?.isFirstTime
            ? t('misc.zhUploadSuccessFirstTime')
            : t('misc.zhUploadSuccessVersion', { version: uploadStatus?.mapping?.nextVersion })
          }
        </p>
      </div>
    </div>
  );

  const renderErrorStep = () => (
    <div className="zoho-upload__step zoho-upload__step--error">
      <div className="zoho-upload__result zoho-upload__result--error">
        <FontAwesomeIcon icon={faExclamationTriangle} size="3x" />
        <h3>{t('misc.zhUploadFailed')}</h3>
        <p>{error}</p>
        <button
          className="zoho-upload__btn zoho-upload__btn--primary"
          onClick={() => {
            setError(null);
            setStep(uploadStatus?.isFirstTime ? 'first-time' : 'update');
          }}
        >
          {t('misc.zhTryAgain')}
        </button>
      </div>
    </div>
  );

  const renderActions = () => {
    if (step === 'loading' || step === 'uploading' || step === 'success') {
      return null;
    }

    if (step === 'error') {
      return (
        <div className="zoho-upload__actions">
          <button
            className="zoho-upload__btn zoho-upload__btn--secondary"
            onClick={onClose}
          >
            {t('misc.zhClose')}
          </button>
        </div>
      );
    }

    if (step === 'first-time') {
      return (
        <div className="zoho-upload__actions">
          <button
            className="zoho-upload__btn zoho-upload__btn--secondary"
            onClick={onClose}
          >
            {t('misc.zhCancel')}
          </button>
          <button
            className="zoho-upload__btn zoho-upload__btn--primary"
            onClick={handleFirstTimeUpload}
            disabled={
              !selectedCompany ||
              !dealName.trim() ||
              !noteText.trim() ||
              showCreateCompany
            }
          >
            <FontAwesomeIcon icon={faUpload} />
            {selectedFiles.size > 0
              ? t('misc.zhUploadSelectedFiles', { count: selectedFiles.size })
              : t('misc.zhSendNotesToBigin')
            }
          </button>
        </div>
      );
    }

    if (step === 'update') {
      return (
        <div className="zoho-upload__actions">
          <button
            className="zoho-upload__btn zoho-upload__btn--secondary"
            onClick={onClose}
          >
            {t('misc.zhCancel')}
          </button>
          <button
            className="zoho-upload__btn zoho-upload__btn--primary"
            onClick={handleUpdateUpload}
            disabled={
              !noteText.trim()
            }
          >
            <FontAwesomeIcon icon={faUpload} />
            {selectedFiles.size > 0
              ? t('misc.zhUploadSelectedVersion', { count: selectedFiles.size, version: uploadStatus?.mapping?.nextVersion })
              : t('misc.zhSendNotesVersion', { version: uploadStatus?.mapping?.nextVersion })
            }
          </button>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="zoho-upload">
      <div className="zoho-upload__overlay" onClick={onClose} />
      <div className="zoho-upload__modal">
        <div className="zoho-upload__modal-header">
          <h2>{t('misc.zhUploadToBigin')}</h2>
          <button className="zoho-upload__close" onClick={onClose}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        <div className="zoho-upload__modal-body">
          {step === 'loading' && renderLoadingStep()}
          {step === 'first-time' && renderFirstTimeStep()}
          {step === 'update' && renderUpdateStep()}
          {step === 'uploading' && renderUploadingStep()}
          {step === 'success' && renderSuccessStep()}
          {step === 'error' && renderErrorStep()}
        </div>

        <div className="zoho-upload__modal-footer">
          {renderActions()}
        </div>

        {toastMessage && (
          <Toast
            message={toastMessage.message}
            type={toastMessage.type}
            onClose={() => setToastMessage(null)}
          />
        )}
      </div>
    </div>
  );
};
