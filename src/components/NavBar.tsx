import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
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
import "./NavBar.css";
import logo from "../assets/em-logo.png";
import { useAuthContext } from "./auth";

type NavLink = { path: string; label: string; icon: ReactNode };

const LANGUAGES = [
  { code: "EN", label: "English" },
  { code: "ES", label: "Español" },
  { code: "FR", label: "Français" },
];

export default function NavBar() {
  const [open, setOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [language, setLanguage] = useState<string>(() => localStorage.getItem("em_lang") || "EN");
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, logout } = useAuthContext();
  const userMenuRef = useRef<HTMLDivElement>(null);
  const langMenuRef = useRef<HTMLDivElement>(null);

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
    setLanguage(code);
    localStorage.setItem("em_lang", code);
    setLangMenuOpen(false);
  };

  const links: NavLink[] = [
    { path: "/home", label: "Home", icon: <FiHome /> },
    { path: "/form-filling", label: "Form Filling", icon: <FiFileText /> },
    { path: "/saved-pdfs", label: "Saved PDFs", icon: <FiFolder /> },
    ...(!isAdmin
      ? [
          { path: "/my-commissions", label: "My Commissions", icon: <FiDollarSign /> },
          { path: "/my-quota", label: "My Quota", icon: <FiTrendingUp /> },
        ]
      : []),
    { path: "/my-inside-sales", label: "Inside Sales", icon: <FiPhone /> },
    { path: "/trash", label: "Trash", icon: <FiTrash2 /> },
    ...(isAdmin
      ? [
          { path: "/admin-commissions", label: "Employee Commissions", icon: <FiUsers /> },
          { path: "/admin-panel", label: "Admin Panel", icon: <FiSettings /> },
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

      <nav className="topnav__menu desktop">
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

      <div className="topnav__right desktop">
        <div className="topnav__lang" ref={langMenuRef}>
          <button
            className="topnav__lang-btn"
            onClick={() => setLangMenuOpen((o) => !o)}
            type="button"
            aria-label="Language"
            aria-expanded={langMenuOpen}
          >
            <FiGlobe />
            <span>{language}</span>
          </button>
          <div className={`topnav__dropdown topnav__dropdown--lang ${langMenuOpen ? "topnav__dropdown--open" : ""}`}>
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                className="topnav__dropdown-item"
                onClick={() => selectLanguage(lang.code)}
                type="button"
              >
                <span>{lang.label} ({lang.code})</span>
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
              aria-label="User menu"
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
                    {isAdmin ? "Admin" : "Employee"}
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
                <span>Profile</span>
              </button>
              <button
                className="topnav__dropdown-item topnav__dropdown-item--danger"
                onClick={handleLogout}
                type="button"
              >
                <FiLogOut />
                <span>Logout</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <button
        className="topnav__hamburger mobile"
        aria-label="Menu"
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
            aria-label="Close menu"
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
                  {isAdmin ? "Admin" : "Employee"}
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
            <span>Profile</span>
          </Link>

          <div className="mobilemenu__lang">
            <span className="mobilemenu__lang-label"><FiGlobe /> Language</span>
            <div className="mobilemenu__lang-options">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  className={`mobilemenu__lang-chip ${language === lang.code ? "active" : ""}`}
                  onClick={() => selectLanguage(lang.code)}
                  type="button"
                >
                  {lang.code}
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
              <span>Logout</span>
            </button>
          )}
        </div>
      </div>

      {open && <div className="mobilemenu__backdrop" onClick={() => setOpen(false)} />}
    </header>
  );
}
