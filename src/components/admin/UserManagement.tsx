import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { userManagementApi } from '../../backendservice/api/userManagementApi';
import { Spinner } from '../atoms/Spinner';
import type { UserListItem, UserRole, CreateAdminPayload, CreateEmployeePayload } from '../../backendservice/types/api.types';

interface UserManagementProps {}

export function UserManagement({}: UserManagementProps) {
  const { t } = useTranslation();
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterRole, setFilterRole] = useState<UserRole | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserListItem | null>(null);

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    email: '',
    role: 'employee' as UserRole,
    isActive: true,
  });
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await userManagementApi.listUsers({
        role: filterRole === 'all' ? undefined : filterRole,
        search: searchQuery || undefined,
      });
      setUsers(response.users);
    } catch (err: any) {
      setError(err?.detail || err?.message || t('userManagement.failedToFetchUsers'));
    } finally {
      setLoading(false);
    }
  }, [filterRole, searchQuery]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (formData.password !== formData.confirmPassword) {
      setFormError(t('userManagement.passwordsDoNotMatch'));
      return;
    }

    setSubmitting(true);

    try {
      if (formData.role === 'admin') {
        const payload: CreateAdminPayload = {
          username: formData.username,
          password: formData.password,
          isActive: formData.isActive,
        };
        await userManagementApi.createAdmin(payload);
      } else {
        const payload: CreateEmployeePayload = {
          username: formData.username,
          password: formData.password,
          fullName: formData.fullName,
          email: formData.email || undefined,
          isActive: formData.isActive,
        };
        await userManagementApi.createEmployee(payload);
      }

      setShowCreateModal(false);
      resetForm();
      fetchUsers();
    } catch (err: any) {
      setFormError(err?.detail || err?.message || t('userManagement.failedToCreateUser'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setFormError(null);
    setSubmitting(true);

    try {
      await userManagementApi.updateUser(selectedUser.role, selectedUser.id, {
        username: formData.username,
        fullName: formData.fullName,
        email: formData.email || undefined,
        isActive: formData.isActive,
      });

      setShowEditModal(false);
      setSelectedUser(null);
      resetForm();
      fetchUsers();
    } catch (err: any) {
      setFormError(err?.detail || err?.message || t('userManagement.failedToUpdateUser'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: UserListItem) => {
    try {
      await userManagementApi.toggleUserStatus(user.role, user.id, !user.isActive);
      fetchUsers();
    } catch (err: any) {
      setError(err?.detail || err?.message || t('userManagement.failedToToggleStatus'));
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setFormError(null);

    if (newPassword !== confirmNewPassword) {
      setFormError(t('userManagement.passwordsDoNotMatch'));
      return;
    }

    setSubmitting(true);

    try {
      await userManagementApi.resetPassword(selectedUser.role, selectedUser.id, {
        newPassword,
      });

      setShowResetPasswordModal(false);
      setSelectedUser(null);
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: any) {
      setFormError(err?.detail || err?.message || t('userManagement.failedToResetPassword'));
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (user: UserListItem) => {
    setSelectedUser(user);
    setFormData({
      username: user.username,
      password: '',
      confirmPassword: '',
      fullName: user.fullName,
      email: user.email || '',
      role: user.role,
      isActive: user.isActive,
    });
    setFormError(null);
    setShowEditModal(true);
  };

  const openResetPasswordModal = (user: UserListItem) => {
    setSelectedUser(user);
    setNewPassword('');
    setConfirmNewPassword('');
    setShowNewPassword(false);
    setShowConfirmNewPassword(false);
    setFormError(null);
    setShowResetPasswordModal(true);
  };

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      confirmPassword: '',
      fullName: '',
      email: '',
      role: 'employee',
      isActive: true,
    });
    setShowPassword(false);
    setShowConfirmPassword(false);
    setFormError(null);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return t('userManagement.never');
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div style={styles.container}>
      {}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>{t('userManagement.title')}</h2>
          <p style={styles.subtitle}>{t('userManagement.subtitle')}</p>
        </div>
        <button
          style={styles.primaryButton}
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
        >
          {t('userManagement.addUser')}
        </button>
      </div>

      {}
      <div style={styles.filters}>
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>{t('userManagement.roleLabel')}</label>
          <select
            style={styles.select}
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value as UserRole | 'all')}
          >
            <option value="all">{t('userManagement.allRoles')}</option>
            <option value="admin">{t('userManagement.admin')}</option>
            <option value="employee">{t('userManagement.employee')}</option>
          </select>
        </div>
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>{t('userManagement.searchLabel')}</label>
          <input
            type="text"
            style={styles.searchInput}
            placeholder={t('userManagement.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {}
      {error && (
        <div style={styles.errorAlert}>
          {error}
          <button style={styles.dismissButton} onClick={() => setError(null)}>
            &times;
          </button>
        </div>
      )}

      {}
      <div style={styles.tableContainer}>
        {loading ? (
          <div style={styles.loadingContainer}>
            <Spinner size="md" />
            <p>{t('userManagement.loadingUsers')}</p>
          </div>
        ) : users.length === 0 ? (
          <div style={styles.emptyState}>
            <p>{t('userManagement.noUsersFound')}</p>
          </div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>{t('userManagement.thUsername')}</th>
                <th style={styles.th}>{t('userManagement.thFullName')}</th>
                <th style={styles.th}>{t('userManagement.thRole')}</th>
                <th style={styles.th}>{t('userManagement.thStatus')}</th>
                <th style={styles.th}>{t('userManagement.thLastLogin')}</th>
                <th style={styles.th}>{t('userManagement.thActions')}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={`${user.role}-${user.id}`} style={styles.tr}>
                  <td style={styles.td}>{user.username}</td>
                  <td style={styles.td}>{user.fullName}</td>
                  <td style={styles.td}>
                    <span
                      style={{
                        ...styles.badge,
                        ...(user.role === 'admin' ? styles.adminBadge : styles.employeeBadge),
                      }}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <span
                      style={{
                        ...styles.badge,
                        ...(user.isActive ? styles.activeBadge : styles.inactiveBadge),
                      }}
                    >
                      {user.isActive ? t('userManagement.active') : t('userManagement.inactive')}
                    </span>
                  </td>
                  <td style={styles.td}>{formatDate(user.lastLoginAt)}</td>
                  <td style={styles.td}>
                    <div style={styles.actions}>
                      <button
                        style={styles.actionButton}
                        onClick={() => openEditModal(user)}
                        title={t('userManagement.edit')}
                      >
                        {t('userManagement.edit')}
                      </button>
                      <button
                        style={styles.actionButton}
                        onClick={() => openResetPasswordModal(user)}
                        title={t('userManagement.resetPassword')}
                      >
                        {t('userManagement.resetPassword')}
                      </button>
                      <button
                        style={{
                          ...styles.actionButton,
                          ...(user.isActive ? styles.deactivateButton : styles.activateButton),
                        }}
                        onClick={() => handleToggleStatus(user)}
                      >
                        {user.isActive ? t('userManagement.deactivate') : t('userManagement.activate')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {}
      {showCreateModal && (
        <div style={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>{t('userManagement.createNewUser')}</h3>
            <form onSubmit={handleCreateUser}>
              <div style={styles.formGroup}>
                <label style={styles.label}>{t('userManagement.roleLabel')}</label>
                <select
                  style={styles.input}
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value as UserRole })
                  }
                >
                  <option value="employee">{t('userManagement.employee')}</option>
                  <option value="admin">{t('userManagement.admin')}</option>
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>{t('userManagement.usernameRequired')}</label>
                <input
                  type="text"
                  style={styles.input}
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>{t('userManagement.passwordRequired')}</label>
                <div style={styles.passwordContainer}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    style={styles.passwordInput}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    minLength={6}
                    placeholder={t('userManagement.minLengthPlaceholder')}
                  />
                  <button
                    type="button"
                    style={styles.eyeButton}
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>{t('userManagement.confirmPasswordRequired')}</label>
                <div style={styles.passwordContainer}>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    style={styles.passwordInput}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required
                    minLength={6}
                    placeholder={t('userManagement.confirmPasswordPlaceholder')}
                  />
                  <button
                    type="button"
                    style={styles.eyeButton}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              {formData.role === 'employee' && (
                <>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>{t('userManagement.fullNameRequired')}</label>
                    <input
                      type="text"
                      style={styles.input}
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      required
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>{t('userManagement.email')}</label>
                    <input
                      type="email"
                      style={styles.input}
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </>
              )}
              {formError && <div style={styles.formError}>{formError}</div>}
              <div style={styles.modalActions}>
                <button
                  type="button"
                  style={styles.cancelButton}
                  onClick={() => setShowCreateModal(false)}
                >
                  {t('userManagement.cancel')}
                </button>
                <button type="submit" style={styles.submitButton} disabled={submitting}>
                  {submitting ? t('userManagement.creating') : t('userManagement.createUser')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {}
      {showEditModal && selectedUser && (
        <div style={styles.modalOverlay} onClick={() => setShowEditModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>{t('userManagement.editUser')}</h3>
            <form onSubmit={handleUpdateUser}>
              <div style={styles.formGroup}>
                <label style={styles.label}>{t('userManagement.username')}</label>
                <input
                  type="text"
                  style={styles.input}
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                />
              </div>
              {selectedUser.role === 'employee' && (
                <>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>{t('userManagement.fullName')}</label>
                    <input
                      type="text"
                      style={styles.input}
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      required
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>{t('userManagement.email')}</label>
                    <input
                      type="email"
                      style={styles.input}
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </>
              )}
              <div style={styles.formGroup}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                  <span style={{ marginLeft: '8px' }}>{t('userManagement.active')}</span>
                </label>
              </div>
              {formError && <div style={styles.formError}>{formError}</div>}
              <div style={styles.modalActions}>
                <button
                  type="button"
                  style={styles.cancelButton}
                  onClick={() => setShowEditModal(false)}
                >
                  {t('userManagement.cancel')}
                </button>
                <button type="submit" style={styles.submitButton} disabled={submitting}>
                  {submitting ? t('userManagement.saving') : t('userManagement.saveChanges')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {}
      {showResetPasswordModal && selectedUser && (
        <div style={styles.modalOverlay} onClick={() => setShowResetPasswordModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>{t('userManagement.resetPassword')}</h3>
            <p style={styles.modalSubtitle}>
              {t('userManagement.resetPasswordFor')} <strong>{selectedUser.username}</strong>
            </p>
            <form onSubmit={handleResetPassword}>
              <div style={styles.formGroup}>
                <label style={styles.label}>{t('userManagement.newPasswordRequired')}</label>
                <div style={styles.passwordContainer}>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    style={styles.passwordInput}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder={t('userManagement.minLengthPlaceholder')}
                  />
                  <button
                    type="button"
                    style={styles.eyeButton}
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    tabIndex={-1}
                  >
                    {showNewPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>{t('userManagement.confirmNewPasswordRequired')}</label>
                <div style={styles.passwordContainer}>
                  <input
                    type={showConfirmNewPassword ? 'text' : 'password'}
                    style={styles.passwordInput}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder={t('userManagement.confirmNewPasswordPlaceholder')}
                  />
                  <button
                    type="button"
                    style={styles.eyeButton}
                    onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                    tabIndex={-1}
                  >
                    {showConfirmNewPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              {formError && <div style={styles.formError}>{formError}</div>}
              <div style={styles.modalActions}>
                <button
                  type="button"
                  style={styles.cancelButton}
                  onClick={() => setShowResetPasswordModal(false)}
                >
                  {t('userManagement.cancel')}
                </button>
                <button type="submit" style={styles.submitButton} disabled={submitting}>
                  {submitting ? t('userManagement.resetting') : t('userManagement.resetPassword')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '24px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
  },
  title: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 4px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
  },
  primaryButton: {
    padding: '10px 20px',
    backgroundColor: '#c00000',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  filters: {
    display: 'flex',
    gap: '16px',
    marginBottom: '24px',
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  filterLabel: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#64748b',
  },
  select: {
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    minWidth: '150px',
  },
  searchInput: {
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    minWidth: '250px',
  },
  errorAlert: {
    padding: '12px 16px',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    borderRadius: '8px',
    marginBottom: '16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dismissButton: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: '#dc2626',
  },
  tableContainer: {
    backgroundColor: 'white',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
  },
  loadingContainer: {
    padding: '48px',
    textAlign: 'center',
    color: '#64748b',
  },
  emptyState: {
    padding: '48px',
    textAlign: 'center',
    color: '#64748b',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: '600',
    color: '#64748b',
    backgroundColor: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  tr: {
    borderBottom: '1px solid #e2e8f0',
  },
  td: {
    padding: '12px 16px',
    fontSize: '14px',
    color: '#1e293b',
  },
  badge: {
    display: 'inline-block',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  adminBadge: {
    backgroundColor: '#dbeafe',
    color: '#1d4ed8',
  },
  employeeBadge: {
    backgroundColor: '#e0e7ff',
    color: '#4338ca',
  },
  activeBadge: {
    backgroundColor: '#dcfce7',
    color: '#15803d',
  },
  inactiveBadge: {
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
  },
  actions: {
    display: 'flex',
    gap: '8px',
  },
  actionButton: {
    padding: '6px 12px',
    backgroundColor: '#f1f5f9',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer',
    color: '#475569',
  },
  deactivateButton: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    color: '#dc2626',
  },
  activateButton: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    color: '#15803d',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    width: '100%',
    maxWidth: '440px',
    maxHeight: '90vh',
    overflow: 'auto',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '16px',
  },
  modalSubtitle: {
    fontSize: '14px',
    color: '#64748b',
    marginBottom: '16px',
  },
  formGroup: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '4px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '14px',
    color: '#374151',
    cursor: 'pointer',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  passwordContainer: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  passwordInput: {
    width: '100%',
    padding: '10px 40px 10px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  eyeButton: {
    position: 'absolute',
    right: '10px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formError: {
    padding: '10px',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    borderRadius: '8px',
    fontSize: '14px',
    marginBottom: '16px',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '24px',
  },
  cancelButton: {
    padding: '10px 20px',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  submitButton: {
    padding: '10px 20px',
    backgroundColor: '#c00000',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
};

export default UserManagement;
