"use client";

import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/stores/auth-store";
import { useCartStore } from "@/stores/cart-store";
import { LogOut, Moon, Shield, ShoppingCart, Sun, User } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function Header() {
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();
  const itemCount = useCartStore((s) => s.itemCount());
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  function handleLogout() {
    logout();
    router.push("/");
  }

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
            <DropdownMenu>
              <DropdownMenuTrigger
                className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary/20"
                aria-label="Menu do usuario"
              >
                <User className="h-5 w-5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem>
                  <Link href="/orders" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Meus Pedidos
                  </Link>
                </DropdownMenuItem>
                {user?.role === "admin" && (
                  <DropdownMenuItem>
                    <Link href="/admin" className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Admin
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                  className="flex items-center gap-2"
                >
                  {resolvedTheme === "dark" ? (
                    <>
                      <Sun className="h-4 w-4" />
                      Modo Claro
                    </>
                  ) : (
                    <>
                      <Moon className="h-4 w-4" />
                      Modo Escuro
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-2">
                  <LogOut className="h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
