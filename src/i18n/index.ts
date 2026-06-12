import i18n from "i18next";
import { initReactI18next } from "react-i18next";

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
] as const;

const STORAGE_KEY = "em_lang";
const supportedCodes: string[] = SUPPORTED_LANGUAGES.map((l) => l.code);

// Auto-load every locale namespace file: src/i18n/locales/<lang>/<namespace>.json
// Each file becomes resources[lang].translation[namespace], so keys are
// referenced as t("namespace.key"). New feature namespaces can be added simply
// by dropping en/es/fr files in — no change needed here.
const modules = import.meta.glob("./locales/*/*.json", { eager: true }) as Record<
  string,
  { default: Record<string, unknown> }
>;

const resources: Record<string, { translation: Record<string, unknown> }> = {};
for (const filePath in modules) {
  const match = filePath.match(/\/locales\/([^/]+)\/([^/]+)\.json$/);
  if (!match) continue;
  const [, lang, namespace] = match;
  if (!resources[lang]) resources[lang] = { translation: {} };
  resources[lang].translation[namespace] = modules[filePath].default;
}

const stored = (localStorage.getItem(STORAGE_KEY) || "").toLowerCase();
const initialLng = supportedCodes.includes(stored) ? stored : "en";
if (stored !== initialLng) {
  localStorage.setItem(STORAGE_KEY, initialLng);
}

i18n.use(initReactI18next).init({
  resources,
  lng: initialLng,
  fallbackLng: "en",
  supportedLngs: supportedCodes,
  interpolation: { escapeValue: false },
  returnNull: false,
});

i18n.on("languageChanged", (lng) => {
  localStorage.setItem(STORAGE_KEY, lng);
  if (typeof document !== "undefined") {
    document.documentElement.lang = lng;
  }
});

if (typeof document !== "undefined") {
  document.documentElement.lang = initialLng;
}

export default i18n;
