import { STORAGE_KEYS } from "@/lib/constants";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useThemeStore } from "./theme-store";

type MediaListener = (event: { matches: boolean }) => void;

let mediaListeners: MediaListener[] = [];
let isDark = false;

function setSystemDark(matches: boolean) {
  isDark = matches;
  for (const listener of mediaListeners) {
    listener({ matches });
  }
}

function stubMatchMedia() {
  const removeListener = (listener: MediaListener) => {
    mediaListeners = mediaListeners.filter((l) => l !== listener);
  };
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    get matches() {
      return isDark;
    },
    media: query,
    addEventListener: (_type: string, listener: MediaListener) => {
      mediaListeners.push(listener);
    },
    removeEventListener: (_type: string, listener: MediaListener) => {
      removeListener(listener);
    },
    addListener: (listener: MediaListener) => {
      mediaListeners.push(listener);
    },
    removeListener,
    dispatchEvent: () => false,
  }));
}

describe("useThemeStore", () => {
  beforeEach(() => {
    mediaListeners = [];
    isDark = false;
    stubMatchMedia();
    localStorage.clear();
    useThemeStore.setState({
      theme: "system",
      resolvedTheme: null,
      disableTransitionOnChange: false,
    });
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.style.colorScheme = "";
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should start uninitialized", () => {
    const { theme, resolvedTheme } = useThemeStore.getState();
    expect(theme).toBe("system");
    expect(resolvedTheme).toBeNull();
  });

  it("should apply stored theme to the document on init", () => {
    localStorage.setItem(STORAGE_KEYS.THEME, "dark");
    useThemeStore.getState()._init();

    const { theme, resolvedTheme } = useThemeStore.getState();
    expect(theme).toBe("dark");
    expect(resolvedTheme).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.classList.contains("light")).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe("dark");
  });

  it("should use the default theme when nothing is stored", () => {
    useThemeStore.getState()._init({ defaultTheme: "light" });

    const { theme, resolvedTheme } = useThemeStore.getState();
    expect(theme).toBe("light");
    expect(resolvedTheme).toBe("light");
    expect(document.documentElement.classList.contains("light")).toBe(true);
  });

  it("should resolve the system theme through the media query", () => {
    setSystemDark(true);
    useThemeStore.getState()._init();

    const { theme, resolvedTheme } = useThemeStore.getState();
    expect(theme).toBe("system");
    expect(resolvedTheme).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("should set and persist an explicit theme", () => {
    useThemeStore.getState().setTheme("dark");

    expect(localStorage.getItem(STORAGE_KEYS.THEME)).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.classList.contains("light")).toBe(false);
    const { theme, resolvedTheme } = useThemeStore.getState();
    expect(theme).toBe("dark");
    expect(resolvedTheme).toBe("dark");
  });

  it("should switch back to light clearing the dark class", () => {
    useThemeStore.getState().setTheme("dark");
    useThemeStore.getState().setTheme("light");

    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.classList.contains("light")).toBe(true);
  });

  it("should resolve stored system theme through the media query", () => {
    setSystemDark(true);
    useThemeStore.getState()._init();
    useThemeStore.getState().setTheme("system");

    const { resolvedTheme } = useThemeStore.getState();
    expect(resolvedTheme).toBe("dark");
  });

  it("should follow system preference changes while on system theme", () => {
    useThemeStore.getState()._init();
    setSystemDark(true);

    const { resolvedTheme } = useThemeStore.getState();
    expect(resolvedTheme).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("should ignore system preference changes when on an explicit theme", () => {
    useThemeStore.getState().setTheme("light");
    setSystemDark(true);

    const { resolvedTheme } = useThemeStore.getState();
    expect(resolvedTheme).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("should react to theme changes from other tabs", () => {
    useThemeStore.getState()._init();
    window.dispatchEvent(
      new StorageEvent("storage", { key: STORAGE_KEYS.THEME, newValue: "dark" }),
    );

    const { theme, resolvedTheme } = useThemeStore.getState();
    expect(theme).toBe("dark");
    expect(resolvedTheme).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("should stop reacting to system preference changes after cleanup", () => {
    const cleanup = useThemeStore.getState()._init();
    cleanup();
    setSystemDark(true);

    const { resolvedTheme } = useThemeStore.getState();
    expect(resolvedTheme).toBe("light");
  });
});
