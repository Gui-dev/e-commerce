import { api } from "@/lib/api";
import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePaymentStatus } from "./use-payment-status";

describe("usePaymentStatus", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("polls the order status every 2.5s and calls onPaid when paid", async () => {
    const getSpy = vi
      .spyOn(api, "get")
      .mockResolvedValueOnce({ status: "pending" })
      .mockResolvedValueOnce({ status: "pending" })
      .mockResolvedValue({ status: "paid" });

    const onPaid = vi.fn();
    renderHook(() => usePaymentStatus("order-1", onPaid));

    await vi.advanceTimersByTimeAsync(2500);
    expect(getSpy).toHaveBeenCalledWith("/orders/order-1");

    await vi.advanceTimersByTimeAsync(2500);
    await vi.advanceTimersByTimeAsync(2500);
    await vi.advanceTimersByTimeAsync(2500);
    await vi.advanceTimersByTimeAsync(0);
    expect(onPaid).toHaveBeenCalled();
    expect(getSpy).toHaveBeenCalledTimes(3);
  });

  it("keeps polling order errors without crashing", async () => {
    const getSpy = vi.spyOn(api, "get").mockRejectedValue(new Error("network"));
    const { result } = renderHook(() => usePaymentStatus("order-1"));

    await vi.advanceTimersByTimeAsync(2500);
    expect(getSpy).toHaveBeenCalled();
    expect(result.current).toBe("pending");
  });
});
