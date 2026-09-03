import { http, HttpResponse } from "msw";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

let cartItemCounter = 0;

export const cartHandlers = [
  http.post(`${API_URL}/cart/items`, async ({ request }) => {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return HttpResponse.json(
        { error: "UNAUTHORIZED", message: "Missing or invalid token" },
        { status: 401 },
      );
    }

    const body = (await request.json()) as { variantId: string; quantity: number };
    cartItemCounter++;

    return HttpResponse.json({
      id: `server-item-${cartItemCounter}`,
      variantId: body.variantId,
      quantity: body.quantity,
    });
  }),

  http.post(`${API_URL}/checkout`, async ({ request }) => {
    const body = (await request.json()) as { address: unknown };

    return HttpResponse.json({
      id: "order-1",
      status: "pending",
      address: body.address,
      totalCents: 0,
    });
  }),

  http.post(`${API_URL}/payments`, async () => {
    return HttpResponse.json({
      id: "payment-1",
      orderId: "order-1",
      method: "pix",
      status: "pending",
      amountCents: 0,
    });
  }),
];
