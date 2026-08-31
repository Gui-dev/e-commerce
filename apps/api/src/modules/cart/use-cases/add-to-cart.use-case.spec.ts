import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryStockRepository } from "../../stock/infra/in-memory-stock-repository.js";
import { InMemoryCartRepository } from "../infra/in-memory-cart-repository.js";
import { AddToCartUseCase } from "./add-to-cart.use-case.js";

describe("AddToCartUseCase", () => {
  let cartRepository: InMemoryCartRepository;
  let stockRepository: InMemoryStockRepository;
  let useCase: AddToCartUseCase;

  beforeEach(() => {
    cartRepository = new InMemoryCartRepository();
    stockRepository = new InMemoryStockRepository();
    useCase = new AddToCartUseCase(cartRepository, stockRepository);
  });

  it("should add item to cart", async () => {
    await stockRepository.create("var-001", 10);

    const item = await useCase.execute("user-001", {
      variantId: "var-001",
      quantity: 2,
    });

    expect(item.id).toBeDefined();
    expect(item.variantId).toBe("var-001");
    expect(item.quantity).toBe(2);
  });

  it("should increment quantity if item already exists", async () => {
    await stockRepository.create("var-001", 10);

    await useCase.execute("user-001", { variantId: "var-001", quantity: 2 });
    const item = await useCase.execute("user-001", { variantId: "var-001", quantity: 3 });

    expect(item.quantity).toBe(5);
  });

  it("should throw when insufficient stock", async () => {
    await stockRepository.create("var-001", 5);

    await expect(
      useCase.execute("user-001", { variantId: "var-001", quantity: 10 }),
    ).rejects.toThrow("Insufficient stock");
  });
});
