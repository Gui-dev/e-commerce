import { server } from "@/mocks/server";
import { useAuthStore } from "@/stores/auth-store";
import { useCartStore } from "@/stores/cart-store";
import { mockVariant } from "@/test/fixtures/cart";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CouponInput } from "./coupon-input";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

describe("<CouponInput />", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCartStore.setState({ items: [], coupon: null });
    useAuthStore.setState({ token: "test-token", isAuthenticated: true, user: null });
    localStorage.clear();
  });

  it("should apply a valid coupon", async () => {
    const user = userEvent.setup();
    useCartStore.getState().addItem(mockVariant);

    render(<CouponInput />);

    await user.type(screen.getByLabelText(/código do cupom/i), "DESC10");
    await user.click(screen.getByRole("button", { name: /aplicar/i }));

    await waitFor(() => {
      expect(screen.getByText(/DESC10/i)).toBeInTheDocument();
    });
    expect(useCartStore.getState().coupon?.code).toBe("DESC10");
    expect(useCartStore.getState().coupon?.discountCents).toBe(999);
  });

  it("should show the validation error for an invalid coupon", async () => {
    const user = userEvent.setup();
    server.use(
      http.post(`${API_URL}/coupons/validate`, () => {
        return HttpResponse.json({ valid: false, error: "Coupon has expired" });
      }),
    );

    render(<CouponInput />);

    await user.type(screen.getByLabelText(/código do cupom/i), "EXPIRED");
    await user.click(screen.getByRole("button", { name: /aplicar/i }));

    expect(await screen.findByText(/Coupon has expired/i)).toBeInTheDocument();
    expect(useCartStore.getState().coupon).toBeNull();
  });

  it("should ask to login when there is no auth token", async () => {
    const user = userEvent.setup();
    useAuthStore.setState({ token: null, isAuthenticated: false, user: null });
    useCartStore.getState().addItem(mockVariant);

    render(<CouponInput />);

    await user.type(screen.getByLabelText(/código do cupom/i), "DESC10");
    await user.click(screen.getByRole("button", { name: /aplicar/i }));

    expect(await screen.findByText(/faça login/i)).toBeInTheDocument();
  });
});
