import { describe, expect, it, vi } from "vitest";
import type { PaymentIntentResult } from "../domain/payment-gateway.js";
import { StripePaymentGateway } from "./stripe-payment-gateway.js";

type FakePaymentIntents = {
  create: ReturnType<typeof vi.fn>;
};

function makeFakeIntents(returnValue: unknown): FakePaymentIntents {
  return { create: vi.fn().mockResolvedValue(returnValue) };
}

const BILLING = { name: "Maria Silva", email: "maria@example.com", taxId: "000.000.000-00" };

describe("StripePaymentGateway", () => {
  it("creates a card PaymentIntent with amount, brl and metadata", async () => {
    const paymentIntents = makeFakeIntents({
      id: "pi_card_1",
      client_secret: "cs_secret",
    });
    const gateway = new StripePaymentGateway({ paymentIntents } as never);

    const result = (await gateway.createPaymentIntent({
      method: "credit_card",
      amountCents: 3998,
      orderId: "order-1",
      paymentId: "pay-1",
      billingDetails: BILLING,
    })) as Extract<PaymentIntentResult, { type: "card" }>;

    expect(paymentIntents.create).toHaveBeenCalledWith({
      amount: 3998,
      currency: "brl",
      metadata: { orderId: "order-1", paymentId: "pay-1" },
      payment_method_types: ["card"],
    });
    expect(result).toEqual({
      type: "card",
      paymentIntentId: "pi_card_1",
      clientSecret: "cs_secret",
    });
  });

  it("confirms a pix PaymentIntent and maps next_action to QR data", async () => {
    const paymentIntents = makeFakeIntents({
      id: "pi_pix_1",
      next_action: {
        pix_display_qr_code: {
          data: "000201pixpayload",
          image_url_png: "https://stripe.test/qr.png",
          image_url_svg: "https://stripe.test/qr.svg",
          hosted_instructions_url: "https://stripe.test/pix/instructions",
          expires_at: 1780000000,
        },
      },
    });
    const gateway = new StripePaymentGateway({ paymentIntents } as never);

    const result = (await gateway.createPaymentIntent({
      method: "pix",
      amountCents: 3998,
      orderId: "order-1",
      paymentId: "pay-1",
      billingDetails: BILLING,
    })) as Extract<PaymentIntentResult, { type: "pix" }>;

    expect(paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({
        payment_method_types: ["pix"],
        payment_method_data: {
          pix: {},
          billing_details: {
            name: BILLING.name,
            email: BILLING.email,
            tax_id: BILLING.taxId,
          },
        },
        confirm: true,
      }),
    );
    expect(result.type).toBe("pix");
    expect(result.qrCodeUrl).toBe("000201pixpayload");
    expect(result.qrCodePngUrl).toBe("https://stripe.test/qr.png");
    expect(result.qrCodeSvgUrl).toBe("https://stripe.test/qr.svg");
    expect(result.hostedInstructionsUrl).toBe("https://stripe.test/pix/instructions");
    expect(result.expiresAt).toBe(new Date(1780000000 * 1000).toISOString());
  });

  it("confirms a boleto PaymentIntent and maps next_action to voucher urls", async () => {
    const paymentIntents = makeFakeIntents({
      id: "pi_boleto_1",
      next_action: {
        boleto_display_details: {
          hosted_voucher_url: "https://stripe.test/boleto/hosted",
          pdf: "https://stripe.test/boleto/voucher.pdf",
          expires_at: 1780000000,
        },
      },
    });
    const gateway = new StripePaymentGateway({ paymentIntents } as never);

    const result = (await gateway.createPaymentIntent({
      method: "boleto",
      amountCents: 3998,
      orderId: "order-1",
      paymentId: "pay-1",
      billingDetails: BILLING,
    })) as Extract<PaymentIntentResult, { type: "boleto" }>;

    expect(paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({
        payment_method_types: ["boleto"],
        payment_method_options: { boleto: { expires_after_days: 3 } },
        payment_method_data: {
          billing_details: {
            name: BILLING.name,
            email: BILLING.email,
            tax_id: BILLING.taxId,
          },
        },
        confirm: true,
      }),
    );
    expect(result).toEqual({
      type: "boleto",
      paymentIntentId: "pi_boleto_1",
      hostedVoucherUrl: "https://stripe.test/boleto/hosted",
      pdfUrl: "https://stripe.test/boleto/voucher.pdf",
      expiresAt: new Date(1780000000 * 1000).toISOString(),
    });
  });

  it("throws when Stripe does not return the card client_secret", async () => {
    const paymentIntents = makeFakeIntents({ id: "pi_card_2" });
    const gateway = new StripePaymentGateway({ paymentIntents } as never);

    await expect(
      gateway.createPaymentIntent({
        method: "credit_card",
        amountCents: 3998,
        orderId: "order-1",
        paymentId: "pay-1",
        billingDetails: BILLING,
      }),
    ).rejects.toThrow("client_secret");
  });

  it("throws when Stripe does not return the boleto hosted voucher url", async () => {
    const paymentIntents = makeFakeIntents({
      id: "pi_boleto_2",
      next_action: {
        boleto_display_details: {
          pdf: "https://stripe.test/boleto/voucher.pdf",
        },
      },
    });
    const gateway = new StripePaymentGateway({ paymentIntents } as never);

    await expect(
      gateway.createPaymentIntent({
        method: "boleto",
        amountCents: 3998,
        orderId: "order-1",
        paymentId: "pay-1",
        billingDetails: BILLING,
      }),
    ).rejects.toThrow("Stripe did not return boleto next_action data");
  });

  it("maps pix next_action with expires_at null to expiresAt null", async () => {
    const paymentIntents = makeFakeIntents({
      id: "pi_pix_2",
      next_action: {
        pix_display_qr_code: {
          data: "000201pixpayload",
          expires_at: null,
        },
      },
    });
    const gateway = new StripePaymentGateway({ paymentIntents } as never);

    const result = (await gateway.createPaymentIntent({
      method: "pix",
      amountCents: 3998,
      orderId: "order-1",
      paymentId: "pay-1",
      billingDetails: BILLING,
    })) as Extract<PaymentIntentResult, { type: "pix" }>;

    expect(result.qrCodeUrl).toBe("000201pixpayload");
    expect(result.expiresAt).toBeNull();
  });

  it("falls back to the test-mode tax id for boleto without taxId", async () => {
    const paymentIntents = makeFakeIntents({
      id: "pi_boleto_3",
      next_action: {
        boleto_display_details: {
          hosted_voucher_url: "https://stripe.test/boleto/hosted",
          pdf: "https://stripe.test/boleto/voucher.pdf",
          expires_at: 1780000000,
        },
      },
    });
    const gateway = new StripePaymentGateway({ paymentIntents } as never);

    await gateway.createPaymentIntent({
      method: "boleto",
      amountCents: 3998,
      orderId: "order-1",
      paymentId: "pay-1",
      billingDetails: { name: BILLING.name, email: BILLING.email },
    });

    expect(paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({
        payment_method_data: {
          billing_details: {
            name: BILLING.name,
            email: BILLING.email,
            tax_id: "000.000.000-00",
          },
        },
      }),
    );
  });
});
