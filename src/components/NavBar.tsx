import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { ReactNode } from "react";
import {
  FiHome,
  FiFileText,
  FiFolder,
  FiDollarSign,
  FiTrendingUp,
  FiPhone,
  FiTrash2,
  FiUsers,
  FiSettings,
  FiLogOut,
  FiUser,
  FiGlobe,
  FiCheck,
  FiX,
} from "react-icons/fi";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft, faChevronRight } from "@fortawesome/free-solid-svg-icons";
import "./NavBar.css";
import logo from "../assets/em-logo.png";
import { useAuthContext } from "./auth";
import { SUPPORTED_LANGUAGES } from "../i18n";

type NavLink = { path: string; label: string; icon: ReactNode };

export default function NavBar() {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const language = (i18n.language || "en").slice(0, 2);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, logout } = useAuthContext();
  const userMenuRef = useRef<HTMLDivElement>(null);
  const langMenuRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLElement>(null);
  const [navScroll, setNavScroll] = useState({ left: false, right: false });

  const updateNavScroll = () => {
    const el = menuRef.current;
    if (!el) return;
    const left = el.scrollLeft > 2;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
    setNavScroll((prev) => (prev.left === left && prev.right === right ? prev : { left, right }));
  };

  const scrollMenu = (direction: number) => {
    menuRef.current?.scrollBy({ left: direction * 220, behavior: "smooth" });
  };

  useEffect(() => {
    updateNavScroll();
    const el = menuRef.current;
    const active = el?.querySelector(".topnav__item--active") as HTMLElement | null;
    if (active) active.scrollIntoView({ inline: "nearest", block: "nearest" });
    window.addEventListener("resize", updateNavScroll);
    return () => window.removeEventListener("resize", updateNavScroll);
  }, [location.pathname, isAdmin]);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setUserMenuOpen(false);
        setLangMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (userMenuRef.current && !userMenuRef.current.contains(t)) setUserMenuOpen(false);
      if (langMenuRef.current && !langMenuRef.current.contains(t)) setLangMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const selectLanguage = (code: string) => {
    i18n.changeLanguage(code);
    setLangMenuOpen(false);
  };

  const links: NavLink[] = [
    { path: "/home", label: t("nav.home"), icon: <FiHome /> },
    { path: "/form-filling", label: t("nav.formFilling"), icon: <FiFileText /> },
    { path: "/saved-pdfs", label: t("nav.savedPdfs"), icon: <FiFolder /> },
    ...(!isAdmin
      ? [
          { path: "/my-commissions", label: t("nav.myCommissions"), icon: <FiDollarSign /> },
          { path: "/my-quota", label: t("nav.myQuota"), icon: <FiTrendingUp /> },
        ]
      : []),
    { path: "/my-inside-sales", label: t("nav.insideSales"), icon: <FiPhone /> },
    { path: "/trash", label: t("nav.trash"), icon: <FiTrash2 /> },
    ...(isAdmin
      ? [
          { path: "/admin-commissions", label: t("nav.employeeCommissions"), icon: <FiUsers /> },
          { path: "/admin-panel", label: t("nav.adminPanel"), icon: <FiSettings /> },
        ]
      : []),
  ];

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  const displayName = user?.fullName || user?.username || "User";
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="topnav">
      <div className="topnav__brand">
        <img src={logo} alt="EM" className="topnav__logo" />
      </div>

      <div className="topnav__menu-wrap desktop">
        {navScroll.left && (
          <button
            type="button"
            className="topnav__scroll-btn topnav__scroll-btn--left"
            onClick={() => scrollMenu(-1)}
            aria-label="Scroll navigation left"
          >
            <FontAwesomeIcon icon={faChevronLeft} />
          </button>
        )}
        <nav className="topnav__menu" ref={menuRef} onScroll={updateNavScroll}>
          {links.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`topnav__item ${isActive(link.path) ? "topnav__item--active" : ""}`}
            >
              <span className="topnav__item-icon">{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          ))}
        </nav>
        {navScroll.right && (
          <button
            type="button"
            className="topnav__scroll-btn topnav__scroll-btn--right"
            onClick={() => scrollMenu(1)}
            aria-label="Scroll navigation right"
          >
            <FontAwesomeIcon icon={faChevronRight} />
          </button>
        )}
      </div>

      <div className="topnav__right desktop">
        <div className="topnav__lang" ref={langMenuRef}>
          <button
            className="topnav__lang-btn"
            onClick={() => setLangMenuOpen((o) => !o)}
            type="button"
            aria-label={t("nav.language")}
            aria-expanded={langMenuOpen}
          >
            <FiGlobe />
            <span>{language.toUpperCase()}</span>
          </button>
          <div className={`topnav__dropdown topnav__dropdown--lang ${langMenuOpen ? "topnav__dropdown--open" : ""}`}>
            {SUPPORTED_LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                className="topnav__dropdown-item"
                onClick={() => selectLanguage(lang.code)}
                type="button"
              >
                <span>{lang.label} ({lang.code.toUpperCase()})</span>
                {language === lang.code && <FiCheck className="topnav__dropdown-check" />}
              </button>
            ))}
          </div>
        </div>

        {user && (
          <div className="topnav__user" ref={userMenuRef}>
            <button
              className="topnav__avatar"
              onClick={() => setUserMenuOpen((o) => !o)}
              type="button"
              aria-label={t("nav.userMenu")}
              aria-expanded={userMenuOpen}
            >
              {initials}
            </button>

            <div className={`topnav__dropdown topnav__dropdown--user ${userMenuOpen ? "topnav__dropdown--open" : ""}`}>
              <div className="topnav__usermenu-head">
                <span className="topnav__avatar topnav__avatar--lg">{initials}</span>
                <div className="topnav__usermenu-info">
                  <div className="topnav__usermenu-name">{displayName}</div>
                  <span className={`topnav__role-badge topnav__role-badge--${isAdmin ? "admin" : "employee"}`}>
                    {isAdmin ? t("nav.admin") : t("nav.employee")}
                  </span>
                </div>
              </div>
              <button
                className="topnav__dropdown-item"
                onClick={() => {
                  setUserMenuOpen(false);
                  navigate("/profile");
                }}
                type="button"
              >
                <FiUser />
                <span>{t("nav.profile")}</span>
              </button>
              <button
                className="topnav__dropdown-item topnav__dropdown-item--danger"
                onClick={handleLogout}
                type="button"
              >
                <FiLogOut />
                <span>{t("nav.logout")}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <button
        className="topnav__hamburger mobile"
        aria-label={t("nav.menu")}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        type="button"
      >
        <span />
        <span />
        <span />
      </button>

      <div className={`mobilemenu ${open ? "mobilemenu--open" : ""}`} role="dialog" aria-modal="true">
        <div className="mobilemenu__topbar">
          <img src={logo} alt="EM" className="mobilemenu__logo" />
          <button
            className="mobilemenu__close"
            aria-label={t("nav.closeMenu")}
            onClick={() => setOpen(false)}
            type="button"
          >
            <FiX />
          </button>
        </div>

        <div className="mobilemenu__scroll">
          {user && (
            <div className="mobilemenu__user">
              <span className="topnav__avatar">{initials}</span>
              <div className="topnav__usermenu-info">
                <span className="mobilemenu__username">{displayName}</span>
                <span className={`mobilemenu__role-badge mobilemenu__role-badge--${isAdmin ? "admin" : "employee"}`}>
                  {isAdmin ? t("nav.admin") : t("nav.employee")}
                </span>
              </div>
            </div>
          )}

          {links.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`mobilemenu__item ${isActive(link.path) ? "active" : ""}`}
              onClick={() => setOpen(false)}
            >
              <span className="topnav__item-icon">{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          ))}

          <Link
            to="/profile"
            className={`mobilemenu__item ${isActive("/profile") ? "active" : ""}`}
            onClick={() => setOpen(false)}
          >
            <span className="topnav__item-icon"><FiUser /></span>
            <span>{t("nav.profile")}</span>
          </Link>

          <div className="mobilemenu__lang">
            <span className="mobilemenu__lang-label"><FiGlobe /> {t("nav.language")}</span>
            <div className="mobilemenu__lang-options">
              {SUPPORTED_LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  className={`mobilemenu__lang-chip ${language === lang.code ? "active" : ""}`}
                  onClick={() => selectLanguage(lang.code)}
                  type="button"
                >
                  {lang.code.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {user && (
            <button
              className="mobilemenu__logout-btn"
              onClick={() => {
                setOpen(false);
                handleLogout();
              }}
              type="button"
            >
              <FiLogOut />
              <span>{t("nav.logout")}</span>
            </button>
          )}
        </div>
      </div>

      {open && <div className="mobilemenu__backdrop" onClick={() => setOpen(false)} />}
    </header>
  );
}
