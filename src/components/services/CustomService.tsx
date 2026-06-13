
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import "./ServicesSection.css";
import { CustomFieldManager, type CustomField } from "./CustomFieldManager";

export type CustomServiceData = {
  id: string;
  name: string;
  fields: CustomField[];
};

type CustomServiceProps = {
  service: CustomServiceData;
  onUpdate: (service: CustomServiceData) => void;
  onRemove: () => void;
};

export const CustomService: React.FC<CustomServiceProps> = ({
  service,
  onUpdate,
  onRemove,
}) => {
  const { t } = useTranslation();
  const [showAddDropdown, setShowAddDropdown] = useState(false);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({ ...service, name: e.target.value });
  };

  const handleFieldsChange = (fields: CustomField[]) => {
    onUpdate({ ...service, fields });
  };

  return (
    <div className="svc-card">
      {}
      <div className="svc-h-row">
        <input
          type="text"
          className="svc-h-editable"
          value={service.name}
          onChange={handleNameChange}
          placeholder={t("serviceComponents.customService.namePlaceholder")}
        />
        <button
          type="button"
          className="svc-mini"
          onClick={() => setShowAddDropdown(!showAddDropdown)}
          title={t("serviceComponents.customService.addCustomField")}
        >
          +
        </button>
        <button
          type="button"
          className="svc-remove"
          onClick={onRemove}
          title={t("serviceComponents.customService.removeService")}
        >
          −
        </button>
      </div>

      {}
      <CustomFieldManager
        fields={service.fields}
        onFieldsChange={handleFieldsChange}
        showAddDropdown={showAddDropdown}
        onToggleAddDropdown={setShowAddDropdown}
      />
    </div>
  );
};
