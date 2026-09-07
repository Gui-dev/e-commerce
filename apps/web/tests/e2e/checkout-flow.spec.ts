import { createHmac, randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

const API_URL = process.env.API_URL ?? "http://localhost:3001";
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

const TEST_EMAIL = `e2e-${randomUUID()}@test.com`;
const TEST_PASSWORD = "Test1234!";
const TEST_NAME = "E2E Checkout User";

const VALID_ADDRESS = {
  name: "E2E Test User",
  street: "Rua Teste, 123",
  city: "São Paulo",
  state: "SP",
  zip: "01234-567",
  country: "BR",
  taxId: "000.000.000-00",
};

async function apiPost<T>(path: string, body: unknown, token?: string): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${path} failed (${res.status}): ${text}`);
  }
  return res.json() as Promise<T>;
}

async function apiGet<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${path} failed (${res.status}): ${text}`);
  }
  return res.json() as Promise<T>;
}

function buildStripeSignature(payload: string): string {
  if (!STRIPE_WEBHOOK_SECRET) throw new Error("STRIPE_WEBHOOK_SECRET not set");
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHmac("sha256", STRIPE_WEBHOOK_SECRET)
    .update(`${timestamp}.${payload}`)
    .digest("hex");
  return `t=${timestamp},v1=${signature}`;
}

interface AuthResult {
  user: { id: string; email: string };
  token: string;
}

interface ProductListResult {
  products: Array<{
    id: string;
    name: string;
    slug: string;
    priceCents: number;
  }>;
}

interface ProductDetail {
  id: string;
  name: string;
  slug: string;
  variants: Array<{ id: string; name: string; sku: string; priceCents: number }>;
}

interface OrderResponse {
  id: string;
  status: string;
  totalCents: number;
  payment?: { id: string; method: string; status: string; amountCents: number } | null;
}

test.describe("Checkout Webhook Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
  });

  test("shows pending status then paid after webhook", async ({ page }) => {
    await apiPost<AuthResult>("/auth/sign-up", {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      name: TEST_NAME,
    });

    const auth = await apiPost<AuthResult>("/auth/sign-in", {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });
    const authToken = auth.token;

    const products = await apiGet<ProductListResult>("/products", authToken);
    expect(products.products.length).toBeGreaterThan(0);
    const productSlug = products.products[0].slug;
    const product = await apiGet<ProductDetail>(`/products/${productSlug}`, authToken);
    const variantId = product.variants[0].id;

    await apiPost("/cart/items", { variantId, quantity: 1 }, authToken);

    const order = await apiPost<OrderResponse>(
      "/checkout",
      { address: VALID_ADDRESS, paymentMethod: "boleto" },
      authToken,
    );
    const orderId = order.id;

    await apiPost("/checkout/payment-intent", { orderId, taxId: VALID_ADDRESS.taxId }, authToken);

    const orderDetails = await apiGet<OrderResponse>(`/orders/${orderId}`, authToken);
    const paymentId = orderDetails.payment?.id;
    expect(paymentId).toBeTruthy();

    await page.goto("/login");
    await page.getByLabel("Email").fill(TEST_EMAIL);
    await page.getByLabel("Senha").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Entrar" }).click();
    await page.waitForURL("/");

    await page.goto(`/orders/${orderId}`);
    await expect(page.getByText(`Pedido #${orderId.slice(0, 8)}`)).toBeVisible();
    await expect(page.getByText("Pendente").first()).toBeVisible();

    const payload = JSON.stringify({
      id: `evt_${randomUUID()}`,
      object: "event",
      type: "payment_intent.succeeded",
      data: {
        object: {
          id: `pi_${randomUUID()}`,
          object: "payment_intent",
          status: "succeeded",
          metadata: { orderId, paymentId },
        },
      },
    });

    const webhookRes = await fetch(`${API_URL}/webhooks/stripe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "stripe-signature": buildStripeSignature(payload),
      },
      body: payload,
    });

    expect(webhookRes.ok).toBeTruthy();
    expect(await webhookRes.json()).toEqual({ received: true });

    await page.waitForFunction(() => localStorage.getItem("kronostore-auth-token") !== null, {
      timeout: 5000,
    });
    await page.goto(`/orders/${orderId}`);
    await expect(page.getByText("Pago").first()).toBeVisible({ timeout: 10000 });
  });
});
