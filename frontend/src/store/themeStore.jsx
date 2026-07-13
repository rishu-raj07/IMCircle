import { createContext, useContext, useEffect, useMemo, useState } from "react";

const THEME_STORAGE_KEY = "imc_theme";
const ThemeContext = createContext(null);

function getStoredTheme() {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (["system", "light", "dark"].includes(stored)) return stored;
  } catch {
    // localStorage unavailable — fall through to default
  }

  return "system";
}

function getSystemTheme() {
  if (typeof window === "undefined" || !window.matchMedia) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyThemeToDocument(theme) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
}

export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState(getStoredTheme);
  const [systemTheme, setSystemTheme] = useState(getSystemTheme);
  const theme = preference === "system" ? systemTheme : preference;

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const syncSystemTheme = (event) =>
      setSystemTheme(event.matches ? "dark" : "light");

    media.addEventListener?.("change", syncSystemTheme);
    return () => media.removeEventListener?.("change", syncSystemTheme);
  }, []);

  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, preference);
    } catch {
      // ignore storage failures (private browsing, quota, etc.)
    }
  }, [preference]);

  const value = useMemo(
    () => ({
      theme,
      preference,
      isDark: theme === "dark",
      isSystem: preference === "system",
      setTheme: (next) =>
        setPreference(["system", "light", "dark"].includes(next) ? next : "system"),
      toggleTheme: () =>
        setPreference(theme === "dark" ? "light" : "dark"),
    }),
    [preference, theme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }

  return context;
}
