import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FiArrowLeft, FiMail, FiAtSign, FiShield, FiUser } from "react-icons/fi";
import { useAuthContext } from "./auth";
import "./Profile.css";

export default function Profile() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, isAdmin } = useAuthContext();

  const displayName = user?.fullName || user?.username || "User";
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const roleLabel = isAdmin ? t("profile.admin") : t("profile.employee");

  return (
    <div className="profile">
      <button className="profile__back" type="button" onClick={() => navigate(-1)}>
        <FiArrowLeft />
        <span>{t("common.back")}</span>
      </button>

      <h1 className="profile__title">{t("profile.title")}</h1>
      <p className="profile__subtitle">{t("profile.subtitle")}</p>

      <div className="profile__grid">
        <div className="profile__card">
          <div className="profile__hero">
            <div className="profile__avatar">{initials}</div>
            <div className="profile__hero-info">
              <div className="profile__hero-name">{displayName}</div>
              <div className="profile__hero-username">@{user?.username}</div>
              {user?.email && <div className="profile__hero-email">{user.email}</div>}
              <span className={`profile__role-badge profile__role-badge--${isAdmin ? "admin" : "employee"}`}>
                {roleLabel}
              </span>
            </div>
          </div>

          <div className="profile__fields">
            <div className="profile__field">
              <label className="profile__label">{t("profile.fullName")}</label>
              <div className="profile__value">{user?.fullName || "—"}</div>
            </div>
            <div className="profile__field">
              <label className="profile__label">{t("profile.username")}</label>
              <div className="profile__value">@{user?.username}</div>
            </div>
            <div className="profile__field profile__field--full">
              <label className="profile__label">{t("profile.email")}</label>
              <div className="profile__value">{user?.email || "—"}</div>
            </div>
          </div>
        </div>

        <div className="profile__side">
          <div className="profile__detail-card">
            <div className="profile__detail-icon"><FiMail /></div>
            <div>
              <div className="profile__detail-label">{t("profile.email")}</div>
              <div className="profile__detail-value">{user?.email || "—"}</div>
            </div>
          </div>

          <div className="profile__detail-card">
            <div className="profile__detail-icon"><FiAtSign /></div>
            <div>
              <div className="profile__detail-label">{t("profile.username")}</div>
              <div className="profile__detail-value">@{user?.username}</div>
            </div>
          </div>

          <div className="profile__detail-card">
            <div className="profile__detail-icon"><FiUser /></div>
            <div>
              <div className="profile__detail-label">{t("profile.fullName")}</div>
              <div className="profile__detail-value">{user?.fullName || "—"}</div>
            </div>
          </div>

          <div className="profile__detail-card">
            <div className="profile__detail-icon"><FiShield /></div>
            <div>
              <div className="profile__detail-label">{t("profile.role")}</div>
              <div className="profile__detail-value">{roleLabel}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
