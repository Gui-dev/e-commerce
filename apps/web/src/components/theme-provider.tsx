"use client";

import { STORAGE_KEYS } from "@/lib/constants";
import { type Theme, useThemeStore } from "@/stores/theme-store";
import { useServerInsertedHTML } from "next/navigation";
import { useEffect } from "react";

const THEME_INIT_SCRIPT = `(function () {
  var theme = null;
  try {
    theme = window.localStorage.getItem("${STORAGE_KEYS.THEME}") || "system";
  } catch (e) {}
  var dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  var resolved = theme === "system" ? (dark ? "dark" : "light") : theme;
  var root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(resolved);
  root.style.colorScheme = resolved;
})();`;

interface ThemeProviderProps {
  children: React.ReactNode;
  attribute?: string;
  defaultTheme?: Theme;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  enableSystem = true,
  disableTransitionOnChange = false,
}: ThemeProviderProps) {
  useServerInsertedHTML(() => {
    // biome-ignore lint/security/noDangerouslySetInnerHtml: script anti-FOUC injetado fora da árvore React
    return <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />;
  });

  useEffect(() => {
    return useThemeStore.getState()._init({
      defaultTheme,
      enableSystem,
      disableTransitionOnChange,
    });
  }, [defaultTheme, enableSystem, disableTransitionOnChange]);

  return <>{children}</>;
}
