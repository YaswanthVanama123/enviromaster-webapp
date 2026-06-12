import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { emailTemplateApi, type EmailTemplate } from '../../backendservice/api/emailTemplateApi';
import { Toast } from './Toast';
import type { ToastType } from './Toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faUndo, faEnvelope, faFileAlt } from '@fortawesome/free-solid-svg-icons';
import './EmailTemplateManager.css';

export const EmailTemplateManager: React.FC = () => {
  const { t } = useTranslation();
  const [template, setTemplate] = useState<EmailTemplate | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ message: string; type: ToastType } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadTemplate();
  }, []);

  useEffect(() => {
    if (template) {
      const changed = subject !== template.subject || body !== template.body;
      setHasChanges(changed);
    }
  }, [subject, body, template]);

  const loadTemplate = async () => {
    try {
      setLoading(true);
      const activeTemplate = await emailTemplateApi.getActiveTemplate();
      setTemplate(activeTemplate);
      setSubject(activeTemplate.subject);
      setBody(activeTemplate.body);
    } catch (error) {
      console.error('Error loading template:', error);
      setToastMessage({
        message: t('emailTemplate.failedToLoad'),
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!subject.trim()) {
      setToastMessage({
        message: t('emailTemplate.subjectEmpty'),
        type: 'error'
      });
      return;
    }

    if (!body.trim()) {
      setToastMessage({
        message: t('emailTemplate.bodyEmpty'),
        type: 'error'
      });
      return;
    }

    try {
      setSaving(true);
      const result = await emailTemplateApi.updateTemplate(subject, body);

      if (result.success) {
        setTemplate(result.template);
        setHasChanges(false);
        setToastMessage({
          message: t('emailTemplate.savedSuccess'),
          type: 'success'
        });
      }
    } catch (error) {
      console.error('Error saving template:', error);
      setToastMessage({
        message: t('emailTemplate.failedToSave'),
        type: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (template) {
      setSubject(template.subject);
      setBody(template.body);
      setHasChanges(false);
      setToastMessage({
        message: t('emailTemplate.changesDiscarded'),
        type: 'success'
      });
    }
  };

  return (
    <div className="email-template-manager">
      <div className="email-template-header">
        <div className="email-template-title">
          <FontAwesomeIcon icon={faEnvelope} />
          <h2>{t('emailTemplate.title')}</h2>
        </div>
        <div className="email-template-info">
          <FontAwesomeIcon icon={faFileAlt} />
          <span>{t('emailTemplate.infoBanner')}</span>
        </div>
      </div>

      <div className="email-template-form">
        {loading ? (
          <div className="email-template-loading-state">
            <div className="email-template-spinner-inline">
              <span className="email-template-sr-only">{t('emailTemplate.loadingTemplate')}</span>
            </div>
            <p className="email-template-loading-text">{t('emailTemplate.loadingTemplateData')}</p>
          </div>
        ) : (
          <>
            <div className="email-template-field">
              <label htmlFor="subject">
                {t('emailTemplate.emailSubject')}
                <span className="required">*</span>
              </label>
              <input
                id="subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={t('emailTemplate.subjectPlaceholder')}
                disabled={saving}
                className="email-template-input"
              />
              <small className="field-hint">{t('emailTemplate.subjectHint')}</small>
            </div>

            <div className="email-template-field">
              <label htmlFor="body">
                {t('emailTemplate.emailBody')}
                <span className="required">*</span>
              </label>
              <textarea
                id="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={t('emailTemplate.bodyPlaceholder')}
                rows={15}
                disabled={saving}
                className="email-template-textarea"
              />
              <small className="field-hint">
                {t('emailTemplate.bodyHint')}
              </small>
            </div>

            <div className="email-template-variables">
              <h3>{t('emailTemplate.templateTips')}</h3>
              <ul>
                <li>{t('emailTemplate.tip1')}</li>
                <li>{t('emailTemplate.tip2')}</li>
                <li>{t('emailTemplate.tip3')}</li>
                <li>{t('emailTemplate.tip4')}</li>
              </ul>
            </div>

            <div className="email-template-actions">
              <button
                type="button"
                className="email-template-btn email-template-btn--reset"
                onClick={handleReset}
                disabled={!hasChanges || saving}
              >
                <FontAwesomeIcon icon={faUndo} />
                {t('emailTemplate.discardChanges')}
              </button>
              <button
                type="button"
                className="email-template-btn email-template-btn--save"
                onClick={handleSave}
                disabled={!hasChanges || saving}
              >
                <FontAwesomeIcon icon={faSave} />
                {saving ? t('emailTemplate.saving') : t('emailTemplate.saveTemplate')}
              </button>
            </div>

            {template && (
              <div className="email-template-meta">
                {t('emailTemplate.lastUpdated', { date: new Date(template.updatedAt).toLocaleString() })}
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

export default EmailTemplateManager;
