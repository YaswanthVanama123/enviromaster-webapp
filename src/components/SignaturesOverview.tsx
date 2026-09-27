import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FiEdit3 } from "react-icons/fi";
import {
  faFileSignature,
  faChevronRight,
  faCircleCheck,
  faCircleXmark,
  faTriangleExclamation,
  faInbox,
  faMobileScreenButton,
  faBookOpen,
  faClockRotateLeft,
  faPaperPlane,
  faUpRightFromSquare,
  faFileShield,
  faHourglassHalf,
  faFolder,
  faFolderOpen,
  faChevronDown,
} from "@fortawesome/free-solid-svg-icons";
import { signatureApi } from "../backendservice/api";
import type {
  SignatureRequest,
  SignatureRequestStatus,
  SignatureRoomResponse,
  SignatureSummary,
  SignerStatus,
} from "../backendservice/api/signatureApi";
import { Button } from "./atoms/Button";
import { Input } from "./atoms/Input";
import { Spinner } from "./atoms/Spinner";
import { Toast } from "./admin/Toast";
import type { ToastType } from "./admin/Toast";
import { SignerStatusPanel } from "./signatures/SignerStatusPanel";
import { SignatureActionModals } from "./signatures/SignatureActionModals";
import { useSignatureActions } from "./signatures/useSignatureActions";
import { formatTimeAgo, daysUntil } from "../utils/timeAgo";
import "./SavedFiles/AgreementRow.css";
import "./SavedFiles.css";

const STATUS_FILTERS: (SignatureRequestStatus | "all")[] = [
  "all",
  "ready",
  "in_progress",
  "declined",
  "completed",
];

const SIGNER_DOT: Record<SignerStatus, string> = {
  pending: "em-sigov-dot--pending",
  sent: "em-sigov-dot--sent",
  signed: "em-sigov-dot--signed",
  declined: "em-sigov-dot--declined",
};

const PER_PAGE = 20;

const EMPTY_SUMMARY: SignatureSummary = {
  actionRequired: 0,
  waitingForOthers: 0,
  expiringSoon: 0,
  completed: 0,
  expiringSoonWindowDays: 7,
};

function soonestExpiry(request: SignatureRequest): number | null {
  const pending = request.signers
    .filter(
      (signer) =>
        signer.status !== "signed" &&
        signer.linkActive &&
        signer.tokenExpiresAt,
    )
    .map((signer) => daysUntil(signer.tokenExpiresAt))
    .filter((days): days is number => days !== null);

  if (pending.length === 0) return null;
  return Math.min(...pending);
}

export default function SignaturesOverview() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [requests, setRequests] = useState<SignatureRequest[]>([]);
  const [summary, setSummary] = useState<SignatureSummary>(EMPTY_SUMMARY);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<SignatureRequestStatus | "all">("all");
  const [mine, setMine] = useState(false);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{
    message: string;
    type: ToastType;
  } | null>(null);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType) => setToast({ message, type }),
    [],
  );

  const fetchRequests = useCallback(
    async (nextPage: number, search: string, silent = false) => {
      if (!silent) setLoading(true);
      setError(null);
      try {
        const data = await signatureApi.list({
          page: nextPage,
          limit: PER_PAGE,
          search,
          status,
          mine,
        });
        setRequests(data.requests);
        setSummary(data.summary);
        setCounts(data.counts);
        setTotal(data.total);
        setPage(data.page);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : t("signatures.overview.loadFailed"),
        );
        if (!silent) {
          setRequests([]);
          setTotal(0);
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [status, mine, t],
  );

  const fetchRequestsRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    fetchRequestsRef.current = () => fetchRequests(page, query, true);
  }, [fetchRequests, page, query]);

  useEffect(() => {
    const timeout = setTimeout(() => fetchRequests(1, query), 300);
    return () => clearTimeout(timeout);
  }, [fetchRequests, query]);

  const applyUpdatedRequest = useCallback((room: SignatureRoomResponse) => {
    setRequests((prev) =>
      prev.map((entry) =>
        entry.id === room.request.id ? room.request : entry,
      ),
    );
    fetchRequestsRef.current?.();
  }, []);

  const actions = useSignatureActions({
    onUpdated: applyUpdatedRequest,
    onToast: showToast,
  });

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  const downloadSigned = async (request: SignatureRequest) => {
    try {
      const blob = await signatureApi.downloadSignedPdf(request.agreementId);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${request.agreementTitle.replace(/[^\w-]+/g, "_")}_signed.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      showToast(
        err instanceof Error
          ? err.message
          : t("signatures.overview.downloadSignedFailed"),
        "error",
      );
    }
  };

  const openRoom = (request: SignatureRequest) => {
    navigate(`/signature-room/${request.agreementId}`, {
      state: {
        returnPath: "/signatures",
        agreementTitle: request.agreementTitle,
      },
    });
  };

  const summaryRows = [
    {
      key: "actionRequired",
      label: t("signatures.overview.summary.actionRequired"),
      value: summary.actionRequired,
      icon: <FiEdit3 className="em-sigov-sum__icon" />,
      tone: "em-sigov-sum__row--action",
    },
    {
      key: "waitingForOthers",
      label: t("signatures.overview.summary.waitingForOthers"),
      value: summary.waitingForOthers,
      icon: (
        <FontAwesomeIcon icon={faPaperPlane} className="em-sigov-sum__icon" />
      ),
      tone: "",
    },
    {
      key: "expiringSoon",
      label: t("signatures.overview.summary.expiringSoon"),
      value: summary.expiringSoon,
      icon: (
        <FontAwesomeIcon
          icon={faClockRotateLeft}
          className="em-sigov-sum__icon"
        />
      ),
      tone: summary.expiringSoon > 0 ? "em-sigov-sum__row--warn" : "",
    },
    {
      key: "completed",
      label: t("signatures.overview.summary.completed"),
      value: summary.completed,
      icon: (
        <FontAwesomeIcon icon={faCircleCheck} className="em-sigov-sum__icon" />
      ),
      tone: "",
    },
  ];

  const renderFolderCard = (request: SignatureRequest) => {
    const open = expandedIds.has(request.id);
    const outstanding = request.signers.filter(
      (signer) => signer.status === "pending",
    ).length;
    const nextSigner = request.signers.find(
      (signer) => signer.status !== "signed",
    );
    const isComplete = request.status === "completed";
    const isDeclined = request.status === "declined";
    const expiresInDays = soonestExpiry(request);
    const isExpiringSoon =
      !isComplete &&
      !isDeclined &&
      expiresInDays !== null &&
      expiresInDays >= 0 &&
      expiresInDays <= summary.expiringSoonWindowDays;

    const statusTone = isComplete
      ? "em-sigov-folder__status--done"
      : isDeclined
        ? "em-sigov-folder__status--declined"
        : isExpiringSoon
          ? "em-sigov-folder__status--warn"
          : "";

    return (
      <div className="agreement-card" key={request.id}>
        <div
          className="agreement-header"
          style={{ borderBottom: open ? "1px solid #f0f0f0" : "none" }}
        >
          <div
            className="agreement-main-content"
            onClick={() => toggleExpanded(request.id)}
          >
            <FontAwesomeIcon
              icon={open ? faChevronDown : faChevronRight}
              className="em-sigov-folder__chevron"
            />
            <FontAwesomeIcon
              icon={open ? faFolderOpen : faFolder}
              className="em-sigov-folder__icon"
            />
            <div className="em-sigov-folder__main">
              <span className="em-sigov-folder__title">
                {request.agreementTitle}
              </span>
              <div className="em-sigov-folder__meta">
                {outstanding > 0 && (
                  <span>
                    {t("signatures.overview.tasks.outstanding", {
                      count: outstanding,
                    })}
                  </span>
                )}
                <span>{formatTimeAgo(request.updatedAt)}</span>
                {request.versionLabel && <span>{request.versionLabel}</span>}
              </div>
              <div className="em-sigov-folder__chips">
                {request.signers.map((signer) => (
                  <span
                    key={signer.id}
                    className="em-sigov-folder__chip"
                    title={`${signer.placement || signer.name} — ${t(
                      `signatures.status.${signer.status}`,
                    )}`}
                  >
                    <span
                      className={`em-sigov-dot ${SIGNER_DOT[signer.status]}`}
                    />
                    {signer.name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="agreement-actions">
            <span className={`em-sigov-folder__status ${statusTone}`}>
              <FontAwesomeIcon
                icon={
                  isComplete
                    ? faCircleCheck
                    : isDeclined
                      ? faCircleXmark
                      : faHourglassHalf
                }
              />
              {isComplete
                ? t("signatures.overview.status.completed")
                : isDeclined
                  ? t("signatures.overview.status.declined")
                  : isExpiringSoon
                    ? t("signatures.overview.expiringIn", {
                        days: expiresInDays,
                      })
                    : t("signatures.overview.progress", {
                        signed: request.signedCount,
                        total: request.totalSigners,
                      })}
            </span>

            {nextSigner && (
              <button
                type="button"
                className="em-sigov-folder__btn em-sigov-folder__btn--sign"
                onClick={(event) => {
                  event.stopPropagation();
                  actions.startSign(
                    request.agreementId,
                    nextSigner,
                    request.versionLabel,
                  );
                }}
                title={t("signatures.overview.tasks.signTitle")}
              >
                <FiEdit3 />
                <span>{t("signatures.rows.sign")}</span>
              </button>
            )}

            {request.signedPdf?.available && (
              <button
                type="button"
                className="em-sigov-folder__btn em-sigov-folder__btn--signed"
                onClick={(event) => {
                  event.stopPropagation();
                  downloadSigned(request);
                }}
                title={t("signatures.overview.downloadSigned")}
              >
                <FontAwesomeIcon icon={faFileShield} />
              </button>
            )}

            <button
              type="button"
              className="em-sigov-folder__btn em-sigov-folder__btn--open"
              onClick={(event) => {
                event.stopPropagation();
                openRoom(request);
              }}
              title={t("signatures.overview.openDocument")}
            >
              <FontAwesomeIcon icon={faUpRightFromSquare} />
              <span>{t("signatures.overview.open")}</span>
            </button>
          </div>
        </div>

        {open && (
          <div className="em-sigov-folder__panel">
            <SignerStatusPanel
              agreementId={request.agreementId}
              request={request}
              busySignerId={actions.busySignerId}
              canModify
              onSign={(signer) =>
                actions.startSign(
                  request.agreementId,
                  signer,
                  request.versionLabel,
                )
              }
              onSendInvite={(signer) =>
                actions.sendInvite(request.agreementId, signer)
              }
              onCopyLink={actions.copyLink}
              onCreateLink={(signer) =>
                actions.createLink(request.agreementId, signer)
              }
              onResetSigner={(signer) =>
                actions.resetSigner(request.agreementId, signer)
              }
              onRevokeLink={(signer) =>
                actions.revokeLink(request.agreementId, signer)
              }
              onEdit={(signer) =>
                actions.startEdit(request.agreementId, signer)
              }
              onRemove={(signer) =>
                actions.askRemove(request.agreementId, signer)
              }
              onShowLocation={actions.showLocation}
              onAddSigner={() => actions.startAdd(request.agreementId)}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="em-sigov">
      <header className="em-sigov__header">
        <div className="em-sigov__heading">
          <span className="em-sigov__icon">
            <FiEdit3 />
          </span>
          <h1 className="em-sigov__title">{t("signatures.overview.title")}</h1>
        </div>
        <p className="em-sigov__description">
          {t("signatures.overview.description")}
        </p>
      </header>

      <div className="em-sigov__grid">
        <div className="em-sigov__col">
          <section className="em-sigov-card em-sigov-tasks">
            <h2 className="em-sigov-card__heading">
              {t("signatures.overview.tasks.title")}
            </h2>

            <div className="em-sigov__toolbar">
              <Input
                className="em-sigov__search"
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("signatures.overview.searchPlaceholder")}
              />
              <div className="em-sigov__filters">
                {STATUS_FILTERS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    className={`em-sigov__chip ${status === key ? "em-sigov__chip--active" : ""}`}
                    onClick={() => setStatus(key)}
                  >
                    {t(`signatures.overview.filters.${key}`)}
                    <span className="em-sigov__chip-count">
                      {counts[key] ?? 0}
                    </span>
                  </button>
                ))}
                <button
                  type="button"
                  className={`em-sigov__chip ${mine ? "em-sigov__chip--active" : ""}`}
                  onClick={() => setMine((value) => !value)}
                >
                  {t("signatures.overview.filters.mine")}
                </button>
              </div>
            </div>

            {loading ? (
              <div className="em-sigov__state">
                <Spinner size="lg" />
                <p>{t("signatures.overview.loading")}</p>
              </div>
            ) : error ? (
              <div className="em-sigov__state">
                <FontAwesomeIcon
                  icon={faTriangleExclamation}
                  className="em-sigov__state-icon"
                />
                <p>{error}</p>
                <Button
                  variant="primary"
                  onClick={() => fetchRequests(page, query)}
                >
                  {t("common.refresh")}
                </Button>
              </div>
            ) : requests.length === 0 ? (
              <div className="em-sigov-tasks__empty">
                <FontAwesomeIcon
                  icon={query ? faFileSignature : faInbox}
                  className="em-sigov-tasks__empty-icon"
                />
                <h3>
                  {query
                    ? t("signatures.overview.emptyTitle")
                    : t("signatures.overview.tasks.emptyTitle")}
                </h3>
                <p>
                  {query
                    ? t("signatures.overview.emptySearch", { query })
                    : t("signatures.overview.tasks.emptyBody")}
                </p>
              </div>
            ) : (
              <div className="em-sigov-folders">
                {requests.map(renderFolderCard)}
              </div>
            )}

            {!error && total > 0 && (
              <div className="sf__pager">
                <div className="sf__page-info">
                  {t("savedFiles.pageInfoAgreements", {
                    from: Math.min((page - 1) * PER_PAGE + 1, total),
                    to: Math.min(page * PER_PAGE, total),
                    total,
                  })}
                </div>

                <div className="sf__page-controls">
                  <button
                    type="button"
                    className="sf__link"
                    disabled={page <= 1 || loading}
                    onClick={() => fetchRequests(page - 1, query)}
                  >
                    {t("savedFiles.previous")}
                  </button>

                  <div className="sf__page-numbers">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else {
                        const start = Math.max(
                          1,
                          Math.min(page - 2, totalPages - 4),
                        );
                        pageNum = start + i;
                      }

                      return (
                        <button
                          key={pageNum}
                          type="button"
                          className={`sf__page ${page === pageNum ? "sf__page--active" : ""}`}
                          disabled={loading}
                          onClick={() => {
                            if (pageNum !== page) fetchRequests(pageNum, query);
                          }}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    className="sf__link"
                    disabled={page >= totalPages || loading}
                    onClick={() => fetchRequests(page + 1, query)}
                  >
                    {t("savedFiles.next")}
                  </button>
                </div>
              </div>
            )}
          </section>

          <div className="em-sigov-help">
            <div className="em-sigov-help__card">
              <span className="em-sigov-help__icon">
                <FontAwesomeIcon icon={faBookOpen} />
              </span>
              <div>
                <h3 className="em-sigov-help__title">
                  {t("signatures.overview.help.guideTitle")}
                </h3>
                <p className="em-sigov-help__body">
                  {t("signatures.overview.help.guideBody")}
                </p>
              </div>
            </div>
            <div className="em-sigov-help__card">
              <span className="em-sigov-help__icon">
                <FontAwesomeIcon icon={faMobileScreenButton} />
              </span>
              <div>
                <h3 className="em-sigov-help__title">
                  {t("signatures.overview.help.mobileTitle")}
                </h3>
                <p className="em-sigov-help__body">
                  {t("signatures.overview.help.mobileBody")}
                </p>
              </div>
            </div>
          </div>
        </div>

        <aside className="em-sigov-sum">
          <h2 className="em-sigov-card__heading">
            {t("signatures.overview.summary.title")}
          </h2>
          <ul className="em-sigov-sum__list">
            {summaryRows.map((row) => (
              <li key={row.key} className={`em-sigov-sum__row ${row.tone}`}>
                {row.icon}
                <span className="em-sigov-sum__label">{row.label}</span>
                <span className="em-sigov-sum__value">{row.value}</span>
              </li>
            ))}
          </ul>
          <p className="em-sigov-sum__note">
            {t("signatures.overview.summary.note", {
              days: summary.expiringSoonWindowDays,
            })}
          </p>
        </aside>
      </div>

      <SignatureActionModals actions={actions} />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </section>
  );
}
