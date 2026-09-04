import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ProductsPage from "./page";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={props.alt} src={props.src} />
  ),
}));

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

describe("ProductsPage", () => {
  it("should render page title", async () => {
    renderWithQuery(<ProductsPage />);
    await waitFor(() => {
      expect(screen.getByText(/produtos/i)).toBeInTheDocument();
    });
  });

  it("should render product grid", async () => {
    renderWithQuery(<ProductsPage />);
    await waitFor(() => {
      expect(screen.getByText("Wireless Headphones")).toBeInTheDocument();
    });
  });

  it("should render sidebar filters", async () => {
    renderWithQuery(<ProductsPage />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/buscar produtos/i)).toBeInTheDocument();
    });
  });

  it("should show product count", async () => {
    renderWithQuery(<ProductsPage />);
    await waitFor(() => {
      expect(screen.getByText(/produtos encontrados/i)).toBeInTheDocument();
    });
  });
});
