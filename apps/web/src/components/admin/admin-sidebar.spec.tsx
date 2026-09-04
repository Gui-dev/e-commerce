import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdminSidebar } from "./admin-sidebar";

vi.mock("@/stores/auth-store", () => ({
  useAuthStore: (selector: (s: { user: { role: string } | null }) => unknown) =>
    selector({ user: { role: "admin" } }),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin",
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.ComponentProps<"a">) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("AdminSidebar", () => {
  it("renders all navigation links", () => {
    render(<AdminSidebar />);

    expect(screen.getByText("Dashboard")).toBeDefined();
    expect(screen.getByText("Pedidos")).toBeDefined();
    expect(screen.getByText("Produtos")).toBeDefined();
    expect(screen.getByText("Categorias")).toBeDefined();
    expect(screen.getByText("Usuarios")).toBeDefined();
    expect(screen.getByText("Estoque")).toBeDefined();
    expect(screen.getByText("Cupons")).toBeDefined();
  });

  it("links to correct admin paths", () => {
    render(<AdminSidebar />);

    const dashboardLink = screen.getByText("Dashboard").closest("a");
    expect(dashboardLink?.getAttribute("href")).toBe("/admin");

    const ordersLink = screen.getByText("Pedidos").closest("a");
    expect(ordersLink?.getAttribute("href")).toBe("/admin/orders");
  });
});
