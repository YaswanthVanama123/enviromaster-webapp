import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../atoms/Button";
import { Modal, FormField } from "../molecules";
import { Input } from "../atoms/Input";
import type { Signer, SignerInput, SignerRole } from "../../backendservice/api/signatureApi";

const ROLES: SignerRole[] = ["customer", "em_franchisee", "witness", "other"];

export interface SignerFormModalProps {
  open: boolean;
  signer: Signer | null;
  saving?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (input: SignerInput) => void;
}

const emptyForm: SignerInput = {
  name: "",
  email: "",
  title: "",
  role: "other",
  placement: "",
};

export const SignerFormModal: React.FC<SignerFormModalProps> = ({
  open,
  signer,
  saving = false,
  error = null,
  onClose,
  onSubmit,
}) => {
  const { t } = useTranslation();
  const [form, setForm] = useState<SignerInput>(emptyForm);

  useEffect(() => {
    if (!open) return;
    setForm(
      signer
        ? {
            name: signer.name,
            email: signer.email,
            title: signer.title,
            role: signer.role,
            placement: signer.placement,
          }
        : emptyForm
    );
  }, [open, signer]);

  const update = (key: keyof SignerInput, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const canSave = form.name.trim().length > 0 && !saving;

  return (
    <Modal
      open={open}
      onClose={saving ? () => undefined : onClose}
      size="sm"
      title={signer ? t("signatures.form.editTitle") : t("signatures.form.addTitle")}
      subtitle={t("signatures.form.subtitle")}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="primary"
            loading={saving}
            disabled={!canSave}
            onClick={() =>
              onSubmit({
                name: form.name.trim(),
                email: (form.email || "").trim(),
                title: (form.title || "").trim(),
                role: form.role,
                placement: (form.placement || "").trim(),
              })
            }
          >
            {signer ? t("common.save") : t("signatures.form.add")}
          </Button>
        </>
      }
    >
      {error && <p className="em-sig-form__error">{error}</p>}

      <FormField label={t("signatures.form.name")} htmlFor="signer-name" required>
        <Input
          id="signer-name"
          value={form.name}
          onChange={(event) => update("name", event.target.value)}
          placeholder={t("signatures.form.namePlaceholder")}
          disabled={saving}
          autoFocus
        />
      </FormField>

      <FormField
        label={t("signatures.form.email")}
        htmlFor="signer-email"
        hint={t("signatures.form.emailHint")}
      >
        <Input
          id="signer-email"
          type="email"
          value={form.email}
          onChange={(event) => update("email", event.target.value)}
          placeholder={t("signatures.form.emailPlaceholder")}
          disabled={saving}
        />
      </FormField>

      <FormField label={t("signatures.form.placement")} htmlFor="signer-placement">
        <Input
          id="signer-placement"
          value={form.placement}
          onChange={(event) => update("placement", event.target.value)}
          placeholder={t("signatures.form.placementPlaceholder")}
          disabled={saving}
        />
      </FormField>

      <FormField label={t("signatures.form.title")} htmlFor="signer-title">
        <Input
          id="signer-title"
          value={form.title}
          onChange={(event) => update("title", event.target.value)}
          placeholder={t("signatures.form.titlePlaceholder")}
          disabled={saving}
        />
      </FormField>

      <FormField label={t("signatures.form.role")} htmlFor="signer-role">
        <select
          id="signer-role"
          className="em-input em-input--md"
          value={form.role}
          onChange={(event) => update("role", event.target.value)}
          disabled={saving}
        >
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {t(`signatures.roles.${role}`)}
            </option>
          ))}
        </select>
      </FormField>
    </Modal>
  );
};
