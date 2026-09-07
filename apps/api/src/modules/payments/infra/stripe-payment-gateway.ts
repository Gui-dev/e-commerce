import type { Stripe } from "stripe";
import type {
  BillingDetails,
  PaymentGateway,
  PaymentIntentResult,
} from "../domain/payment-gateway.js";
import type { PaymentMethod } from "../domain/payment.js";

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
        throw new Error(`Stripe did not return a client_secret for ${paymentIntent.id}`);
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
          type: "pix",
          pix: {},
          billing_details: {
            name: input.billingDetails.name,
            email: input.billingDetails.email,
            tax_id: input.billingDetails.taxId,
          },
        } as never,
        confirm: true,
      });
      const pix = paymentIntent.next_action?.pix_display_qr_code;
      if (!pix?.data) {
        throw new Error(`Stripe did not return pix next_action data for ${paymentIntent.id}`);
      }
      return {
        type: "pix",
        paymentIntentId: paymentIntent.id,
        qrCodeUrl: pix.data,
        qrCodePngUrl: pix.image_url_png ?? "",
        qrCodeSvgUrl: pix.image_url_svg ?? "",
        hostedInstructionsUrl: pix.hosted_instructions_url ?? "",
        expiresAt: pix.expires_at ? new Date(pix.expires_at * 1000).toISOString() : null,
      };
    }

    const paymentIntent = await this.client.paymentIntents.create({
      ...base,
      payment_method_types: ["boleto"],
      payment_method_options: { boleto: { expires_after_days: 3 } },
      payment_method_data: {
        type: "boleto",
        boleto: { tax_id: input.billingDetails.taxId ?? "000.000.000-00" },
        billing_details: {
          name: input.billingDetails.name,
          email: input.billingDetails.email,
          address: input.billingDetails.address && {
            line1: input.billingDetails.address.line1,
            city: input.billingDetails.address.city,
            state: input.billingDetails.address.state,
            postal_code: input.billingDetails.address.postalCode,
            country: input.billingDetails.address.country,
          },
        },
      } as never,
      confirm: true,
    });
    const boleto = paymentIntent.next_action?.boleto_display_details;
    if (!boleto?.hosted_voucher_url) {
      throw new Error(`Stripe did not return boleto next_action data for ${paymentIntent.id}`);
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
