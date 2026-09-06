import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { Header } from "./header";

const mockUseCartStore = vi.fn((selector) => {
  const state = { itemCount: () => 2 };
  return selector ? selector(state) : state;
});

vi.mock("@/stores/cart-store", () => ({
  useCartStore: (...args: [unknown]) => mockUseCartStore(...args),
}));

const mockUseAuthStore = vi.fn((selector) => {
  const state = { isAuthenticated: false, user: null };
  return selector ? selector(state) : state;
});

vi.mock("@/stores/auth-store", () => ({
  useAuthStore: (...args: [unknown]) => mockUseAuthStore(...args),
}));

vi.mock("@/hooks/use-theme", () => ({
  useTheme: vi.fn(() => ({
    setTheme: vi.fn(),
    resolvedTheme: "light",
  })),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => (
    <div data-testid="dropdown-menu">{children}</div>
  ),
  DropdownMenuTrigger: ({
    children,
    ...props
  }: {
    children: ReactNode;
    [key: string]: unknown;
  }) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
  DropdownMenuContent: ({ children }: { children: ReactNode }) => (
    <div data-testid="dropdown-content">{children}</div>
  ),
  DropdownMenuItem: ({ children, ...props }: { children: ReactNode; [key: string]: unknown }) => (
    <div {...props}>{children}</div>
  ),
  DropdownMenuSeparator: () => <div data-testid="dropdown-separator" />,
}));

describe("Header", () => {
  it("should render logo", () => {
    render(<Header />);
    expect(screen.getByText("KronoStore")).toBeInTheDocument();
  });

  it("should render cart link", () => {
    render(<Header />);
    expect(screen.getByRole("link", { name: /carrinho/i })).toHaveAttribute("href", "/cart");
  });

  it("should show login link when not authenticated", () => {
    render(<Header />);
    expect(screen.getByRole("link", { name: /entrar/i })).toHaveAttribute("href", "/login");
  });

  it("should show user menu when authenticated", () => {
    mockUseAuthStore.mockImplementation((selector) => {
      const state = {
        isAuthenticated: true,
        user: { id: "1", name: "User", email: "user@test.com", role: "customer" },
      };
      return selector ? selector(state) : state;
    });
    render(<Header />);
    expect(screen.getByTestId("dropdown-menu")).toBeInTheDocument();
    expect(screen.getByLabelText(/menu do usuario/i)).toBeInTheDocument();
  });

  it("should show admin link in dropdown for admin users", () => {
    mockUseAuthStore.mockImplementation((selector) => {
      const state = {
        isAuthenticated: true,
        user: { id: "1", name: "Admin", email: "admin@test.com", role: "admin" },
      };
      return selector ? selector(state) : state;
    });
    render(<Header />);
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  it("should not show admin link in dropdown for non-admin users", () => {
    mockUseAuthStore.mockImplementation((selector) => {
      const state = {
        isAuthenticated: true,
        user: { id: "1", name: "User", email: "user@test.com", role: "customer" },
      };
      return selector ? selector(state) : state;
    });
    render(<Header />);
    expect(screen.queryByText("Admin")).not.toBeInTheDocument();
  });

  it("should show cart badge with item count after mount", () => {
    mockUseCartStore.mockImplementation((selector) => {
      const state = { itemCount: () => 2 };
      return selector ? selector(state) : state;
    });
    render(<Header />);
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("should not show cart badge when the cart is empty", () => {
    mockUseCartStore.mockImplementation((selector) => {
      const state = { itemCount: () => 0 };
      return selector ? selector(state) : state;
    });
    render(<Header />);
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("should position the cart link so the badge anchors to it", () => {
    render(<Header />);
    expect(screen.getByRole("link", { name: /carrinho/i })).toHaveClass("relative");
  });
});
