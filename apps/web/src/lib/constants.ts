export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export const STORAGE_KEYS = {
  AUTH_TOKEN: "kronostore-auth-token",
  CART: "kronostore-cart",
} as const;

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  paid: "Pago",
  shipped: "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  pix: "PIX",
  credit_card: "Cartão de Crédito",
  boleto: "Boleto",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  processing: "Processando",
  approved: "Aprovado",
  rejected: "Rejeitado",
  refunded: "Reembolsado",
};
