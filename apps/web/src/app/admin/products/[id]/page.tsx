"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ImageUpload } from "@/components/ui/image-upload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import type { Category, Product } from "@/types";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AdminProductEditPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    categoryId: "",
    priceCents: "",
    imageUrl: "",
    isActive: true,
  });

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "admin") {
      router.push("/login");
      return;
    }

    if (!productId) {
      router.push("/admin/products");
      return;
    }

    Promise.all([
      api.get<Product>(`/admin/products/${productId}`),
      api.get<Category[]>("/categories"),
    ])
      .then(([p, cats]) => {
        setProduct(p);
        setCategories(cats);
        setForm({
          name: p.name,
          description: p.description,
          categoryId: p.categoryId,
          priceCents: String(p.priceCents),
          imageUrl: p.imageUrl || "",
          isActive: p.isActive,
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isAuthenticated, user, router, productId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!productId) return;
    setSubmitting(true);
    try {
      await api.patch(`/admin/products/${productId}`, {
        name: form.name,
        description: form.description,
        categoryId: form.categoryId,
        priceCents: Number(form.priceCents),
        imageUrl: form.imageUrl || null,
        isActive: form.isActive,
      });
      router.push("/admin/products");
    } catch (err) {
      console.error("Failed to update product", err);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!product) {
    return <div className="text-center py-20 text-muted-foreground">Produto nao encontrado.</div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link href="/admin/products" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-3xl font-bold">Editar Produto</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{product.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descricao</Label>
              <textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                required
                minLength={10}
                rows={3}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select
                value={form.categoryId}
                onValueChange={(v) => setForm({ ...form, categoryId: v ?? "" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="priceCents">Preco (centavos)</Label>
              <Input
                id="priceCents"
                type="number"
                value={form.priceCents}
                onChange={(e) => setForm({ ...form, priceCents: e.target.value })}
                required
                min={1}
              />
            </div>
            <div className="space-y-2">
              <Label>Imagem do Produto</Label>
              <ImageUpload
                value={form.imageUrl}
                onChange={(url) => setForm({ ...form, imageUrl: url || "" })}
                prefix="products"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label>Ativo</Label>
              <Checkbox
                checked={form.isActive}
                onCheckedChange={(checked) => setForm({ ...form, isActive: checked === true })}
              />
            </div>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar Alteracoes
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
