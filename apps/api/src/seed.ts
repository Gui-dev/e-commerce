import { eq } from "drizzle-orm";
import { db } from "./lib/db/index.js";
import { categories, coupons, productVariants, products, stock } from "./lib/db/schema.js";

interface CategorySeed {
  name: string;
  slug: string;
  description: string;
}

interface VariantSeed {
  name: string;
  sku: string;
  priceCents?: number;
  attributes: Record<string, string>;
}

interface ProductSeed {
  name: string;
  slug: string;
  description: string;
  priceCents: number;
  skuPrefix: string;
  variants: VariantSeed[];
}

const CATEGORIES: CategorySeed[] = [
  { name: "Eletrônicos", slug: "eletronicos", description: "Eletrônicos e dispositivos" },
  { name: "Roupas", slug: "roupas", description: "Roupas e acessórios" },
  { name: "Casa", slug: "casa", description: "Decoração e utilidades para a casa" },
  { name: "Esportes", slug: "esportes", description: "Equipamentos esportivos" },
];

const PRODUCTS: Record<string, ProductSeed[]> = {
  eletronicos: [
    {
      name: "Fone de Ouvido Bluetooth",
      slug: "fone-ouvido-bluetooth",
      description: "Fone de ouvido sem fio com cancelamento de ruído",
      priceCents: 24990,
      skuPrefix: "FNE",
      variants: [
        { name: "Preto", sku: "FNE-PRE-001", priceCents: 24990, attributes: { cor: "Preto" } },
        { name: "Branco", sku: "FNE-BRA-001", priceCents: 24990, attributes: { cor: "Branco" } },
      ],
    },
    {
      name: "Smartwatch",
      slug: "smartwatch",
      description: "Relógio inteligente com monitoramento de saúde",
      priceCents: 89990,
      skuPrefix: "SMT",
      variants: [
        { name: "44mm", sku: "SMT-44M-001", priceCents: 89990, attributes: { tamanho: "44mm" } },
        { name: "48mm", sku: "SMT-48M-001", priceCents: 99990, attributes: { tamanho: "48mm" } },
      ],
    },
  ],
  roupas: [
    {
      name: "Camiseta Básica",
      slug: "camiseta-basica",
      description: "Camiseta de algodão premium unissex",
      priceCents: 7990,
      skuPrefix: "CMS",
      variants: [
        { name: "P", sku: "CMS-P-001", attributes: { tamanho: "P", cor: "Branco" } },
        { name: "M", sku: "CMS-M-001", attributes: { tamanho: "M", cor: "Branco" } },
      ],
    },
    {
      name: "Calça Jeans",
      slug: "calca-jeans",
      description: "Calça jeans slim com lavagem clássica",
      priceCents: 12990,
      skuPrefix: "JNS",
      variants: [
        { name: "38", sku: "JNS-38-001", attributes: { tamanho: "38" } },
        { name: "40", sku: "JNS-40-001", attributes: { tamanho: "40" } },
      ],
    },
  ],
  casa: [
    {
      name: "Luminária de Mesa",
      slug: "luminaria-de-mesa",
      description: "Luminária LED com controle de intensidade",
      priceCents: 15990,
      skuPrefix: "LUM",
      variants: [
        { name: "Branca", sku: "LUM-BRA-001", priceCents: 15990, attributes: { cor: "Branca" } },
        { name: "Preta", sku: "LUM-PRE-001", priceCents: 15990, attributes: { cor: "Preta" } },
      ],
    },
    {
      name: "Kit Panelas",
      slug: "kit-panelas",
      description: "Conjunto de panelas antiaderentes",
      priceCents: 34990,
      skuPrefix: "PAN",
      variants: [
        { name: "5 peças", sku: "PAN-5PC-001", priceCents: 34990, attributes: { pecas: "5" } },
        { name: "7 peças", sku: "PAN-7PC-001", priceCents: 42990, attributes: { pecas: "7" } },
      ],
    },
  ],
  esportes: [
    {
      name: "Halteres de Anilha",
      slug: "halteres-de-anilha",
      description: "Conjunto de halteres com anilhas ajustáveis",
      priceCents: 49990,
      skuPrefix: "HAL",
      variants: [
        { name: "10kg", sku: "HAL-10K-001", priceCents: 49990, attributes: { peso: "10kg" } },
        { name: "20kg", sku: "HAL-20K-001", priceCents: 79990, attributes: { peso: "20kg" } },
      ],
    },
    {
      name: "Bola de Futebol",
      slug: "bola-de-futebol",
      description: "Bola de futebol oficial tamanho 5",
      priceCents: 8990,
      skuPrefix: "BOL",
      variants: [
        { name: "Padrão", sku: "BOL-PAD-001", priceCents: 8990, attributes: { cor: "Branca" } },
        { name: "Neon", sku: "BOL-NEO-001", priceCents: 9990, attributes: { cor: "Neon" } },
      ],
    },
  ],
};

async function upsertCategory(category: CategorySeed) {
  const existing = await db.query.categories.findFirst({
    where: eq(categories.slug, category.slug),
  });
  if (existing) {
    return existing.id;
  }
  const [row] = await db.insert(categories).values(category).returning({ id: categories.id });
  return row.id;
}

async function upsertProduct(product: ProductSeed, categoryId: string) {
  const existing = await db.query.products.findFirst({
    where: eq(products.slug, product.slug),
  });
  if (existing) {
    return existing.id;
  }
  const [row] = await db
    .insert(products)
    .values({
      name: product.name,
      slug: product.slug,
      description: product.description,
      categoryId,
      priceCents: product.priceCents,
      skuPrefix: product.skuPrefix,
    })
    .returning({ id: products.id });

  for (const variant of product.variants) {
    const [variantRow] = await db
      .insert(productVariants)
      .values({
        productId: row.id,
        name: variant.name,
        sku: variant.sku,
        priceCents: variant.priceCents,
        attributes: variant.attributes,
      })
      .returning({ id: productVariants.id });

    await db.insert(stock).values({
      variantId: variantRow.id,
      quantity: 100,
      reserved: 0,
    });
  }

  return row.id;
}

async function upsertCoupon() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  const existing = await db.query.coupons.findFirst({
    where: eq(coupons.code, "WELCOME10"),
  });
  if (existing) {
    return;
  }

  await db.insert(coupons).values({
    code: "WELCOME10",
    type: "percentage",
    value: 10,
    expiresAt,
    isActive: true,
  });
}

async function main() {
  console.log("Seeding catalog...");

  for (const category of CATEGORIES) {
    const categoryId = await upsertCategory(category);
    const products = PRODUCTS[category.slug];
    for (const product of products) {
      await upsertProduct(product, categoryId);
    }
  }

  await upsertCoupon();

  console.log("Seed complete.");
  await db.$client.end();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
