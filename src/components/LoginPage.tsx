import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUser,
  faLock,
  faEye,
  faEyeSlash,
  faCheck,
  faRightToBracket,
  faTriangleExclamation,
  faLocationDot,
} from "@fortawesome/free-solid-svg-icons";
import { useAuthContext } from "./auth";
import { Spinner } from "./atoms/Spinner";
import type { UserRole } from "../backendservice/types/api.types";
import logo from "../assets/em-logo.png";
import "./LoginPage.css";

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { login, loading, isAuthenticated } = useAuthContext();

  const [activeTab, setActiveTab] = useState<UserRole>("employee");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [hasNavigated, setHasNavigated] = useState(false);

  useEffect(() => {
    if (isAuthenticated && !hasNavigated) {
      setHasNavigated(true);
      const from = (location.state as any)?.from?.pathname || "/home";

      setTimeout(() => {
        navigate(from, { replace: true });
      }, 0);
    }
  }, [isAuthenticated, hasNavigated, navigate, location.state]);

  useEffect(() => {
    setLoginError(null);
    setUsername("");
    setPassword("");
  }, [activeTab]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoginError(null);
    try {
      await login({ username, password }, activeTab);
    } catch (err: any) {
      setLoginError(err?.message || t("auth.loginFailed"));
    }
  };

  const roleLabel =
    activeTab === "admin" ? t("auth.tabs.admin") : t("auth.tabs.employee");

  return (
    <div className="login">
      <aside className="login__brand">
        <div className="login__brand-bg" aria-hidden="true">
          <span className="login__blob login__blob--1" />
          <span className="login__blob login__blob--2" />
          <span className="login__blob login__blob--3" />
        </div>
        <div className="login__brand-inner">
          <img src={logo} alt="EnviroMaster" className="login__brand-logo" />
          <h1 className="login__brand-title">{t("auth.brand.title")}</h1>
          <p className="login__brand-region">
            <FontAwesomeIcon icon={faLocationDot} />
            {t("auth.brand.region")}
          </p>
          <p className="login__brand-desc">{t("auth.brand.desc")}</p>
          <ul className="login__brand-points">
            <li className="login__brand-point">
              <span className="login__brand-point-icon">
                <FontAwesomeIcon icon={faCheck} />
              </span>
              {t("auth.brand.point1")}
            </li>
            <li className="login__brand-point">
              <span className="login__brand-point-icon">
                <FontAwesomeIcon icon={faCheck} />
              </span>
              {t("auth.brand.point2")}
            </li>
            <li className="login__brand-point">
              <span className="login__brand-point-icon">
                <FontAwesomeIcon icon={faCheck} />
              </span>
              {t("auth.brand.point3")}
            </li>
          </ul>
        </div>
      </aside>

      <section className="login__panel">
        <div className="login__card">
          <img src={logo} alt="EnviroMaster" className="login__mobile-logo" />
          <div className="login__heading">
            <h2 className="login__title">{t("auth.welcomeBack")}</h2>
            <p className="login__subtitle">{t("auth.subtitle")}</p>
          </div>

          <div className="login__tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "employee"}
              className={`login__tab ${activeTab === "employee" ? "active" : ""}`}
              onClick={() => setActiveTab("employee")}
            >
              {t("auth.tabs.employee")}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "admin"}
              className={`login__tab ${activeTab === "admin" ? "active" : ""}`}
              onClick={() => setActiveTab("admin")}
            >
              {t("auth.tabs.admin")}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="login__form">
            <div className="login__group">
              <label className="login__label" htmlFor="login-username">
                {t("auth.username")}
              </label>
              <div className="login__input-wrap">
                <span className="login__field-icon">
                  <FontAwesomeIcon icon={faUser} />
                </span>
                <input
                  id="login-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="login__input"
                  placeholder={t("auth.usernamePlaceholder")}
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="login__group">
              <label className="login__label" htmlFor="login-password">
                {t("auth.password")}
              </label>
              <div className="login__input-wrap">
                <span className="login__field-icon">
                  <FontAwesomeIcon icon={faLock} />
                </span>
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="login__input login__input--password"
                  placeholder={t("auth.passwordPlaceholder")}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="login__eye"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                </button>
              </div>
            </div>

            {loginError && (
              <div className="login__error" role="alert">
                <FontAwesomeIcon icon={faTriangleExclamation} />
                <span>{loginError}</span>
              </div>
            )}

            <button type="submit" className="login__submit" disabled={loading}>
              {loading ? (
                <>
                  <Spinner size="sm" className="em-spinner--inline" />
                  {t("auth.signingIn")}
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faRightToBracket} />
                  {t("auth.signInAs", { role: roleLabel })}
                </>
              )}
            </button>
          </form>

          <p className="login__info">
            {activeTab === "admin"
              ? t("auth.info.admin")
              : t("auth.info.employee")}
          </p>
        </div>
      </section>
    </div>
  );
};

export default LoginPage;
