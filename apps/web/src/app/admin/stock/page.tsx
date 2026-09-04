"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import type { Stock } from "@/types";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AdminStockPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [adjusting, setAdjusting] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "admin") {
      router.push("/login");
      return;
    }

    api
      .get<Stock[]>("/admin/stock")
      .then(setStocks)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isAuthenticated, user, router]);

  async function handleAdjust(variantId: string) {
    const qty = Number(quantities[variantId] || 0);
    const reason = reasons[variantId] || "";
    if (!qty || !reason) return;

    setAdjusting(variantId);
    try {
      const updated = await api.post<Stock>(`/admin/stock/${variantId}/adjust`, {
        quantity: qty,
        reason,
      });
      setStocks((prev) => prev.map((s) => (s.variantId === variantId ? updated : s)));
      setQuantities((prev) => ({ ...prev, [variantId]: "" }));
      setReasons((prev) => ({ ...prev, [variantId]: "" }));
    } catch (err) {
      console.error("Failed to adjust stock", err);
    } finally {
      setAdjusting(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Estoque</h1>

      <Card>
        <CardHeader>
          <CardTitle>Registro de Estoque ({stocks.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-3 px-4 text-left font-medium">Variante ID</th>
                  <th className="py-3 px-4 text-left font-medium">Quantidade</th>
                  <th className="py-3 px-4 text-left font-medium">Reservado</th>
                  <th className="py-3 px-4 text-left font-medium">Disponivel</th>
                  <th className="py-3 px-4 text-left font-medium">Ajustar</th>
                </tr>
              </thead>
              <tbody>
                {stocks.map((stock) => (
                  <tr key={stock.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-4 font-mono text-xs">{stock.variantId}</td>
                    <td className="py-3 px-4">{stock.quantity}</td>
                    <td className="py-3 px-4">{stock.reserved}</td>
                    <td className="py-3 px-4">{stock.quantity - stock.reserved}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          placeholder="Qtd"
                          className="w-20"
                          value={quantities[stock.variantId] || ""}
                          onChange={(e) =>
                            setQuantities((prev) => ({
                              ...prev,
                              [stock.variantId]: e.target.value,
                            }))
                          }
                        />
                        <Input
                          placeholder="Motivo"
                          className="w-32"
                          value={reasons[stock.variantId] || ""}
                          onChange={(e) =>
                            setReasons((prev) => ({
                              ...prev,
                              [stock.variantId]: e.target.value,
                            }))
                          }
                        />
                        <Button
                          size="sm"
                          onClick={() => handleAdjust(stock.variantId)}
                          disabled={adjusting === stock.variantId}
                        >
                          {adjusting === stock.variantId ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Ajustar"
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
