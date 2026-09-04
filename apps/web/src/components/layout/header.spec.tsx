import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Header } from "./header";

vi.mock("@/stores/cart-store", () => ({
  useCartStore: vi.fn((selector) => {
    const state = { itemCount: () => 2 };
    return selector ? selector(state) : state;
  }),
}));

vi.mock("@/stores/auth-store", () => ({
  useAuthStore: vi.fn((selector) => {
    const state = { isAuthenticated: false, user: null };
    return selector ? selector(state) : state;
  }),
}));

vi.mock("next-themes", () => ({
  useTheme: vi.fn(() => ({
    setTheme: vi.fn(),
    resolvedTheme: "light",
  })),
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
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
    expect(screen.getByRole("link", { name: /categorias/i })).toHaveAttribute("href", "/categories");
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
});
