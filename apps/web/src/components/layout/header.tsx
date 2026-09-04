"use client";

import { buttonVariants } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth-store";
import { useCartStore } from "@/stores/cart-store";
import { ShoppingCart } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";

export function Header() {
  const itemCount = useCartStore((s) => s.itemCount());
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2" aria-label="KronoStore Home">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
            K
          </div>
          <span className="text-xl font-bold">KronoStore</span>
        </Link>

        <nav className="flex items-center gap-4">
          <Link href="/products" className={buttonVariants({ variant: "ghost" })}>
            Produtos
          </Link>
          <Link href="/categories" className={buttonVariants({ variant: "ghost" })}>
            Categorias
          </Link>
          <Link href="/orders" className={buttonVariants({ variant: "ghost" })}>
            Meus Pedidos
          </Link>
          <Link
            href="/cart"
            className={buttonVariants({ variant: "ghost", size: "icon" })}
            aria-label="Carrinho"
          >
            <ShoppingCart className="h-5 w-5" />
            {itemCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {itemCount}
              </span>
            )}
          </Link>
          {isAuthenticated ? (
            <ThemeToggle />
          ) : (
            <Link href="/login" className={buttonVariants({ variant: "ghost" })}>
              Entrar
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
