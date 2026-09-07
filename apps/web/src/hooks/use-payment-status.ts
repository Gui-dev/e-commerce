"use client";

import { api } from "@/lib/api";
import type { Order, OrderStatus } from "@/types";
import { useEffect, useRef, useState } from "react";

const TERMINAL_STATUSES: OrderStatus[] = ["paid", "shipped", "delivered", "cancelled"];

export function usePaymentStatus(orderId: string, onPaid?: () => void) {
  const [status, setStatus] = useState<OrderStatus>("pending");
  const onPaidRef = useRef(onPaid);

  useEffect(() => {
    onPaidRef.current = onPaid;
  }, [onPaid]);

  useEffect(() => {
    if (!orderId) return;
    if (TERMINAL_STATUSES.includes(status)) return;
    let cancelled = false;
    const timer = setInterval(async () => {
      const order = await api.get<Order>(`/orders/${orderId}`).catch(() => null);
      if (cancelled) return;
      if (order && order.status !== status) {
        setStatus(order.status);
      }
    }, 2500);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [orderId, status]);

  useEffect(() => {
    if (status === "paid") {
      onPaidRef.current?.();
    }
  }, [status]);

  return status;
}
