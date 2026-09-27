import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FiEdit3 } from "react-icons/fi";
import {
  faPaperPlane,
  faLink,
  faLinkSlash,
  faCopy,
  faCheck,
  faRotateLeft,
  faPencil,
  faTrash,
  faLocationDot,
  faUserPlus,
  faCircleCheck,
  faCircleXmark,
  faHourglassHalf,
  faEnvelopeOpenText,
} from "@fortawesome/free-solid-svg-icons";
import { Button } from "../atoms/Button";
import { Spinner } from "../atoms/Spinner";
import { SignatureImage } from "./SignatureImage";
import { formatLocationSummary } from "../../utils/geolocation";
import { formatTimeAgo } from "../../utils/timeAgo";
import type {
  Signer,
  SignatureRequest,
  SignerStatus,
} from "../../backendservice/api/signatureApi";

const STATUS_ICON = {
  pending: faHourglassHalf,
  sent: faEnvelopeOpenText,
  signed: faCircleCheck,
  declined: faCircleXmark,
} as const;

const STATUS_CLASS: Record<SignerStatus, string> = {
  pending: "em-sig-row__state--pending",
  sent: "em-sig-row__state--sent",
  signed: "em-sig-row__state--signed",
  declined: "em-sig-row__state--declined",
};

export interface SignerStatusPanelProps {
  agreementId: string;
  request: SignatureRequest;
  busySignerId: string | null;
  canModify: boolean;
  onSign: (signer: Signer) => void;
  onSendInvite: (signer: Signer) => void;
  onCopyLink: (signer: Signer) => void | Promise<boolean | void>;
  onCreateLink: (signer: Signer) => void;
  onResetSigner: (signer: Signer) => void;
  onRevokeLink: (signer: Signer) => void;
  onEdit: (signer: Signer) => void;
  onRemove: (signer: Signer) => void;
  onShowLocation: (signer: Signer) => void;
  onAddSigner: () => void;
}

export const SignerStatusPanel: React.FC<SignerStatusPanelProps> = ({
  agreementId,
  request,
  busySignerId,
  canModify,
  onSign,
  onSendInvite,
  onCopyLink,
  onCreateLink,
  onResetSigner,
  onRevokeLink,
  onEdit,
  onRemove,
  onShowLocation,
  onAddSigner,
}) => {
  const { t } = useTranslation();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!copiedId) return;
    const timeout = setTimeout(() => setCopiedId(null), 2200);
    return () => clearTimeout(timeout);
  }, [copiedId]);

  const handleCopy = async (signer: Signer) => {
    const copied = await onCopyLink(signer);
    if (copied !== false) setCopiedId(signer.id);
  };

  const progress =
    request.totalSigners > 0
      ? Math.round((request.signedCount / request.totalSigners) * 100)
      : 0;

  return (
    <section className="em-sig-panel" aria-label={t("signatures.panel.title")}>
      <header className="em-sig-panel__head">
        <div className="em-sig-panel__headings">
          <h3 className="em-sig-panel__title">{t("signatures.panel.title")}</h3>
          <p className="em-sig-panel__sub">
            {t("signatures.panel.progress", {
              signed: request.signedCount,
              total: request.totalSigners,
            })}
          </p>
        </div>
        {canModify && (
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<FontAwesomeIcon icon={faUserPlus} />}
            onClick={onAddSigner}
          >
            {t("signatures.panel.addSigner")}
          </Button>
        )}
      </header>

      <div className="em-sig-panel__bar">
        <span
          className="em-sig-panel__bar-fill"
          style={{ width: `${progress}%` }}
        />
      </div>

      {request.signers.length === 0 ? (
        <p className="em-sig-panel__empty">{t("signatures.panel.empty")}</p>
      ) : (
        <ul className="em-sig-rows">
          {request.signers.map((signer, index) => {
            const busy = busySignerId === signer.id;
            const signed = signer.status === "signed";
            const locationSummary = formatLocationSummary(signer.location);

            return (
              <li key={signer.id} className="em-sig-row">
                <div className="em-sig-row__head">
                  <span className="em-sig-row__index">{index + 1}</span>
                  <span className="em-sig-row__placement">
                    {signer.placement || t("signatures.rows.defaultPlacement")}
                  </span>
                  <span
                    className={`em-sig-row__state ${STATUS_CLASS[signer.status]}`}
                  >
                    <FontAwesomeIcon icon={STATUS_ICON[signer.status]} />
                    {t(`signatures.status.${signer.status}`)}
                  </span>
                </div>

                <div className="em-sig-row__body">
                  <div className="em-sig-row__name">{signer.name}</div>
                  <div className="em-sig-row__meta">
                    <span>
                      {signer.title || t(`signatures.roles.${signer.role}`)}
                    </span>
                    {signer.email && (
                      <span className="em-sig-row__email">{signer.email}</span>
                    )}
                  </div>

                  {signed && signer.signedAt && (
                    <div className="em-sig-row__time">
                      {new Date(signer.signedAt).toLocaleString()}
                      {locationSummary ? ` · ${locationSummary}` : ""}
                    </div>
                  )}

                  {signer.status === "sent" && signer.invitedAt && (
                    <div className="em-sig-row__time">
                      {t("signatures.rows.sentAt", {
                        time: formatTimeAgo(signer.invitedAt),
                      })}
                    </div>
                  )}

                  {signer.status === "declined" && signer.declineReason && (
                    <div className="em-sig-row__declined">
                      {t("signatures.rows.declinedReason", {
                        reason: signer.declineReason,
                      })}
                    </div>
                  )}

                  {signer.linkActive && signer.signingUrl && (
                    <div className="em-sig-link">
                      <span className="em-sig-link__label">
                        <FontAwesomeIcon icon={faLink} />{" "}
                        {t("signatures.rows.linkLabel")}
                      </span>
                      <input
                        className="em-sig-link__value"
                        value={signer.signingUrl}
                        readOnly
                        onFocus={(event) => event.currentTarget.select()}
                        aria-label={t("signatures.rows.linkLabel")}
                      />
                      <button
                        type="button"
                        className={`em-sig-link__copy ${
                          copiedId === signer.id
                            ? "em-sig-link__copy--done"
                            : ""
                        }`}
                        onClick={() => handleCopy(signer)}
                        title={t("signatures.rows.copyLink")}
                        aria-label={t("signatures.rows.copyLink")}
                      >
                        <FontAwesomeIcon
                          icon={copiedId === signer.id ? faCheck : faCopy}
                        />
                        <span>
                          {copiedId === signer.id
                            ? t("signatures.rows.copied")
                            : t("signatures.rows.copyLink")}
                        </span>
                      </button>
                    </div>
                  )}

                  {signer.linkActive && signer.tokenExpiresAt && (
                    <div className="em-sig-row__time">
                      {t("signatures.rows.linkExpires", {
                        date: new Date(
                          signer.tokenExpiresAt,
                        ).toLocaleDateString(),
                      })}
                    </div>
                  )}

                  {signed && (
                    <div className="em-sig-row__proof">
                      <SignatureImage
                        agreementId={agreementId}
                        signerId={signer.id}
                        fallback={
                          <span
                            className="em-sig-row__typed"
                            style={{
                              fontFamily: signer.typedFontFamily || undefined,
                            }}
                          >
                            {signer.typedName}
                          </span>
                        }
                      />
                    </div>
                  )}
                </div>

                <div className="em-sig-row__actions">
                  {busy && <Spinner size="sm" />}

                  {signed ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={<FontAwesomeIcon icon={faLocationDot} />}
                      onClick={() => onShowLocation(signer)}
                      title={
                        locationSummary || t("signatures.rows.locationUnknown")
                      }
                    >
                      {t("signatures.rows.location")}
                    </Button>
                  ) : signer.status === "declined" ? (
                    <>
                      <Button
                        variant="primary"
                        size="sm"
                        leftIcon={<FontAwesomeIcon icon={faRotateLeft} />}
                        onClick={() => onResetSigner(signer)}
                        disabled={busy}
                        title={t("signatures.rows.resetTitle")}
                      >
                        {t("signatures.rows.reset")}
                      </Button>
                      {canModify && (
                        <Button
                          variant="danger"
                          size="sm"
                          leftIcon={<FontAwesomeIcon icon={faTrash} />}
                          onClick={() => onRemove(signer)}
                          disabled={busy}
                        >
                          {t("common.delete")}
                        </Button>
                      )}
                    </>
                  ) : (
                    <>
                      <Button
                        variant="primary"
                        size="sm"
                        leftIcon={<FiEdit3 />}
                        onClick={() => onSign(signer)}
                        disabled={busy}
                      >
                        {t("signatures.rows.sign")}
                      </Button>

                      <Button
                        variant="secondary"
                        size="sm"
                        leftIcon={<FontAwesomeIcon icon={faPaperPlane} />}
                        onClick={() => onSendInvite(signer)}
                        disabled={busy}
                        title={t("signatures.rows.sendLinkTitle")}
                      >
                        {signer.inviteCount > 0
                          ? t("signatures.rows.resendLink")
                          : t("signatures.rows.sendLink")}
                      </Button>

                      {signer.linkActive ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<FontAwesomeIcon icon={faLinkSlash} />}
                          onClick={() => onRevokeLink(signer)}
                          disabled={busy}
                        >
                          {t("signatures.rows.revokeLink")}
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<FontAwesomeIcon icon={faLink} />}
                          onClick={() => onCreateLink(signer)}
                          disabled={busy}
                          title={t("signatures.rows.createLinkTitle")}
                        >
                          {t("signatures.rows.createLink")}
                        </Button>
                      )}

                      {canModify && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={<FontAwesomeIcon icon={faPencil} />}
                            onClick={() => onEdit(signer)}
                            disabled={busy}
                          >
                            {t("common.edit")}
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            leftIcon={<FontAwesomeIcon icon={faTrash} />}
                            onClick={() => onRemove(signer)}
                            disabled={busy}
                          >
                            {t("common.delete")}
                          </Button>
                        </>
                      )}
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};
