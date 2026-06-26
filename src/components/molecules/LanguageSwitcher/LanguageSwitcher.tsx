import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FiGlobe, FiCheck } from "react-icons/fi";
import { SUPPORTED_LANGUAGES } from "../../../i18n";

export interface LanguageSwitcherProps {
  className?: string;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ className = "" }) => {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const language = (i18n.language || "en").slice(0, 2);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const selectLanguage = (code: string) => {
    i18n.changeLanguage(code);
    setOpen(false);
  };

  return (
    <div className={`em-lang ${className}`.trim()} ref={ref}>
      <button
        type="button"
        className="em-lang__btn"
        onClick={() => setOpen((o) => !o)}
        aria-label={t("nav.language")}
        aria-expanded={open}
      >
        <FiGlobe />
        <span>{language.toUpperCase()}</span>
      </button>
      {open && (
        <div className="em-lang__menu">
          {SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              className="em-lang__item"
              onClick={() => selectLanguage(lang.code)}
            >
              <span>{lang.label} ({lang.code.toUpperCase()})</span>
              {language === lang.code && <FiCheck className="em-lang__check" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
