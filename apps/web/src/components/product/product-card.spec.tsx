import type { Product } from "@/types";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProductCard } from "./product-card";

vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={props.alt} src={props.src} />;
  },
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  },
}));

const mockProduct: Product = {
  id: "prod-1",
  name: "Wireless Headphones",
  slug: "wireless-headphones",
  description: "High-quality wireless headphones with noise cancellation.",
  categoryId: "cat-1",
  priceCents: 9990,
  imageUrl: "https://example.com/headphones.jpg",
  skuPrefix: "WH",
  isActive: true,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

describe("<ProductCard />", () => {
  it("should render the product name", () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.getByText("Wireless Headphones")).toBeInTheDocument();
  });

  it("should render the product description", () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.getByText(/High-quality wireless/)).toBeInTheDocument();
  });

  it("should render the formatted price", () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.getByText("R$ 99,90")).toBeInTheDocument();
  });

  it("should render the SKU prefix badge", () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.getByText("WH")).toBeInTheDocument();
  });

  it("should link to the product detail page", () => {
    render(<ProductCard product={mockProduct} />);
    const link = screen.getByRole("link", { name: /Wireless Headphones/i });
    expect(link).toHaveAttribute("href", "/product/wireless-headphones");
  });

  it("should render the buy button", () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.getByRole("button", { name: /comprar/i })).toBeInTheDocument();
  });

  it("should show the inactive badge when product is inactive", () => {
    const inactiveProduct = { ...mockProduct, isActive: false };
    render(<ProductCard product={inactiveProduct} />);
    expect(screen.getByText("Inativo")).toBeInTheDocument();
  });

  it("should not show the inactive badge when product is active", () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.queryByText("Inativo")).not.toBeInTheDocument();
  });

  it("should render fallback text when imageUrl is null", () => {
    const noImageProduct = { ...mockProduct, imageUrl: null };
    render(<ProductCard product={noImageProduct} />);
    expect(screen.getByText("Sem imagem")).toBeInTheDocument();
  });
});
