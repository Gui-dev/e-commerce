"use client";

import { useThemeStore } from "@/stores/theme-store";

export function useTheme() {
  const theme = useThemeStore((s) => s.theme);
  const resolvedTheme = useThemeStore((s) => s.resolvedTheme);

  return {
    theme,
    resolvedTheme,
    setTheme: useThemeStore((s) => s.setTheme),
  };
}
