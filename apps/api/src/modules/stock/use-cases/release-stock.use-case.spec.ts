import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryStockRepository } from "../infra/in-memory-stock-repository.js";
import { ReleaseStockUseCase } from "./release-stock.use-case.js";

describe("ReleaseStockUseCase", () => {
  let repository: InMemoryStockRepository;
  let useCase: ReleaseStockUseCase;

  beforeEach(() => {
    repository = new InMemoryStockRepository();
    useCase = new ReleaseStockUseCase(repository);
  });

  it("should release reserved stock", async () => {
    await repository.create("var-001", 10);
    await repository.reserve("var-001", 5);

    const result = await useCase.execute("var-001", 3);

    expect(result.reserved).toBe(2);
    expect(result.quantity).toBe(10);
  });

  it("should not go below zero reserved", async () => {
    await repository.create("var-002", 10);
    await repository.reserve("var-002", 2);

    const result = await useCase.execute("var-002", 5);

    expect(result.reserved).toBe(0);
  });
});
