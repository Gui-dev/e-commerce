import { server } from "@/mocks/server";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { syncCartWithServer } from "./cart-sync";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

describe("syncCartWithServer", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should POST each item and return a variantId→serverItemId mapping", async () => {
    const items = [
      { variantId: "var-1", quantity: 2 },
      { variantId: "var-2", quantity: 1 },
    ];

    const mapping = await syncCartWithServer(items, "test-token");

    expect(mapping).toBeInstanceOf(Map);
    expect(mapping.size).toBe(2);
    expect(mapping.get("var-1")).toBe("server-item-var-1");
    expect(mapping.get("var-2")).toBe("server-item-var-2");
  });

  it("should include the Bearer token in the request", async () => {
    const requestSpy = vi.fn();
    server.use(
      http.post(`${API_URL}/cart/items`, async ({ request }) => {
        requestSpy(request.headers.get("Authorization"));
        const body = (await request.json()) as { variantId: string; quantity: number };
        return HttpResponse.json({ id: "server-item-1", variantId: body.variantId });
      }),
    );

    await syncCartWithServer([{ variantId: "var-1", quantity: 1 }], "my-jwt");

    expect(requestSpy).toHaveBeenCalledWith("Bearer my-jwt");
  });

  it("should return an empty Map on API failure without throwing", async () => {
    server.use(
      http.post(`${API_URL}/cart/items`, () => {
        return HttpResponse.json(
          { error: "INTERNAL", message: "Something went wrong" },
          { status: 500 },
        );
      }),
    );

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const mapping = await syncCartWithServer([{ variantId: "var-1", quantity: 1 }], "test-token");

    expect(mapping).toBeInstanceOf(Map);
    expect(mapping.size).toBe(0);
    expect(consoleSpy).toHaveBeenCalled();
  });

  it("should return an empty Map when items array is empty", async () => {
    const mapping = await syncCartWithServer([], "test-token");

    expect(mapping).toBeInstanceOf(Map);
    expect(mapping.size).toBe(0);
  });
});
