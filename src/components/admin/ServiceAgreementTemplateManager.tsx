import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { serviceAgreementTemplateApi, type ServiceAgreementTemplate } from '../../backendservice/api/serviceAgreementTemplateApi';
import { Toast } from './Toast';
import type { ToastType } from './Toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faUndo, faFileContract, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import './ServiceAgreementTemplateManager.css';

export const ServiceAgreementTemplateManager: React.FC = () => {
  const { t } = useTranslation();
  const [template, setTemplate] = useState<ServiceAgreementTemplate | null>(null);
  const [formData, setFormData] = useState({
    term1: '',
    term2: '',
    term3: '',
    term4: '',
    term5: '',
    term6: '',
    term7: '',
    noteText: '',
    titleText: '',
    subtitleText: '',
    retainDispensersLabel: '',
    disposeDispensersLabel: '',
    emSalesRepLabel: '',
    insideSalesRepLabel: '',
    authorityText: '',
    customerContactLabel: '',
    customerSignatureLabel: '',
    customerDateLabel: '',
    emFranchiseeLabel: '',
    emSignatureLabel: '',
    emDateLabel: '',
    pageNumberText: ''
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ message: string; type: ToastType } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeSection, setActiveSection] = useState<'terms' | 'labels'>('terms');

  useEffect(() => {
    loadTemplate();
  }, []);

  useEffect(() => {
    if (template) {
      const changed = Object.keys(formData).some(
        (key) => formData[key as keyof typeof formData] !== template[key as keyof ServiceAgreementTemplate]
      );
      setHasChanges(changed);
    }
  }, [formData, template]);

  const loadTemplate = async () => {
    try {
      setLoading(true);
      const activeTemplate = await serviceAgreementTemplateApi.getActiveTemplate();
      setTemplate(activeTemplate);
      setFormData({
        term1: activeTemplate.term1,
        term2: activeTemplate.term2,
        term3: activeTemplate.term3,
        term4: activeTemplate.term4,
        term5: activeTemplate.term5,
        term6: activeTemplate.term6,
        term7: activeTemplate.term7,
        noteText: activeTemplate.noteText,
        titleText: activeTemplate.titleText,
        subtitleText: activeTemplate.subtitleText,
        retainDispensersLabel: activeTemplate.retainDispensersLabel,
        disposeDispensersLabel: activeTemplate.disposeDispensersLabel,
        emSalesRepLabel: activeTemplate.emSalesRepLabel,
        insideSalesRepLabel: activeTemplate.insideSalesRepLabel,
        authorityText: activeTemplate.authorityText,
        customerContactLabel: activeTemplate.customerContactLabel,
        customerSignatureLabel: activeTemplate.customerSignatureLabel,
        customerDateLabel: activeTemplate.customerDateLabel,
        emFranchiseeLabel: activeTemplate.emFranchiseeLabel,
        emSignatureLabel: activeTemplate.emSignatureLabel,
        emDateLabel: activeTemplate.emDateLabel,
        pageNumberText: activeTemplate.pageNumberText
      });
    } catch (error) {
      console.error('Error loading template:', error);
      setToastMessage({
        message: t('serviceAgreementTemplate.failedToLoad'),
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const requiredFields = ['term1', 'term2', 'term3', 'term4', 'term5', 'term6', 'term7', 'noteText'];
    for (const field of requiredFields) {
      if (!formData[field as keyof typeof formData].trim()) {
        setToastMessage({
          message: t('serviceAgreementTemplate.fieldEmpty', { field }),
          type: 'error'
        });
        return;
      }
    }

    try {
      setSaving(true);
      const result = await serviceAgreementTemplateApi.updateTemplate(formData);

      if (result.success) {
        setTemplate(result.template);
        setHasChanges(false);
        setToastMessage({
          message: t('serviceAgreementTemplate.savedSuccess'),
          type: 'success'
        });
      }
    } catch (error) {
      console.error('Error saving template:', error);
      setToastMessage({
        message: t('serviceAgreementTemplate.failedToSave'),
        type: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (template) {
      setFormData({
        term1: template.term1,
        term2: template.term2,
        term3: template.term3,
        term4: template.term4,
        term5: template.term5,
        term6: template.term6,
        term7: template.term7,
        noteText: template.noteText,
        titleText: template.titleText,
        subtitleText: template.subtitleText,
        retainDispensersLabel: template.retainDispensersLabel,
        disposeDispensersLabel: template.disposeDispensersLabel,
        emSalesRepLabel: template.emSalesRepLabel,
        insideSalesRepLabel: template.insideSalesRepLabel,
        authorityText: template.authorityText,
        customerContactLabel: template.customerContactLabel,
        customerSignatureLabel: template.customerSignatureLabel,
        customerDateLabel: template.customerDateLabel,
        emFranchiseeLabel: template.emFranchiseeLabel,
        emSignatureLabel: template.emSignatureLabel,
        emDateLabel: template.emDateLabel,
        pageNumberText: template.pageNumberText
      });
      setHasChanges(false);
      setToastMessage({
        message: t('serviceAgreementTemplate.changesDiscarded'),
        type: 'success'
      });
    }
  };

  const handleFieldChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="service-agreement-template-manager">
      <div className="sa-template-header">
        <div className="sa-template-title">
          <FontAwesomeIcon icon={faFileContract} />
          <h2>{t('serviceAgreementTemplate.title')}</h2>
        </div>
        <div className="sa-template-info">
          <FontAwesomeIcon icon={faInfoCircle} />
          <span>{t('serviceAgreementTemplate.infoBanner')}</span>
        </div>
      </div>

      <div className="sa-template-tabs">
        <button
          type="button"
          className={`sa-tab ${activeSection === 'terms' ? 'active' : ''}`}
          onClick={() => setActiveSection('terms')}
        >
          {t('serviceAgreementTemplate.tabTerms')}
        </button>
        <button
          type="button"
          className={`sa-tab ${activeSection === 'labels' ? 'active' : ''}`}
          onClick={() => setActiveSection('labels')}
        >
          {t('serviceAgreementTemplate.tabLabels')}
        </button>
      </div>

      <div className="sa-template-form">
        {loading ? (
          <div className="sa-template-loading-state">
            <div className="sa-template-spinner-inline">
              <span className="sa-template-sr-only">{t('serviceAgreementTemplate.loadingTemplate')}</span>
            </div>
            <p className="sa-template-loading-text">{t('serviceAgreementTemplate.loadingTemplateData')}</p>
          </div>
        ) : (
          <>
            {activeSection === 'terms' && (
              <div className="sa-section">
                <h3>{t('serviceAgreementTemplate.agreementTerms')}</h3>

                <div className="sa-template-field">
                  <label htmlFor="term1">
                    {t('serviceAgreementTemplate.term1')}
                    <span className="required">*</span>
                  </label>
                  <textarea
                    id="term1"
                    value={formData.term1}
                    onChange={(e) => handleFieldChange('term1', e.target.value)}
                    rows={3}
                    disabled={saving}
                    className="sa-template-textarea"
                  />
                </div>

                <div className="sa-template-field">
                  <label htmlFor="term2">
                    {t('serviceAgreementTemplate.term2')}
                    <span className="required">*</span>
                  </label>
                  <textarea
                    id="term2"
                    value={formData.term2}
                    onChange={(e) => handleFieldChange('term2', e.target.value)}
                    rows={3}
                    disabled={saving}
                    className="sa-template-textarea"
                  />
                </div>

                <div className="sa-template-field">
                  <label htmlFor="term3">
                    {t('serviceAgreementTemplate.term3')}
                    <span className="required">*</span>
                  </label>
                  <textarea
                    id="term3"
                    value={formData.term3}
                    onChange={(e) => handleFieldChange('term3', e.target.value)}
                    rows={5}
                    disabled={saving}
                    className="sa-template-textarea"
                  />
                </div>

                <div className="sa-template-field">
                  <label htmlFor="term4">
                    {t('serviceAgreementTemplate.term4')}
                    <span className="required">*</span>
                  </label>
                  <textarea
                    id="term4"
                    value={formData.term4}
                    onChange={(e) => handleFieldChange('term4', e.target.value)}
                    rows={3}
                    disabled={saving}
                    className="sa-template-textarea"
                  />
                </div>

                <div className="sa-template-field">
                  <label htmlFor="term5">
                    {t('serviceAgreementTemplate.term5')}
                    <span className="required">*</span>
                  </label>
                  <textarea
                    id="term5"
                    value={formData.term5}
                    onChange={(e) => handleFieldChange('term5', e.target.value)}
                    rows={4}
                    disabled={saving}
                    className="sa-template-textarea"
                  />
                </div>

                <div className="sa-template-field">
                  <label htmlFor="term6">
                    {t('serviceAgreementTemplate.term6')}
                    <span className="required">*</span>
                  </label>
                  <textarea
                    id="term6"
                    value={formData.term6}
                    onChange={(e) => handleFieldChange('term6', e.target.value)}
                    rows={3}
                    disabled={saving}
                    className="sa-template-textarea"
                  />
                </div>

                <div className="sa-template-field">
                  <label htmlFor="term7">
                    {t('serviceAgreementTemplate.term7')}
                    <span className="required">*</span>
                  </label>
                  <textarea
                    id="term7"
                    value={formData.term7}
                    onChange={(e) => handleFieldChange('term7', e.target.value)}
                    rows={2}
                    disabled={saving}
                    className="sa-template-textarea"
                  />
                </div>

                <div className="sa-template-field">
                  <label htmlFor="noteText">
                    {t('serviceAgreementTemplate.noteText')}
                    <span className="required">*</span>
                  </label>
                  <textarea
                    id="noteText"
                    value={formData.noteText}
                    onChange={(e) => handleFieldChange('noteText', e.target.value)}
                    rows={3}
                    disabled={saving}
                    className="sa-template-textarea"
                  />
                </div>
              </div>
            )}

            {activeSection === 'labels' && (
              <div className="sa-section">
                <h3>{t('serviceAgreementTemplate.documentLabels')}</h3>

                <div className="sa-subsection">
                  <h4>{t('serviceAgreementTemplate.headerSection')}</h4>

                  <div className="sa-template-field">
                    <label htmlFor="titleText">{t('serviceAgreementTemplate.titleText')}</label>
                    <input
                      id="titleText"
                      type="text"
                      value={formData.titleText}
                      onChange={(e) => handleFieldChange('titleText', e.target.value)}
                      disabled={saving}
                      className="sa-template-input"
                    />
                  </div>

                  <div className="sa-template-field">
                    <label htmlFor="subtitleText">{t('serviceAgreementTemplate.subtitleText')}</label>
                    <input
                      id="subtitleText"
                      type="text"
                      value={formData.subtitleText}
                      onChange={(e) => handleFieldChange('subtitleText', e.target.value)}
                      disabled={saving}
                      className="sa-template-input"
                    />
                  </div>
                </div>

                <div className="sa-subsection">
                  <h4>{t('serviceAgreementTemplate.dispenserOptions')}</h4>

                  <div className="sa-template-field">
                    <label htmlFor="retainDispensersLabel">{t('serviceAgreementTemplate.retainDispensersLabel')}</label>
                    <input
                      id="retainDispensersLabel"
                      type="text"
                      value={formData.retainDispensersLabel}
                      onChange={(e) => handleFieldChange('retainDispensersLabel', e.target.value)}
                      disabled={saving}
                      className="sa-template-input"
                    />
                  </div>

                  <div className="sa-template-field">
                    <label htmlFor="disposeDispensersLabel">{t('serviceAgreementTemplate.disposeDispensersLabel')}</label>
                    <input
                      id="disposeDispensersLabel"
                      type="text"
                      value={formData.disposeDispensersLabel}
                      onChange={(e) => handleFieldChange('disposeDispensersLabel', e.target.value)}
                      disabled={saving}
                      className="sa-template-input"
                    />
                  </div>
                </div>

                <div className="sa-subsection">
                  <h4>{t('serviceAgreementTemplate.representativeLabels')}</h4>

                  <div className="sa-template-field">
                    <label htmlFor="emSalesRepLabel">{t('serviceAgreementTemplate.emSalesRepLabel')}</label>
                    <input
                      id="emSalesRepLabel"
                      type="text"
                      value={formData.emSalesRepLabel}
                      onChange={(e) => handleFieldChange('emSalesRepLabel', e.target.value)}
                      disabled={saving}
                      className="sa-template-input"
                    />
                  </div>

                  <div className="sa-template-field">
                    <label htmlFor="insideSalesRepLabel">{t('serviceAgreementTemplate.insideSalesRepLabel')}</label>
                    <input
                      id="insideSalesRepLabel"
                      type="text"
                      value={formData.insideSalesRepLabel}
                      onChange={(e) => handleFieldChange('insideSalesRepLabel', e.target.value)}
                      disabled={saving}
                      className="sa-template-input"
                    />
                  </div>
                </div>

                <div className="sa-subsection">
                  <h4>{t('serviceAgreementTemplate.signatureSection')}</h4>

                  <div className="sa-template-field">
                    <label htmlFor="authorityText">{t('serviceAgreementTemplate.authorityText')}</label>
                    <input
                      id="authorityText"
                      type="text"
                      value={formData.authorityText}
                      onChange={(e) => handleFieldChange('authorityText', e.target.value)}
                      disabled={saving}
                      className="sa-template-input"
                    />
                  </div>

                  <div className="sa-template-field">
                    <label htmlFor="customerContactLabel">{t('serviceAgreementTemplate.customerContactLabel')}</label>
                    <input
                      id="customerContactLabel"
                      type="text"
                      value={formData.customerContactLabel}
                      onChange={(e) => handleFieldChange('customerContactLabel', e.target.value)}
                      disabled={saving}
                      className="sa-template-input"
                    />
                  </div>

                  <div className="sa-template-field">
                    <label htmlFor="customerSignatureLabel">{t('serviceAgreementTemplate.customerSignatureLabel')}</label>
                    <input
                      id="customerSignatureLabel"
                      type="text"
                      value={formData.customerSignatureLabel}
                      onChange={(e) => handleFieldChange('customerSignatureLabel', e.target.value)}
                      disabled={saving}
                      className="sa-template-input"
                    />
                  </div>

                  <div className="sa-template-field">
                    <label htmlFor="customerDateLabel">{t('serviceAgreementTemplate.customerDateLabel')}</label>
                    <input
                      id="customerDateLabel"
                      type="text"
                      value={formData.customerDateLabel}
                      onChange={(e) => handleFieldChange('customerDateLabel', e.target.value)}
                      disabled={saving}
                      className="sa-template-input"
                    />
                  </div>

                  <div className="sa-template-field">
                    <label htmlFor="emFranchiseeLabel">{t('serviceAgreementTemplate.emFranchiseeLabel')}</label>
                    <input
                      id="emFranchiseeLabel"
                      type="text"
                      value={formData.emFranchiseeLabel}
                      onChange={(e) => handleFieldChange('emFranchiseeLabel', e.target.value)}
                      disabled={saving}
                      className="sa-template-input"
                    />
                  </div>

                  <div className="sa-template-field">
                    <label htmlFor="emSignatureLabel">{t('serviceAgreementTemplate.emSignatureLabel')}</label>
                    <input
                      id="emSignatureLabel"
                      type="text"
                      value={formData.emSignatureLabel}
                      onChange={(e) => handleFieldChange('emSignatureLabel', e.target.value)}
                      disabled={saving}
                      className="sa-template-input"
                    />
                  </div>

                  <div className="sa-template-field">
                    <label htmlFor="emDateLabel">{t('serviceAgreementTemplate.emDateLabel')}</label>
                    <input
                      id="emDateLabel"
                      type="text"
                      value={formData.emDateLabel}
                      onChange={(e) => handleFieldChange('emDateLabel', e.target.value)}
                      disabled={saving}
                      className="sa-template-input"
                    />
                  </div>
                </div>

                <div className="sa-subsection">
                  <h4>{t('serviceAgreementTemplate.footer')}</h4>

                  <div className="sa-template-field">
                    <label htmlFor="pageNumberText">{t('serviceAgreementTemplate.pageNumberText')}</label>
                    <input
                      id="pageNumberText"
                      type="text"
                      value={formData.pageNumberText}
                      onChange={(e) => handleFieldChange('pageNumberText', e.target.value)}
                      disabled={saving}
                      className="sa-template-input"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="sa-template-actions">
              <button
                type="button"
                className="sa-template-btn sa-template-btn--reset"
                onClick={handleReset}
                disabled={!hasChanges || saving}
              >
                <FontAwesomeIcon icon={faUndo} />
                {t('serviceAgreementTemplate.discardChanges')}
              </button>
              <button
                type="button"
                className="sa-template-btn sa-template-btn--save"
                onClick={handleSave}
                disabled={!hasChanges || saving}
              >
                <FontAwesomeIcon icon={faSave} />
                {saving ? t('serviceAgreementTemplate.saving') : t('serviceAgreementTemplate.saveTemplate')}
              </button>
            </div>

            {template && (
              <div className="sa-template-meta">
                {t('serviceAgreementTemplate.lastUpdated', { date: new Date(template.updatedAt).toLocaleString() })}
              </div>
            )}
          </>
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
};

export default ServiceAgreementTemplateManager;
