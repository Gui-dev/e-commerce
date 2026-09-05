"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageUpload } from "@/components/ui/image-upload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AdminNewCategoryPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", description: "", imageUrl: "" });

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "admin") {
      router.push("/login");
    }
  }, [isAuthenticated, user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/admin/categories", {
        name: form.name,
        slug: form.slug,
        description: form.description || undefined,
        imageUrl: form.imageUrl || undefined,
      });
      router.push("/admin/categories");
    } catch (err) {
      console.error("Failed to create category", err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/categories"
          className={buttonVariants({ variant: "ghost", size: "icon" })}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-3xl font-bold">Nova Categoria</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Criar Categoria</CardTitle>
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
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descricao (opcional)</Label>
              <Input
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Imagem da Categoria (opcional)</Label>
              <ImageUpload
                value={form.imageUrl}
                onChange={(url) => setForm({ ...form, imageUrl: url || "" })}
                prefix="categories"
              />
            </div>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Criar Categoria
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
