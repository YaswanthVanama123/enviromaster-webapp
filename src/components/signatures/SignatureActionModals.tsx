import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../atoms/Button";
import { Modal } from "../molecules";
import { SignModal } from "./SignModal";
import { SignerFormModal } from "./SignerFormModal";
import { SignatureLocationModal } from "./SignatureLocationModal";
import type { SignatureActions } from "./useSignatureActions";

export interface SignatureActionModalsProps {
  actions: SignatureActions;
}

export const SignatureActionModals: React.FC<SignatureActionModalsProps> = ({ actions }) => {
  const { t } = useTranslation();

  return (
    <>
      <SignModal
        open={!!actions.signTarget}
        signerName={actions.signTarget?.signer.name ?? ""}
        signerPlacement={actions.signTarget?.signer.placement}
        documentLabel={actions.signTarget?.documentLabel}
        submitting={actions.signing}
        error={actions.signError}
        onClose={actions.cancelSign}
        onSubmit={actions.submitSign}
      />

      <SignerFormModal
        open={!!actions.formTarget}
        signer={actions.formTarget?.signer ?? null}
        saving={actions.savingSigner}
        error={actions.formError}
        onClose={actions.cancelForm}
        onSubmit={actions.submitForm}
      />

      <SignatureLocationModal
        signer={actions.locationSigner}
        onClose={actions.hideLocation}
      />

      <Modal
        open={!!actions.removeTarget}
        onClose={actions.cancelRemove}
        size="sm"
        title={t("signatures.remove.title")}
        subtitle={actions.removeTarget?.signer.name}
        footer={
          <>
            <Button variant="secondary" onClick={actions.cancelRemove}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="danger"
              onClick={actions.confirmRemove}
              loading={actions.busySignerId === actions.removeTarget?.signer.id}
            >
              {t("common.delete")}
            </Button>
          </>
        }
      >
        <p>{t("signatures.remove.body")}</p>
      </Modal>
    </>
  );
};
