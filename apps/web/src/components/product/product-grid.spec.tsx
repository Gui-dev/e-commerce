import { server } from "@/mocks/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { ProductGrid } from "./product-grid";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

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

describe("<ProductGrid />", () => {
  it("should render product cards from the API response", async () => {
    renderWithQuery(<ProductGrid />);

    expect(await screen.findByText("Wireless Headphones")).toBeInTheDocument();
    expect(screen.getByText("Mechanical Keyboard")).toBeInTheDocument();
  });

  it("should show loading skeletons before data loads", async () => {
    server.use(
      http.get(`${API_URL}/products`, () => {
        return new HttpResponse(null, { status: 500 });
      }),
    );

    const { container } = renderWithQuery(<ProductGrid />);

    const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("should show empty state when there are no products", async () => {
    server.use(
      http.get(`${API_URL}/products`, () => {
        return HttpResponse.json({
          products: [],
          total: 0,
          page: 1,
          limit: 12,
        });
      }),
    );

    renderWithQuery(<ProductGrid />);

    expect(await screen.findByText(/nenhum produto encontrado/i)).toBeInTheDocument();
  });
});
