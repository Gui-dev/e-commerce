import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { Header } from "./header";

vi.mock("@/stores/cart-store", () => ({
  useCartStore: vi.fn((selector) => {
    const state = { itemCount: () => 2 };
    return selector ? selector(state) : state;
  }),
}));

const mockUseAuthStore = vi.fn((selector) => {
  const state = { isAuthenticated: false, user: null };
  return selector ? selector(state) : state;
});

vi.mock("@/stores/auth-store", () => ({
  useAuthStore: (...args: [unknown]) => mockUseAuthStore(...args),
}));

vi.mock("next-themes", () => ({
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

describe("Header", () => {
  it("should render logo", () => {
    render(<Header />);
    expect(screen.getByText("KronoStore")).toBeInTheDocument();
  });

  it("should render Produtos link", () => {
    render(<Header />);
    expect(screen.getByRole("link", { name: /produtos/i })).toHaveAttribute("href", "/products");
  });

  it("should render Categorias link", () => {
    render(<Header />);
    expect(screen.getByRole("link", { name: /categorias/i })).toHaveAttribute(
      "href",
      "/categories",
    );
  });

  it("should render Meus Pedidos link", () => {
    render(<Header />);
    expect(screen.getByRole("link", { name: /meus pedidos/i })).toHaveAttribute("href", "/orders");
  });

  it("should render cart link", () => {
    render(<Header />);
    expect(screen.getByRole("link", { name: /carrinho/i })).toHaveAttribute("href", "/cart");
  });

  it("should show login link when not authenticated", () => {
    render(<Header />);
    expect(screen.getByRole("link", { name: /entrar/i })).toHaveAttribute("href", "/login");
  });

  it("should show admin link for admin users", () => {
    mockUseAuthStore.mockImplementation((selector) => {
      const state = {
        isAuthenticated: true,
        user: { id: "1", name: "Admin", email: "admin@test.com", role: "admin" },
      };
      return selector ? selector(state) : state;
    });
    render(<Header />);
    expect(screen.getByRole("link", { name: /admin/i })).toHaveAttribute("href", "/admin");
  });

  it("should not show admin link for non-admin users", () => {
    mockUseAuthStore.mockImplementation((selector) => {
      const state = {
        isAuthenticated: true,
        user: { id: "1", name: "User", email: "user@test.com", role: "customer" },
      };
      return selector ? selector(state) : state;
    });
    render(<Header />);
    expect(screen.queryByRole("link", { name: /admin/i })).not.toBeInTheDocument();
  });
});
