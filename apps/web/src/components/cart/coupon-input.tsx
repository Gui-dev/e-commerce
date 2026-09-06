"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCartStore } from "@/stores/cart-store";
import { Loader2, Tag, X } from "lucide-react";
import { useState } from "react";

export function CouponInput() {
  const coupon = useCartStore((s) => s.coupon);
  const applyCoupon = useCartStore((s) => s.applyCoupon);
  const removeCoupon = useCartStore((s) => s.removeCoupon);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  async function handleApply() {
    if (!code.trim()) return;
    setLoading(true);
    setMessage(null);
    const value = code.trim();
    setCode("");
    const result = await applyCoupon(value);
    setIsError(!result.ok);
    setMessage(result.message ?? null);
    setLoading(false);
  }

  function handleRemove() {
    removeCoupon();
    setMessage(null);
  }

  if (coupon) {
    return (
      <div className="mb-4 flex items-center justify-between rounded-lg border bg-muted/50 px-3 py-2 text-sm">
        <span className="flex items-center gap-2 font-medium">
          <Tag className="size-4" />
          {coupon.code}
        </span>
        <Button variant="ghost" size="sm" onClick={handleRemove} aria-label="Remover cupom">
          <X className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="mb-4 flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          id="coupon"
          placeholder="Código do cupom"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          aria-label="Código do cupom"
        />
        <Button type="button" variant="secondary" onClick={handleApply} disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : "Aplicar"}
        </Button>
      </div>
      {message && (
        <p
          className={
            isError ? "text-sm text-destructive" : "text-sm text-green-600 dark:text-green-400"
          }
        >
          {message}
        </p>
      )}
    </div>
  );
}
