import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { FaInfoCircle, FaUsers } from "react-icons/fa";
import { salesPersonApi } from "../../../backendservice/api/quotaApi";
import type {
  SalesPerson,
  SalesRole,
} from "../../../backendservice/types/quota.types";
import {
  formatCurrency,
  getSalesRoleLabel,
} from "../../../backendservice/types/quota.types";

interface SalesPersonManagerProps {
  onRefresh: () => void;
}

export const SalesPersonManager: React.FC<SalesPersonManagerProps> = ({ onRefresh }) => {
  const { t } = useTranslation();
  const [salesPersons, setSalesPersons] = useState<SalesPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPerson, setEditingPerson] = useState<SalesPerson | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterActive, setFilterActive] = useState<boolean | undefined>(true);

  const [editFormData, setEditFormData] = useState({
    salesRole: "field_sales" as SalesRole,
    territory: "",
    phone: "",
    monthlyTarget: 50000,
    periodType: "monthly" as "monthly" | "quarterly" | "annual",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadSalesPersons = useCallback(async () => {
    setLoading(true);
    const result = await salesPersonApi.getAll({
      active: filterActive,
      search: searchTerm || undefined,
    });
    if (result) {
      setSalesPersons(result.data);
    }
    setLoading(false);
  }, [filterActive, searchTerm]);

  useEffect(() => {
    loadSalesPersons();
  }, [loadSalesPersons]);

  const handleEditInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({
      ...prev,
      [name]: name === "monthlyTarget" ? parseFloat(value) || 0 : value,
    }));
  };

  const handleEdit = (person: SalesPerson) => {
    setEditingPerson(person);
    setEditFormData({
      salesRole: person.role || "field_sales",
      territory: person.territory || "",
      phone: person.phone || "",
      monthlyTarget: person.quota?.monthlyTarget || 50000,
      periodType: person.quota?.periodType || "monthly",
    });
    setFormError(null);
  };

  const handleSaveEdit = async () => {
    if (!editingPerson) return;

    setSaving(true);
    setFormError(null);

    try {
      
      const updateResult = await salesPersonApi.update(editingPerson.employeeId, {
        salesRole: editFormData.salesRole,
        territory: editFormData.territory,
        phone: editFormData.phone,
      });

      if (!updateResult) {
        setFormError(t("adminQuota.salesPersonManager.updateFailed"));
        setSaving(false);
        return;
      }

      if (
        editFormData.monthlyTarget !== editingPerson.quota?.monthlyTarget ||
        editFormData.periodType !== editingPerson.quota?.periodType
      ) {
        const quotaResult = await salesPersonApi.updateQuota(editingPerson.employeeId, {
          monthlyTarget: editFormData.monthlyTarget,
          periodType: editFormData.periodType,
        });

        if (!quotaResult) {
          setFormError(t("adminQuota.salesPersonManager.quotaUpdateFailed"));
          setSaving(false);
          return;
        }
      }

      setEditingPerson(null);
      loadSalesPersons();
      onRefresh();
    } catch (error) {
      setFormError(t("adminQuota.salesPersonManager.saveError"));
    }

    setSaving(false);
  };

  const handleCancelEdit = () => {
    setEditingPerson(null);
    setFormError(null);
  };

  return (
    <div className="sales-person-manager">
      <div className="manager-header">
        <div className="search-filters">
          <input
            type="text"
            placeholder={t("adminQuota.salesPersonManager.searchPlaceholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <select
            value={filterActive === undefined ? "all" : filterActive ? "active" : "inactive"}
            onChange={(e) => {
              if (e.target.value === "all") setFilterActive(undefined);
              else setFilterActive(e.target.value === "active");
            }}
            className="filter-select"
          >
            <option value="all">{t("adminQuota.salesPersonManager.allStatus")}</option>
            <option value="active">{t("adminQuota.salesPersonManager.activeOnly")}</option>
            <option value="inactive">{t("adminQuota.salesPersonManager.inactiveOnly")}</option>
          </select>
        </div>
        <div className="info-banner">
          <span className="info-icon"><FaInfoCircle /></span>
          <span>{t("adminQuota.salesPersonManager.infoBannerBefore")}<strong>{t("adminQuota.salesPersonManager.userManagement")}</strong>{t("adminQuota.salesPersonManager.infoBannerAfter")}</span>
        </div>
      </div>

      {}
      {editingPerson && (
        <div className="edit-modal-overlay">
          <div className="edit-modal">
            <h3>{t("adminQuota.salesPersonManager.editTitle", { name: editingPerson.name })}</h3>
            <p className="edit-subtitle">{t("adminQuota.salesPersonManager.employeeLabel", { id: editingPerson.employeeId })}</p>

            <div className="form-grid">
              <div className="form-group">
                <label>{t("adminQuota.salesPersonManager.salesRole")}</label>
                <select
                  name="salesRole"
                  value={editFormData.salesRole}
                  onChange={handleEditInputChange}
                >
                  <option value="field_sales">{t("adminQuota.salesPersonManager.fieldSales")}</option>
                  <option value="inside_sales">{t("adminQuota.salesPersonManager.insideSales")}</option>
                  <option value="account_manager">{t("adminQuota.salesPersonManager.accountManager")}</option>
                  <option value="sales_manager">{t("adminQuota.salesPersonManager.salesManager")}</option>
                </select>
              </div>
              <div className="form-group">
                <label>{t("adminQuota.salesPersonManager.territory")}</label>
                <input
                  type="text"
                  name="territory"
                  value={editFormData.territory}
                  onChange={handleEditInputChange}
                  placeholder={t("adminQuota.salesPersonManager.territoryPlaceholder")}
                />
              </div>
              <div className="form-group">
                <label>{t("adminQuota.salesPersonManager.phone")}</label>
                <input
                  type="tel"
                  name="phone"
                  value={editFormData.phone}
                  onChange={handleEditInputChange}
                  placeholder={t("adminQuota.salesPersonManager.phonePlaceholder")}
                />
              </div>
              <div className="form-group">
                <label>{t("adminQuota.salesPersonManager.monthlyQuotaTarget")}</label>
                <input
                  type="number"
                  name="monthlyTarget"
                  value={editFormData.monthlyTarget}
                  onChange={handleEditInputChange}
                  min="0"
                  step="1000"
                />
              </div>
              <div className="form-group">
                <label>{t("adminQuota.salesPersonManager.quotaPeriod")}</label>
                <select
                  name="periodType"
                  value={editFormData.periodType}
                  onChange={handleEditInputChange}
                >
                  <option value="monthly">{t("adminQuota.salesPersonManager.monthly")}</option>
                  <option value="quarterly">{t("adminQuota.salesPersonManager.quarterly")}</option>
                  <option value="annual">{t("adminQuota.salesPersonManager.annual")}</option>
                </select>
              </div>
            </div>

            {formError && <div className="form-error">{formError}</div>}

            <div className="modal-actions">
              <button className="cancel-btn" onClick={handleCancelEdit}>
                {t("adminQuota.salesPersonManager.cancel")}
              </button>
              <button className="submit-btn" onClick={handleSaveEdit} disabled={saving}>
                {saving ? t("adminQuota.salesPersonManager.saving") : t("adminQuota.salesPersonManager.saveChanges")}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading-state">{t("adminQuota.salesPersonManager.loading")}</div>
      ) : salesPersons.length === 0 ? (
        <div className="empty-state-container">
          <div className="empty-state-icon"><FaUsers /></div>
          <h3>{t("adminQuota.salesPersonManager.noEmployeesTitle")}</h3>
          <p>
            {t("adminQuota.salesPersonManager.noEmployeesTextBefore")}<strong>{t("adminQuota.salesPersonManager.userManagement")}</strong>{t("adminQuota.salesPersonManager.noEmployeesTextAfter")}<br />
            {t("adminQuota.salesPersonManager.noEmployeesTextLine2")}
          </p>
        </div>
      ) : (
        <div className="sales-persons-table-container">
          <table className="sales-persons-table">
            <thead>
              <tr>
                <th>{t("adminQuota.salesPersonManager.colUsername")}</th>
                <th>{t("adminQuota.salesPersonManager.colName")}</th>
                <th>{t("adminQuota.salesPersonManager.colEmail")}</th>
                <th>{t("adminQuota.salesPersonManager.colSalesRole")}</th>
                <th>{t("adminQuota.salesPersonManager.colTerritory")}</th>
                <th>{t("adminQuota.salesPersonManager.colQuotaTarget")}</th>
                <th>{t("adminQuota.salesPersonManager.colStatus")}</th>
                <th>{t("adminQuota.salesPersonManager.colActions")}</th>
              </tr>
            </thead>
            <tbody>
              {salesPersons.map((person) => (
                <tr key={person.employeeId} className={!person.isActive ? "inactive-row" : ""}>
                  <td className="username-cell">{person.employeeId}</td>
                  <td>{person.name}</td>
                  <td>{person.email || "-"}</td>
                  <td>{getSalesRoleLabel(person.role)}</td>
                  <td>{person.territory || "-"}</td>
                  <td>{t("adminQuota.salesPersonManager.perMonth", { value: formatCurrency(person.quota?.monthlyTarget || 50000) })}</td>
                  <td>
                    <span className={`status-badge ${person.isActive ? "active" : "inactive"}`}>
                      {person.isActive ? t("adminQuota.salesPersonManager.active") : t("adminQuota.salesPersonManager.inactive")}
                    </span>
                  </td>
                  <td className="actions-cell">
                    <button className="action-btn edit-btn" onClick={() => handleEdit(person)}>
                      {t("adminQuota.salesPersonManager.editQuota")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
