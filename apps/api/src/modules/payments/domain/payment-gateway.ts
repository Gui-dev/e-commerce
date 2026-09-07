import type { PaymentMethod } from "./payment.js";

export interface BillingDetails {
  name: string;
  email: string;
  taxId?: string;
}

export interface CardIntentResult {
  type: "card";
  paymentIntentId: string;
  clientSecret: string;
}

export interface PixIntentResult {
  type: "pix";
  paymentIntentId: string;
  qrCodeUrl: string;
  qrCodePngUrl: string;
  qrCodeSvgUrl: string;
  hostedInstructionsUrl: string;
  expiresAt: string | null;
}

export interface BoletoIntentResult {
  type: "boleto";
  paymentIntentId: string;
  hostedVoucherUrl: string;
  pdfUrl: string;
  expiresAt: string | null;
}

export type PaymentIntentResult = CardIntentResult | PixIntentResult | BoletoIntentResult;

export interface PaymentGateway {
  createPaymentIntent(input: {
    method: PaymentMethod;
    amountCents: number;
    orderId: string;
    paymentId: string;
    billingDetails: BillingDetails;
  }): Promise<PaymentIntentResult>;
}
