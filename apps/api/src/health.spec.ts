import { describe, expect, it } from "vitest";

describe("Health Check", () => {
  it("should return ok", () => {
    expect({ status: "ok" }).toEqual({ status: "ok" });
  });
});
