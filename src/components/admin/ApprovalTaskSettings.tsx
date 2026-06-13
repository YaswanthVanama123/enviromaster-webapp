import React, { useState, useEffect } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { adminSettingsApi, type AdminSettings } from '../../backendservice/api/adminSettingsApi';
import { zohoApi, type ZohoUser } from '../../backendservice/api/zohoApi';
import { Toast } from './Toast';
import type { ToastType } from './Toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faUserCog, faBell, faSearch, faTimes, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import './ApprovalTaskSettings.css';

export const ApprovalTaskSettings: React.FC = () => {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [users, setUsers] = useState<ZohoUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ message: string; type: ToastType } | null>(null);

  const [selectedOwner, setSelectedOwner] = useState<{ id: string | null; name: string | null }>({ id: null, name: null });
  const [subjectTemplate, setSubjectTemplate] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (settings) {
      const ownerChanged =
        selectedOwner.id !== settings.defaultApprovalTaskOwner.id ||
        selectedOwner.name !== settings.defaultApprovalTaskOwner.name;
      const subjectChanged = subjectTemplate !== settings.approvalTaskSubject;

      setHasChanges(ownerChanged || subjectChanged);
    }
  }, [selectedOwner, subjectTemplate, settings]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [currentSettings, usersResponse] = await Promise.all([
        adminSettingsApi.get(),
        zohoApi.getUsers(),
      ]);

      setSettings(currentSettings);
      setSelectedOwner(currentSettings.defaultApprovalTaskOwner);
      setSubjectTemplate(currentSettings.approvalTaskSubject);

      if (usersResponse.success) {
        setUsers(usersResponse.users);
      }
    } catch (error) {
      console.error('Error loading approval task settings:', error);
      setToastMessage({ message: t('adminTools.approvalSettings.failedToLoad'), type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const updated = await adminSettingsApi.update({
        defaultApprovalTaskOwner: selectedOwner,
        approvalTaskSubject: subjectTemplate,
      });
      setSettings(updated);
      setHasChanges(false);
      setToastMessage({ message: t('adminTools.approvalSettings.savedSuccess'), type: 'success' });
    } catch (error) {
      console.error('Error saving settings:', error);
      setToastMessage({ message: t('adminTools.approvalSettings.failedToSave'), type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const handleSelectUser = (user: ZohoUser) => {
    setSelectedOwner({ id: user.id, name: user.name });
    setUserSearch('');
    setShowUserDropdown(false);
  };

  const handleClearOwner = () => {
    setSelectedOwner({ id: null, name: null });
    setUserSearch('');
  };

  if (loading) {
    return (
      <div className="ats-loading">
        <div className="ats-spinner" />
        <p className="ats-loading-text">{t('adminTools.approvalSettings.loadingSettings')}</p>
      </div>
    );
  }

  return (
    <div className="approval-task-settings">
      {toastMessage && (
        <Toast
          message={toastMessage.message}
          type={toastMessage.type}
          onClose={() => setToastMessage(null)}
        />
      )}

      <div className="ats-header">
        <div className="ats-header-icon">
          <FontAwesomeIcon icon={faUserCog} />
        </div>
        <div>
          <h2 className="ats-title">{t('adminTools.approvalSettings.title')}</h2>
          <p className="ats-subtitle">
            {t('adminTools.approvalSettings.subtitle')}
          </p>
        </div>
      </div>

      <div className="ats-info-banner">
        <FontAwesomeIcon icon={faInfoCircle} className="ats-info-icon" />
        <span>
          <Trans i18nKey="adminTools.approvalSettings.infoBanner" components={{ 1: <strong /> }} />
        </span>
      </div>

      <div className="ats-section">
        <div className="ats-field-group">
          <label className="ats-label">
            <FontAwesomeIcon icon={faUserCog} className="ats-label-icon" />
            {t('adminTools.approvalSettings.defaultTaskOwner')}
          </label>
          <p className="ats-field-hint">
            {t('adminTools.approvalSettings.defaultTaskOwnerHint')}
          </p>

          {selectedOwner.id ? (
            <div className="ats-selected-user">
              <div className="ats-selected-user-avatar">
                {selectedOwner.name?.charAt(0).toUpperCase()}
              </div>
              <div className="ats-selected-user-info">
                <span className="ats-selected-user-name">{selectedOwner.name}</span>
              </div>
              <button className="ats-clear-btn" onClick={handleClearOwner} title={t('adminTools.approvalSettings.removeOwner')}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
          ) : (
            <div className="ats-no-owner">{t('adminTools.approvalSettings.noOwnerSet')}</div>
          )}

          <div className="ats-user-search-wrapper">
            <div className="ats-search-input-row">
              <FontAwesomeIcon icon={faSearch} className="ats-search-icon" />
              <input
                type="text"
                className="ats-search-input"
                placeholder={t('adminTools.approvalSettings.searchUsersPlaceholder')}
                value={userSearch}
                onChange={(e) => {
                  setUserSearch(e.target.value);
                  setShowUserDropdown(true);
                }}
                onFocus={() => setShowUserDropdown(true)}
              />
            </div>
            {showUserDropdown && userSearch.length > 0 && (
              <div className="ats-user-dropdown">
                {filteredUsers.length === 0 ? (
                  <div className="ats-dropdown-empty">{t('adminTools.approvalSettings.noUsersFound')}</div>
                ) : (
                  filteredUsers.slice(0, 10).map((u) => (
                    <button
                      key={u.id}
                      className="ats-dropdown-item"
                      onClick={() => handleSelectUser(u)}
                    >
                      <div className="ats-dropdown-avatar">{u.name.charAt(0).toUpperCase()}</div>
                      <div className="ats-dropdown-info">
                        <span className="ats-dropdown-name">{u.name}</span>
                        <span className="ats-dropdown-email">{u.email}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        <div className="ats-field-group">
          <label className="ats-label">
            <FontAwesomeIcon icon={faBell} className="ats-label-icon" />
            {t('adminTools.approvalSettings.taskSubjectTemplate')}
          </label>
          <p className="ats-field-hint">
            <Trans
              i18nKey="adminTools.approvalSettings.subjectHint"
              values={{ placeholder: '{{agreementTitle}}' }}
              components={{ 1: <code /> }}
            />
          </p>
          <input
            type="text"
            className="ats-subject-input"
            value={subjectTemplate}
            onChange={(e) => setSubjectTemplate(e.target.value)}
            placeholder={t('adminTools.approvalSettings.subjectPlaceholder', { placeholder: '{{agreementTitle}}' })}
          />
          {subjectTemplate.includes('{{agreementTitle}}') && (
            <div className="ats-preview">
              <span className="ats-preview-label">{t('adminTools.approvalSettings.preview')}</span>{' '}
              <span className="ats-preview-text">
                {subjectTemplate.replace('{{agreementTitle}}', t('adminTools.approvalSettings.previewSample'))}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="ats-footer">
        <button
          className="ats-save-btn"
          onClick={handleSave}
          disabled={saving || !hasChanges}
        >
          <FontAwesomeIcon icon={faSave} className="ats-save-icon" />
          {saving ? t('adminTools.approvalSettings.saving') : t('adminTools.approvalSettings.saveSettings')}
        </button>
        {!hasChanges && !saving && settings && (
          <span className="ats-no-changes">{t('adminTools.approvalSettings.noUnsavedChanges')}</span>
        )}
      </div>
    </div>
  );
};
