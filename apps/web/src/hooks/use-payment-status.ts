"use client";

import { api } from "@/lib/api";
import type { Order, OrderStatus } from "@/types";
import { useEffect, useRef, useState } from "react";

export function usePaymentStatus(orderId: string, onPaid?: () => void) {
  const [status, setStatus] = useState<OrderStatus>("pending");
  const onPaidRef = useRef(onPaid);
  onPaidRef.current = onPaid;

  useEffect(() => {
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
