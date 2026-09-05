import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { CategoryNav } from "./category-nav";

vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn().mockResolvedValue([
      { id: "cat-1", name: "Eletrônicos", slug: "eletronicos" },
      { id: "cat-2", name: "Roupas", slug: "roupas" },
      { id: "cat-3", name: "Esportes", slug: "esportes" },
    ]),
  },
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

function renderWithProviders(ui: ReactNode) {
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe("CategoryNav", () => {
  it("should render loading state initially", () => {
    const { container } = renderWithProviders(<CategoryNav />);
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("should render categories after loading", async () => {
    renderWithProviders(<CategoryNav />);
    await waitFor(() => {
      expect(screen.getByText("Eletrônicos")).toBeInTheDocument();
    });
    expect(screen.getByText("Roupas")).toBeInTheDocument();
    expect(screen.getByText("Esportes")).toBeInTheDocument();
  });

  it("should render links with correct hrefs", async () => {
    renderWithProviders(<CategoryNav />);
    await waitFor(() => {
      expect(screen.getByText("Eletrônicos")).toBeInTheDocument();
    });
    expect(screen.getByText("Eletrônicos")).toHaveAttribute("href", "/categories/eletronicos");
    expect(screen.getByText("Roupas")).toHaveAttribute("href", "/categories/roupas");
    expect(screen.getByText("Esportes")).toHaveAttribute("href", "/categories/esportes");
  });
});
