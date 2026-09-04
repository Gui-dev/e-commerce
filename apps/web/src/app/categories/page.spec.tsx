import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CategoriesPage from "./page";

vi.mock("next/link", () => ({
  default({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  },
}));

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = createQueryClient();
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("CategoriesPage", () => {
  it("should render page title", async () => {
    renderWithQuery(<CategoriesPage />);
    await waitFor(() => {
      expect(screen.getByText(/categorias/i)).toBeInTheDocument();
    });
  });

  it("should render category cards", async () => {
    renderWithQuery(<CategoriesPage />);
    await waitFor(() => {
      expect(screen.getByText("Eletrônicos")).toBeInTheDocument();
      expect(screen.getByText("Roupas")).toBeInTheDocument();
    });
  });

  it("should render category links", async () => {
    renderWithQuery(<CategoriesPage />);
    await waitFor(() => {
      const link = screen.getByText("Eletrônicos").closest("a");
      expect(link).toHaveAttribute("href", "/categories/eletronicos");
    });
  });
});
