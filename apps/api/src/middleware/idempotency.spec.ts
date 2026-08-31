import { describe, expect, it } from "vitest";
import { computeBodyHash } from "./idempotency.js";

describe("Idempotency", () => {
  it("should compute consistent hash for same body", () => {
    const body = { items: [{ variantId: "1", quantity: 2 }] };
    const hash1 = computeBodyHash(body);
    const hash2 = computeBodyHash(body);
    expect(hash1).toBe(hash2);
  });

  it("should compute different hash for different body", () => {
    const body1 = { items: [{ variantId: "1", quantity: 2 }] };
    const body2 = { items: [{ variantId: "1", quantity: 3 }] };
    expect(computeBodyHash(body1)).not.toBe(computeBodyHash(body2));
  });

  it("should handle null/undefined body", () => {
    const hash = computeBodyHash(null);
    expect(hash).toBeDefined();
    expect(typeof hash).toBe("string");
  });
});
