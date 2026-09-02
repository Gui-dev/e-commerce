import { ProductGrid } from "@/components/product/product-grid";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col">
      <section className="bg-gradient-to-b from-muted/50 to-background px-4 py-16 md:py-24">
        <div className="mx-auto max-w-6xl text-center">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            KronoStore
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Hardware e periféricos de alta performance
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link href="/products">
              <Button size="lg">Ver Catálogo</Button>
            </Link>
            <Link href="/categories">
              <Button variant="outline" size="lg">
                Categorias
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="px-4 py-12">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-8 text-2xl font-semibold">Produtos em Destaque</h2>
          <ProductGrid limit={8} />
        </div>
      </section>
    </div>
  );
}
