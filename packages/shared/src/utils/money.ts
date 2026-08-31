export function centsToBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

export function parseBRLToCents(value: string): number {
  const numeric = value.replace(/[^\d,]/g, "").replace(",", ".");
  return Math.round(Number(numeric) * 100);
}
