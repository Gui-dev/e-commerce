import { STORAGE_KEYS } from "@/lib/constants";
import { useThemeStore } from "@/stores/theme-store";
import { render, screen } from "@testing-library/react";
import { type ReactElement, type ReactNode, isValidElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "./theme-provider";

let insertedNodes: ReactNode[] = [];

vi.mock("next/navigation", () => ({
  useServerInsertedHTML: (insert: () => ReactNode) => {
    insertedNodes.push(insert());
    return null;
  },
}));

function stubMatchMedia() {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: () => false,
  }));
}

describe("ThemeProvider", () => {
  beforeEach(() => {
    insertedNodes = [];
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

  it("should inject the anti-FOUC script through useServerInsertedHTML", () => {
    render(<ThemeProvider>app</ThemeProvider>);

    expect(insertedNodes).toHaveLength(1);
    const node = insertedNodes[0];
    expect(isValidElement(node)).toBe(true);
    expect((node as ReactElement).type).toBe("script");
    const props = (node as ReactElement<{ dangerouslySetInnerHTML?: { __html: string } }>).props;
    expect(props.dangerouslySetInnerHTML?.__html).toContain(STORAGE_KEYS.THEME);
  });

  it("should initialize the store from localStorage on mount", () => {
    localStorage.setItem(STORAGE_KEYS.THEME, "dark");
    render(<ThemeProvider>app</ThemeProvider>);

    const { theme, resolvedTheme } = useThemeStore.getState();
    expect(theme).toBe("dark");
    expect(resolvedTheme).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("should render children", () => {
    render(
      <ThemeProvider>
        <span>hello</span>
      </ThemeProvider>,
    );

    expect(screen.getByText("hello")).toBeInTheDocument();
  });
});
