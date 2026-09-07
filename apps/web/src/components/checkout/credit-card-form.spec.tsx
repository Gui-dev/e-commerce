import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreditCardForm } from "./credit-card-form";

const mockConfirm = vi.fn();
const mockGetElement = vi.fn(() => ({ _card: true }));

vi.mock("@stripe/react-stripe-js", () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  CardElement: () => <div data-testid="card-element" />,
  useStripe: () => ({ confirmCardPayment: mockConfirm }),
  useElements: () => ({ getElement: mockGetElement }),
}));

vi.mock("@stripe/stripe-js", () => ({
  loadStripe: () => Promise.resolve({}),
}));

describe("<CreditCardForm />", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the card element and pay button", () => {
    render(<CreditCardForm clientSecret="cs_test_1" onPaymentSuccess={() => {}} onCancel={() => {}} />);

    expect(screen.getByTestId("card-element")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /pagar/i })).toBeInTheDocument();
  });

  it("confirms the payment intent with the card element on submit", async () => {
    mockConfirm.mockResolvedValue({ paymentIntent: { status: "succeeded" } });
    const onSuccess = vi.fn();

    render(<CreditCardForm clientSecret="cs_test_1" onPaymentSuccess={onSuccess} onCancel={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /pagar/i }));

    await waitFor(() => expect(mockConfirm).toHaveBeenCalledWith("cs_test_1", {
      payment_method: { card: { _card: true } },
    }));
    expect(onSuccess).toHaveBeenCalled();
  });

  it("shows error and does not navigate when payment fails", async () => {
    mockConfirm.mockResolvedValue({ error: { message: "Your card was declined." } });
    const onSuccess = vi.fn();

    render(<CreditCardForm clientSecret="cs_test_1" onPaymentSuccess={onSuccess} onCancel={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /pagar/i }));

    expect(await screen.findByText(/declined/i)).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
