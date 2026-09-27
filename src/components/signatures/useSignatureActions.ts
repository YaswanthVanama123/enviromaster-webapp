import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { signatureApi } from "../../backendservice/api";
import type {
  Signer,
  SignatureRoomResponse,
  SignerInput,
  SignPayload,
} from "../../backendservice/api/signatureApi";
import type { ToastType } from "../admin/Toast";
import { copyToClipboard } from "../../utils/clipboard";

interface SignerTarget {
  agreementId: string;
  signer: Signer;
  documentLabel?: string;
}

interface FormTarget {
  agreementId: string;
  signer: Signer | null;
}

export interface SignatureActionsOptions {
  onUpdated: (room: SignatureRoomResponse) => void;
  onToast: (message: string, type: ToastType) => void;
}

export function useSignatureActions({ onUpdated, onToast }: SignatureActionsOptions) {
  const { t } = useTranslation();

  const [signTarget, setSignTarget] = useState<SignerTarget | null>(null);
  const [signing, setSigning] = useState(false);
  const [signError, setSignError] = useState<string | null>(null);

  const [formTarget, setFormTarget] = useState<FormTarget | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [savingSigner, setSavingSigner] = useState(false);

  const [locationSigner, setLocationSigner] = useState<Signer | null>(null);
  const [removeTarget, setRemoveTarget] = useState<SignerTarget | null>(null);
  const [busySignerId, setBusySignerId] = useState<string | null>(null);

  const startSign = useCallback(
    (agreementId: string, signer: Signer, documentLabel?: string) => {
      setSignError(null);
      setSignTarget({ agreementId, signer, documentLabel });
    },
    []
  );

  const cancelSign = useCallback(() => setSignTarget(null), []);

  const submitSign = useCallback(
    async (payload: SignPayload) => {
      if (!signTarget) return;
      setSigning(true);
      setSignError(null);
      try {
        const next = await signatureApi.sign(
          signTarget.agreementId,
          signTarget.signer.id,
          payload
        );
        onUpdated(next);
        setSignTarget(null);
        onToast(
          t("signatures.room.signedToast", { name: signTarget.signer.name }),
          "success"
        );
      } catch (error) {
        setSignError(
          error instanceof Error ? error.message : t("signatures.room.signFailed")
        );
      } finally {
        setSigning(false);
      }
    },
    [signTarget, onUpdated, onToast, t]
  );

  const startAdd = useCallback((agreementId: string) => {
    setFormError(null);
    setFormTarget({ agreementId, signer: null });
  }, []);

  const startEdit = useCallback((agreementId: string, signer: Signer) => {
    setFormError(null);
    setFormTarget({ agreementId, signer });
  }, []);

  const cancelForm = useCallback(() => setFormTarget(null), []);

  const submitForm = useCallback(
    async (input: SignerInput) => {
      if (!formTarget) return;
      setSavingSigner(true);
      setFormError(null);
      try {
        const next = formTarget.signer
          ? await signatureApi.updateSigner(
              formTarget.agreementId,
              formTarget.signer.id,
              input
            )
          : await signatureApi.addSigner(formTarget.agreementId, input);
        onUpdated(next);
        setFormTarget(null);
      } catch (error) {
        setFormError(
          error instanceof Error ? error.message : t("signatures.room.signerSaveFailed")
        );
      } finally {
        setSavingSigner(false);
      }
    },
    [formTarget, onUpdated, t]
  );

  const sendInvite = useCallback(
    async (agreementId: string, signer: Signer) => {
      if (!signer.email) {
        setFormError(t("signatures.room.emailRequired"));
        setFormTarget({ agreementId, signer });
        return;
      }
      setBusySignerId(signer.id);
      try {
        await signatureApi.sendInvite(agreementId, signer.id);
        onUpdated(await signatureApi.getRoom(agreementId));
        onToast(t("signatures.room.inviteSent", { email: signer.email }), "success");
      } catch (error) {
        onToast(
          error instanceof Error ? error.message : t("signatures.room.inviteFailed"),
          "error"
        );
      } finally {
        setBusySignerId(null);
      }
    },
    [onUpdated, onToast, t]
  );

  const revokeLink = useCallback(
    async (agreementId: string, signer: Signer) => {
      setBusySignerId(signer.id);
      try {
        await signatureApi.revokeLink(agreementId, signer.id);
        onUpdated(await signatureApi.getRoom(agreementId));
        onToast(t("signatures.room.linkRevoked"), "success");
      } catch (error) {
        onToast(
          error instanceof Error ? error.message : t("signatures.room.linkRevokeFailed"),
          "error"
        );
      } finally {
        setBusySignerId(null);
      }
    },
    [onUpdated, onToast, t]
  );

  const copyLink = useCallback(
    async (signer: Signer) => {
      if (!signer.signingUrl) return false;
      const copied = await copyToClipboard(signer.signingUrl);
      onToast(
        copied ? t("signatures.room.linkCopied") : t("signatures.room.linkCopyFailed"),
        copied ? "success" : "error"
      );
      return copied;
    },
    [onToast, t]
  );

  const createLink = useCallback(
    async (agreementId: string, signer: Signer) => {
      setBusySignerId(signer.id);
      try {
        const result = await signatureApi.createLink(agreementId, signer.id);
        onUpdated(await signatureApi.getRoom(agreementId));
        const copied = await copyToClipboard(result.signingUrl);
        onToast(
          copied ? t("signatures.room.linkCreatedCopied") : t("signatures.room.linkCreated"),
          "success"
        );
      } catch (error) {
        onToast(
          error instanceof Error ? error.message : t("signatures.room.linkCreateFailed"),
          "error"
        );
      } finally {
        setBusySignerId(null);
      }
    },
    [onUpdated, onToast, t]
  );

  const resetSigner = useCallback(
    async (agreementId: string, signer: Signer) => {
      setBusySignerId(signer.id);
      try {
        const next = await signatureApi.resetSigner(agreementId, signer.id);
        onUpdated(next);
        onToast(t("signatures.room.signerReset", { name: signer.name }), "success");
      } catch (error) {
        onToast(
          error instanceof Error ? error.message : t("signatures.room.signerResetFailed"),
          "error"
        );
      } finally {
        setBusySignerId(null);
      }
    },
    [onUpdated, onToast, t]
  );

  const askRemove = useCallback(
    (agreementId: string, signer: Signer) => setRemoveTarget({ agreementId, signer }),
    []
  );

  const cancelRemove = useCallback(() => setRemoveTarget(null), []);

  const confirmRemove = useCallback(async () => {
    if (!removeTarget) return;
    setBusySignerId(removeTarget.signer.id);
    try {
      const next = await signatureApi.removeSigner(
        removeTarget.agreementId,
        removeTarget.signer.id
      );
      onUpdated(next);
      onToast(t("signatures.room.signerRemoved"), "success");
    } catch (error) {
      onToast(
        error instanceof Error ? error.message : t("signatures.room.signerRemoveFailed"),
        "error"
      );
    } finally {
      setBusySignerId(null);
      setRemoveTarget(null);
    }
  }, [removeTarget, onUpdated, onToast, t]);

  return {
    signTarget,
    signing,
    signError,
    startSign,
    cancelSign,
    submitSign,

    formTarget,
    formError,
    savingSigner,
    startAdd,
    startEdit,
    cancelForm,
    submitForm,

    sendInvite,
    revokeLink,
    copyLink,
    createLink,
    resetSigner,

    locationSigner,
    showLocation: setLocationSigner,
    hideLocation: () => setLocationSigner(null),

    removeTarget,
    askRemove,
    cancelRemove,
    confirmRemove,

    busySignerId,
  };
}

export type SignatureActions = ReturnType<typeof useSignatureActions>;
