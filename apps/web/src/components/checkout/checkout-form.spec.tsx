import { server } from "@/mocks/server";
import { useAuthStore } from "@/stores/auth-store";
import { useCartStore } from "@/stores/cart-store";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CheckoutForm } from "./checkout-form";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={props.alt} src={props.src} />
  ),
}));

const mockVariant = {
  id: "var-1",
  name: "Default",
  sku: "WH-001",
  priceCents: 9990,
  product: {
    id: "prod-1",
    name: "Wireless Headphones",
    slug: "wireless-headphones",
    imageUrl: "https://example.com/headphones.jpg",
  },
};

function addItemToCart() {
  useCartStore.getState().addItem(mockVariant);
}

describe("<CheckoutForm />", () => {
  beforeEach(() => {
    useCartStore.setState({ items: [] });
    useAuthStore.setState({ token: null, isAuthenticated: false, user: null });
    localStorage.clear();
  });

  it("should show empty cart message when cart is empty", () => {
    render(<CheckoutForm />);
    expect(screen.getByText(/carrinho está vazio/i)).toBeInTheDocument();
  });

  it("should render address input fields when cart has items", () => {
    addItemToCart();
    render(<CheckoutForm />);

    expect(screen.getByLabelText(/nome do destinatário/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/rua/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/cidade/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/estado/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/cep/i)).toBeInTheDocument();
  });

  it("should render the submit button", () => {
    addItemToCart();
    render(<CheckoutForm />);

    expect(screen.getByRole("button", { name: /finalizar compra/i })).toBeInTheDocument();
  });

  it("should POST /checkout with address and country BR on submit", async () => {
    const user = userEvent.setup();
    addItemToCart();

    const checkoutSpy = vi.fn();
    server.use(
      http.post(`${API_URL}/checkout`, async ({ request }) => {
        const body = (await request.json()) as { address: Record<string, string> };
        checkoutSpy(body);
        return HttpResponse.json({ id: "order-1", status: "pending" });
      }),
      http.post(`${API_URL}/payments`, () => {
        return HttpResponse.json({ id: "payment-1", status: "pending" });
      }),
    );

    render(<CheckoutForm />);

    await user.type(screen.getByLabelText(/nome do destinatário/i), "Maria Silva");
    await user.type(screen.getByLabelText(/rua/i), "Rua das Flores, 123");
    await user.type(screen.getByLabelText(/cidade/i), "São Paulo");
    await user.type(screen.getByLabelText(/estado/i), "SP");
    await user.type(screen.getByLabelText(/cep/i), "01234-567");

    await user.click(screen.getByRole("button", { name: /finalizar compra/i }));

    expect(checkoutSpy).toHaveBeenCalledWith({
      address: {
        name: "Maria Silva",
        street: "Rua das Flores, 123",
        city: "São Paulo",
        state: "SP",
        zip: "01234-567",
        country: "BR",
      },
    });
  });

  it("should show error message when checkout fails", async () => {
    const user = userEvent.setup();
    addItemToCart();

    server.use(
      http.post(`${API_URL}/checkout`, () => {
        return HttpResponse.json(
          { error: "BAD_REQUEST", message: "Invalid order" },
          { status: 400 },
        );
      }),
    );

    render(<CheckoutForm />);

    await user.type(screen.getByLabelText(/nome do destinatário/i), "Maria");
    await user.type(screen.getByLabelText(/rua/i), "Rua 1");
    await user.type(screen.getByLabelText(/cidade/i), "SP");
    await user.type(screen.getByLabelText(/estado/i), "SP");
    await user.type(screen.getByLabelText(/cep/i), "00000-000");

    await user.click(screen.getByRole("button", { name: /finalizar compra/i }));

    expect(await screen.findByText(/api error: 400/i)).toBeInTheDocument();
  });
});
