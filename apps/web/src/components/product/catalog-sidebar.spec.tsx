import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CatalogSidebar } from "./catalog-sidebar";

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

describe("CatalogSidebar", () => {
  it("should render search input", () => {
    renderWithQuery(<CatalogSidebar onFilterChange={vi.fn()} />);
    expect(screen.getByPlaceholderText(/buscar produtos/i)).toBeInTheDocument();
  });

  it("should render category checkboxes", async () => {
    renderWithQuery(<CatalogSidebar onFilterChange={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText("Eletrônicos")).toBeInTheDocument();
    });
  });

  it("should render price inputs", () => {
    renderWithQuery(<CatalogSidebar onFilterChange={vi.fn()} />);
    expect(screen.getByLabelText(/preço mínimo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/preço máximo/i)).toBeInTheDocument();
  });

  it("should call onFilterChange when search is debounced", async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();
    renderWithQuery(<CatalogSidebar onFilterChange={onFilterChange} />);

    const searchInput = screen.getByPlaceholderText(/buscar produtos/i);
    await user.type(searchInput, "headphones");

    await new Promise((r) => setTimeout(r, 400));
    expect(onFilterChange).toHaveBeenCalledWith(expect.objectContaining({ search: "headphones" }));
  });

  it("should call onFilterChange when category is toggled", async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();
    renderWithQuery(<CatalogSidebar onFilterChange={onFilterChange} />);

    await waitFor(() => {
      expect(screen.getByText("Eletrônicos")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Eletrônicos"));
    expect(onFilterChange).toHaveBeenCalledWith(expect.objectContaining({ categoryId: "cat-001" }));
  });

  it("should reset all filters when clear is clicked", async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();
    renderWithQuery(<CatalogSidebar onFilterChange={onFilterChange} />);

    await waitFor(() => {
      expect(screen.getByText("Eletrônicos")).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText(/buscar produtos/i), "test");
    await new Promise((r) => setTimeout(r, 400));

    await user.click(screen.getByRole("button", { name: /limpar filtros/i }));
    expect(onFilterChange).toHaveBeenCalledWith({});
  });
});
