import { useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFileSignature,
  faMoneyBillTrendUp,
  faChartLine,
  faFolderOpen,
  faArrowRight,
  faGlobe,
  faBolt,
  faLanguage,
  faRightToBracket,
} from "@fortawesome/free-solid-svg-icons";
import { useAuthContext } from "./auth";
import { SUPPORTED_LANGUAGES } from "../i18n";
import logo from "../assets/em-logo.png";
import "./Landing.css";

export default function Landing() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuthContext();
  const language = (i18n.language || "en").slice(0, 2);

  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  if (!loading && isAuthenticated) {
    return <Navigate to="/home" replace />;
  }

  const features = [
    { key: "agreements", icon: faFileSignature },
    { key: "commissions", icon: faMoneyBillTrendUp },
    { key: "quota", icon: faChartLine },
    { key: "documents", icon: faFolderOpen },
  ];

  const highlights = [
    { key: "guided", icon: faBolt },
    { key: "pdf", icon: faFileSignature },
    { key: "multilingual", icon: faLanguage },
  ];

  const steps = ["one", "two", "three"];

  return (
    <div className="landing">
      <header className="landing__header">
        <div className="landing__brand">
          <img src={logo} alt="Enviro-Master" className="landing__logo" />
          <span className="landing__tagline">{t("landing.tagline")}</span>
        </div>
        <div className="landing__header-actions">
          <div className="landing__lang">
            <FontAwesomeIcon icon={faGlobe} className="landing__lang-icon" />
            {SUPPORTED_LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                type="button"
                className={`landing__lang-chip ${language === lang.code ? "active" : ""}`}
                onClick={() => i18n.changeLanguage(lang.code)}
              >
                {lang.code.toUpperCase()}
              </button>
            ))}
          </div>
          <button className="landing__login-btn" type="button" onClick={() => navigate("/login")}>
            <FontAwesomeIcon icon={faRightToBracket} />
            {t("landing.login")}
          </button>
        </div>
      </header>

      <section className="landing__hero">
        <div className="landing__hero-bg" aria-hidden="true">
          <span className="landing__blob landing__blob--1" />
          <span className="landing__blob landing__blob--2" />
          <span className="landing__blob landing__blob--3" />
        </div>
        <div className="landing__hero-content">
          <span className="landing__hero-badge landing__anim landing__anim--1">{t("landing.badge")}</span>
          <h1 className="landing__hero-title landing__anim landing__anim--2">{t("landing.heroTitle")}</h1>
          <p className="landing__hero-subtitle landing__anim landing__anim--3">{t("landing.heroSubtitle")}</p>
          <p className="landing__hero-desc landing__anim landing__anim--4">{t("landing.heroDescription")}</p>
          <div className="landing__hero-actions landing__anim landing__anim--5">
            <button className="landing__cta-primary" type="button" onClick={() => navigate("/login")}>
              {t("landing.getStarted")} <FontAwesomeIcon icon={faArrowRight} />
            </button>
          </div>
          <div className="landing__highlights landing__anim landing__anim--6">
            {highlights.map((h) => (
              <span className="landing__highlight" key={h.key}>
                <FontAwesomeIcon icon={h.icon} />
                {t(`landing.highlights.${h.key}`)}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="landing__features">
        <div className="landing__section-head" data-reveal>
          <h2 className="landing__section-title">{t("landing.featuresTitle")}</h2>
          <p className="landing__section-sub">{t("landing.featuresSubtitle")}</p>
        </div>
        <div className="landing__features-grid">
          {features.map((f, i) => (
            <div
              className="landing__feature"
              key={f.key}
              data-reveal
              style={{ transitionDelay: `${i * 90}ms` }}
            >
              <div className="landing__feature-icon">
                <FontAwesomeIcon icon={f.icon} />
              </div>
              <h3 className="landing__feature-title">{t(`landing.features.${f.key}.title`)}</h3>
              <p className="landing__feature-desc">{t(`landing.features.${f.key}.description`)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="landing__how">
        <div className="landing__how-inner">
          <div className="landing__section-head" data-reveal>
            <h2 className="landing__section-title">{t("landing.howTitle")}</h2>
            <p className="landing__section-sub">{t("landing.howSubtitle")}</p>
          </div>
          <div className="landing__steps">
            {steps.map((s, i) => (
              <div
                className="landing__step"
                key={s}
                data-reveal
                style={{ transitionDelay: `${i * 110}ms` }}
              >
                <div className="landing__step-num">{i + 1}</div>
                <h3 className="landing__step-title">{t(`landing.steps.${s}.title`)}</h3>
                <p className="landing__step-desc">{t(`landing.steps.${s}.description`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="landing__cta" data-reveal>
        <div className="landing__cta-inner">
          <h2 className="landing__cta-title">{t("landing.ctaTitle")}</h2>
          <p className="landing__cta-desc">{t("landing.ctaDescription")}</p>
          <button className="landing__cta-primary" type="button" onClick={() => navigate("/login")}>
            {t("landing.login")} <FontAwesomeIcon icon={faArrowRight} />
          </button>
        </div>
      </section>

      <footer className="landing__footer">
        <img src={logo} alt="Enviro-Master" className="landing__footer-logo" />
        <span>© {new Date().getFullYear()} {t("landing.footer")}</span>
      </footer>
    </div>
  );
}
