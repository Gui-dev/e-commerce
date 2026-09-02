"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
      <Card className="w-full max-w-md text-center">
        <CardContent className="flex flex-col items-center gap-4 py-8">
          <CheckCircle className="size-16 text-green-600 dark:text-green-400" />
          <div>
            <h1 className="text-2xl font-bold">Pedido Realizado!</h1>
            <p className="text-muted-foreground mt-2">
              Seu pedido foi recebido com sucesso.
            </p>
          </div>
          {orderId && (
            <p className="text-sm text-muted-foreground">
              Número do pedido: <span className="font-mono font-medium">{orderId}</span>
            </p>
          )}
          <div className="flex gap-4 mt-4">
            {orderId && (
              <Link href={`/orders/${orderId}`} className={buttonVariants()}>
                Ver Pedido
              </Link>
            )}
            <Link href="/" className={buttonVariants({ variant: "outline" })}>
              Continuar Comprando
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
