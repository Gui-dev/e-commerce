import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreditCardForm } from "./credit-card-form";

const mockConfirm = vi.fn();

vi.mock("@/lib/stripe", () => ({
  getStripe: () => Promise.resolve({}),
}));

vi.mock("@stripe/react-stripe-js", () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PaymentElement: () => <div data-testid="payment-element" />,
  useStripe: () => ({ confirmPayment: mockConfirm }),
  useElements: () => ({}),
}));

vi.mock("@stripe/stripe-js", () => ({
  loadStripe: () => Promise.resolve({}),
}));

const BILLING = {
  name: "Maria Silva",
  email: "maria@test.com",
  address: {
    line1: "Rua das Flores, 123",
    city: "São Paulo",
    state: "SP",
    postal_code: "01000-000",
    country: "BR",
  },
};

describe("<CreditCardForm />", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the payment element and pay button", () => {
    render(
      <CreditCardForm
        clientSecret="cs_test_1"
        billingDetails={BILLING}
        onPaymentSuccess={() => {}}
        onCancel={() => {}}
      />,
    );

    expect(screen.getByTestId("payment-element")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /pagar/i })).toBeInTheDocument();
  });

  it("confirms the payment intent with the payment element on submit", async () => {
    mockConfirm.mockResolvedValue({ paymentIntent: { status: "succeeded" } });
    const onSuccess = vi.fn();

    render(
      <CreditCardForm
        clientSecret="cs_test_1"
        billingDetails={BILLING}
        onPaymentSuccess={onSuccess}
        onCancel={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /pagar/i }));

    await waitFor(() =>
      expect(mockConfirm).toHaveBeenCalledWith(
        expect.objectContaining({
          clientSecret: "cs_test_1",
          redirect: "if_required",
        }),
      ),
    );
    expect(mockConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        confirmParams: expect.objectContaining({
          payment_method_data: expect.objectContaining({
            billing_details: BILLING,
          }),
        }),
      }),
    );
    expect(onSuccess).toHaveBeenCalled();
  });

  it("shows error and does not navigate when payment fails", async () => {
    mockConfirm.mockResolvedValue({ error: { message: "Your card was declined." } });
    const onSuccess = vi.fn();

    render(
      <CreditCardForm
        clientSecret="cs_test_1"
        billingDetails={BILLING}
        onPaymentSuccess={onSuccess}
        onCancel={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /pagar/i }));

    expect(await screen.findByText(/declined/i)).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
