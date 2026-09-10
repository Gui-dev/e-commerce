import { server } from "@/mocks/server";
import { useAuthStore } from "@/stores/auth-store";
import { useCartStore } from "@/stores/cart-store";
import { mockVariant } from "@/test/fixtures/cart";
import { render, screen, waitFor } from "@testing-library/react";
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

vi.mock("@/lib/stripe", () => ({
  getStripe: () => Promise.resolve({}),
}));

vi.mock("@stripe/react-stripe-js", () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PaymentElement: () => <div data-testid="payment-element" />,
  useStripe: () => ({ confirmPayment: vi.fn() }),
  useElements: () => ({}),
}));

function addItemToCart() {
  useCartStore.getState().addItem(mockVariant);
}

describe("<CheckoutForm />", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCartStore.setState({ items: [] });
    useAuthStore.setState({ token: null, isAuthenticated: false, user: null });
    localStorage.clear();

    server.use(
      http.post(`${API_URL}/checkout`, () =>
        HttpResponse.json({ id: "order-1", status: "pending" }),
      ),
      http.post(`${API_URL}/checkout/payment-intent`, () =>
        HttpResponse.json({
          type: "pix",
          paymentIntentId: "pi_1",
          qrCodePngUrl: "https://stripe.test/qr.png",
          qrCodeSvgUrl: "https://stripe.test/qr.svg",
          qrCodeUrl: "000201pix",
          hostedInstructionsUrl: "https://stripe.test/instructions",
          expiresAt: null,
        }),
      ),
      http.get(`${API_URL}/orders/order-1`, () =>
        HttpResponse.json({ id: "order-1", status: "pending", payment: null }),
      ),
    );
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
    expect(screen.getByLabelText(/tax id|cpf|cnpj/i)).toBeInTheDocument();
  });

  it("should render the submit button", () => {
    addItemToCart();
    render(<CheckoutForm />);

    expect(screen.getByRole("button", { name: /finalizar compra/i })).toBeInTheDocument();
  });

  it("should submit checkout then render the pix panel for pix payments", async () => {
    const user = userEvent.setup();
    addItemToCart();
    render(<CheckoutForm />);

    await user.type(screen.getByLabelText(/nome do destinatário/i), "Maria Silva");
    await user.type(screen.getByLabelText(/rua/i), "Rua das Flores, 123");
    await user.type(screen.getByLabelText(/cidade/i), "São Paulo");
    await user.type(screen.getByLabelText(/estado/i), "SP");
    await user.type(screen.getByLabelText(/cep/i), "01234-567");
    await user.type(screen.getByLabelText(/tax id|cpf|cnpj/i), "000.000.000-00");

    await user.click(screen.getByRole("button", { name: /finalizar compra/i }));

    expect(await screen.findByAltText(/qr code pix/i)).toBeInTheDocument();
  });

  it("should POST taxId with the payment intent for card payments (spy variant)", async () => {
    const user = userEvent.setup();
    addItemToCart();
    const paymentIntentSpy = vi.fn();

    server.use(
      http.post(`${API_URL}/checkout`, () =>
        HttpResponse.json({ id: "order-2", status: "pending" }),
      ),
      http.post(`${API_URL}/checkout/payment-intent`, async ({ request }) => {
        const body = (await request.json()) as { orderId: string; taxId?: string };
        paymentIntentSpy(body);
        return HttpResponse.json({
          type: "card",
          paymentIntentId: "pi_2",
          clientSecret: "cs_test_2",
        });
      }),
      http.get(`${API_URL}/orders/order-2`, () =>
        HttpResponse.json({ id: "order-2", status: "pending", payment: null }),
      ),
    );

    render(<CheckoutForm />);

    await user.type(screen.getByLabelText(/nome do destinatário/i), "Maria Silva");
    await user.type(screen.getByLabelText(/rua/i), "Rua das Flores, 123");
    await user.type(screen.getByLabelText(/cidade/i), "São Paulo");
    await user.type(screen.getByLabelText(/estado/i), "SP");
    await user.type(screen.getByLabelText(/cep/i), "01234-567");
    await user.type(screen.getByLabelText(/tax id|cpf|cnpj/i), "000.000.000-00");

    await user.click(screen.getByRole("button", { name: /finalizar compra/i }));

    await screen.findByTestId("payment-element");
    expect(paymentIntentSpy).toHaveBeenCalledWith({
      orderId: "order-2",
      taxId: "000.000.000-00",
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
    await user.type(screen.getByLabelText(/tax id|cpf|cnpj/i), "000.000.000-00");

    await user.click(screen.getByRole("button", { name: /finalizar compra/i }));

    expect(await screen.findByText(/api error: 400/i)).toBeInTheDocument();
  });

  it("should show the coupon discount in the order summary", () => {
    useCartStore.setState({
      items: [{ variantId: mockVariant.id, quantity: 1, variant: mockVariant }],
      coupon: { code: "DESC10", discountCents: 999 },
    });
    render(<CheckoutForm />);

    expect(screen.getByText(/desconto \(desc10\)/i)).toBeInTheDocument();
    expect(screen.getByText("R$ 89,91")).toBeInTheDocument();
  });

  it("should not call /payments after checkout", async () => {
    const user = userEvent.setup();
    addItemToCart();

    const paymentsSpy = vi.fn();
    server.use(
      http.post(`${API_URL}/payments`, () => {
        paymentsSpy();
        return HttpResponse.json({ id: "payment-1", status: "pending" });
      }),
    );

    render(<CheckoutForm />);

    await user.type(screen.getByLabelText(/nome do destinatário/i), "Maria");
    await user.type(screen.getByLabelText(/rua/i), "Rua 1");
    await user.type(screen.getByLabelText(/cidade/i), "SP");
    await user.type(screen.getByLabelText(/estado/i), "SP");
    await user.type(screen.getByLabelText(/cep/i), "00000-000");
    await user.type(screen.getByLabelText(/tax id|cpf|cnpj/i), "000.000.000-00");

    await user.click(screen.getByRole("button", { name: /finalizar compra/i }));

    await waitFor(() => {
      expect(screen.queryByText(/processando/i)).not.toBeInTheDocument();
    });
    expect(paymentsSpy).not.toHaveBeenCalled();
  });
});
