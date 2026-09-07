import type { Stripe } from "stripe";
import type {
  BillingDetails,
  PaymentGateway,
  PaymentIntentResult,
} from "../domain/payment-gateway.js";
import type { PaymentMethod } from "../domain/payment.js";

type StripePixNextAction = {
  pix?: {
    qr_code?: {
      data?: string;
      image_url_png?: string;
      image_url_svg?: string;
    };
    hosted_instructions_url?: string;
    expires_at?: number;
  };
};

export class StripePaymentGateway implements PaymentGateway {
  constructor(private readonly client: Pick<Stripe, "paymentIntents">) {}

  async createPaymentIntent(input: {
    method: PaymentMethod;
    amountCents: number;
    orderId: string;
    paymentId: string;
    billingDetails: BillingDetails;
  }): Promise<PaymentIntentResult> {
    const base = {
      amount: input.amountCents,
      currency: "brl",
      metadata: { orderId: input.orderId, paymentId: input.paymentId },
    };

    if (input.method === "credit_card") {
      const paymentIntent = await this.client.paymentIntents.create({
        ...base,
        payment_method_types: ["card"],
      });
      if (!paymentIntent.client_secret) {
        throw new Error("Stripe did not return a client_secret");
      }
      return {
        type: "card",
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
      };
    }

    if (input.method === "pix") {
      const paymentIntent = await this.client.paymentIntents.create({
        ...base,
        payment_method_types: ["pix"],
        payment_method_data: {
          pix: {},
          billing_details: {
            name: input.billingDetails.name,
            email: input.billingDetails.email,
            tax_id: input.billingDetails.taxId,
          },
        } as never,
        confirm: true,
      });
      const pix = (paymentIntent.next_action as unknown as StripePixNextAction).pix;
      if (!pix?.qr_code?.data) {
        throw new Error("Stripe did not return pix next_action data");
      }
      return {
        type: "pix",
        paymentIntentId: paymentIntent.id,
        qrCodeUrl: pix.qr_code.data,
        qrCodePngUrl: pix.qr_code?.image_url_png ?? "",
        qrCodeSvgUrl: pix.qr_code?.image_url_svg ?? "",
        hostedInstructionsUrl: pix.hosted_instructions_url ?? "",
        expiresAt: pix.expires_at ? new Date(pix.expires_at * 1000).toISOString() : null,
      };
    }

    const paymentIntent = await this.client.paymentIntents.create({
      ...base,
      payment_method_types: ["boleto"],
      payment_method_options: { boleto: { expires_after_days: 3 } },
      payment_method_data: {
        billing_details: {
          name: input.billingDetails.name,
          email: input.billingDetails.email,
          tax_id: input.billingDetails.taxId ?? "000.000.000-00",
        },
      } as never,
      confirm: true,
    });
    const boleto = paymentIntent.next_action?.boleto_display_details;
    if (!boleto?.hosted_voucher_url) {
      throw new Error("Stripe did not return boleto next_action data");
    }
    return {
      type: "boleto",
      paymentIntentId: paymentIntent.id,
      hostedVoucherUrl: boleto.hosted_voucher_url,
      pdfUrl: boleto.pdf ?? "",
      expiresAt: boleto.expires_at ? new Date(boleto.expires_at * 1000).toISOString() : null,
    };
  }
}
