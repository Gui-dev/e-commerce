import { STORAGE_KEYS } from "@/lib/constants";
import { create } from "zustand";

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEMES: ResolvedTheme[] = ["light", "dark"];
export const DARK_MEDIA_QUERY = "(prefers-color-scheme: dark)";

export interface ThemeOptions {
  defaultTheme?: Theme;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
}

interface ThemeState {
  theme: Theme;
  resolvedTheme: ResolvedTheme | null;
  disableTransitionOnChange: boolean;
  setTheme: (theme: Theme) => void;
  _init: (options?: ThemeOptions) => () => void;
}

const VALID_THEMES: Theme[] = ["light", "dark", "system"];

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia(DARK_MEDIA_QUERY).matches ? "dark" : "light";
}

function isTheme(value: string | null): value is Theme {
  return value !== null && (VALID_THEMES as string[]).includes(value);
}

function resolveTheme(theme: Theme, enableSystem: boolean): ResolvedTheme {
  if (theme === "system") {
    return enableSystem ? getSystemTheme() : "light";
  }
  return theme;
}

function readStoredTheme(defaultTheme: Theme): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.THEME);
    return isTheme(stored) ? stored : defaultTheme;
  } catch {
    return defaultTheme;
  }
}

function persistTheme(theme: Theme) {
  try {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  } catch {
    // persiste falhas silenciosamente (modo privado, quota, etc)
  }
}

function applyTheme(resolved: ResolvedTheme) {
  const root = document.documentElement;
  root.classList.remove(...THEMES);
  root.classList.add(resolved);
  root.style.colorScheme = resolved;
}

function blockTransitions() {
  const style = document.createElement("style");
  style.appendChild(document.createTextNode("*,*::before,*::after{transition:none!important}"));
  document.head.appendChild(style);
  window.getComputedStyle(document.body);
  window.setTimeout(() => document.head.removeChild(style), 1);
}

export const useThemeStore = create<ThemeState>()((set, get) => ({
  theme: "system",
  resolvedTheme: null,
  disableTransitionOnChange: false,

  setTheme: (theme) => {
    const { disableTransitionOnChange } = get();
    const resolved = resolveTheme(theme, true);
    if (disableTransitionOnChange) {
      blockTransitions();
    }
    applyTheme(resolved);
    persistTheme(theme);
    set({ theme, resolvedTheme: resolved });
  },

  _init: (options = {}) => {
    const {
      defaultTheme = "system",
      enableSystem = true,
      disableTransitionOnChange = false,
    } = options;

    const theme = readStoredTheme(defaultTheme);
    const resolved = resolveTheme(theme, enableSystem);
    applyTheme(resolved);
    set({ theme, resolvedTheme: resolved, disableTransitionOnChange });

    const mediaQuery = window.matchMedia(DARK_MEDIA_QUERY);
    const handleMediaChange = ({ matches }: { matches: boolean }) => {
      const { theme: currentTheme, resolvedTheme: currentResolved } = get();
      if (currentTheme !== "system" || !enableSystem) return;
      const next = matches ? "dark" : "light";
      if (next === currentResolved) return;
      applyTheme(next);
      set({ resolvedTheme: next });
    };
    mediaQuery.addEventListener("change", handleMediaChange);

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEYS.THEME) return;
      const state = get();
      const stored = isTheme(event.newValue) ? event.newValue : readStoredTheme(defaultTheme);
      if (stored === state.theme) return;
      const next = resolveTheme(stored, enableSystem);
      applyTheme(next);
      set({ theme: stored, resolvedTheme: next });
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      mediaQuery.removeEventListener("change", handleMediaChange);
      window.removeEventListener("storage", handleStorage);
    };
  },
}));
