import { beforeEach, describe, expect, it, vi } from "vitest";
import { users } from "../../../lib/db/schema.js";
import { db } from "../../../lib/db/test-db.js";
import { TEST_VARIANT_ID, resetDatabase, seedTestData } from "../../../lib/db/test-helpers.js";
import { withTransaction } from "../../../lib/db/transaction.js";
import { DrizzleCartRepository } from "../../cart/infra/drizzle-cart-repository.js";
import { DrizzleCouponRepository } from "../../coupons/infra/drizzle-coupon-repository.js";
import { DrizzleProductRepository } from "../../products/infra/drizzle-product-repository.js";
import { DrizzleStockRepository } from "../../stock/infra/drizzle-stock-repository.js";
import { DrizzleOrderRepository } from "../infra/drizzle-order-repository.js";
import { CheckoutUseCase } from "./checkout.use-case.js";

const mockAdd = vi.hoisted(() => vi.fn().mockResolvedValue({}));

vi.mock("../../../queues/email.queue.js", async () => {
  return {
    emailQueue: { add: mockAdd },
  };
});

const TEST_USER_ID = "eeeeeeee-0000-4000-8000-000000000005";

const address = {
  name: "John Doe",
  street: "Rua das Flores, 123",
  city: "São Paulo",
  state: "SP",
  zip: "01000-000",
  country: "BR",
};

// Real withTransaction bound to the TEST database. Inside, the AsyncLocalStorage
// stores a transaction on the test db, which the no-tx repos below must resolve.
const testTransaction = <T>(fn: (tx: unknown) => Promise<T>): Promise<T> => withTransaction(fn, db);

describe("CheckoutUseCase (Drizzle integration)", () => {
  let useCase: CheckoutUseCase;

  // Repos bound to the test database for setup + verification (outside tx).
  let setupCartRepo: DrizzleCartRepository;
  let verifyOrderRepo: DrizzleOrderRepository;
  let verifyCartRepo: DrizzleCartRepository;
  let verifyStockRepo: DrizzleStockRepository;

  beforeEach(async () => {
    await resetDatabase();
    await seedTestData();
    await db.insert(users).values({
      id: TEST_USER_ID,
      name: "Test User",
      email: "checkout-e2e@example.com",
      emailVerified: true,
      role: "customer",
    });

    // The use case receives repos WITHOUT an explicit client: inside the
    // transaction they must resolve the test-db tx via AsyncLocalStorage.
    // (This mirrors production, where app.ts constructs repos without a tx.)
    useCase = new CheckoutUseCase(
      new DrizzleOrderRepository(),
      new DrizzleCartRepository(),
      new DrizzleStockRepository(),
      new DrizzleCouponRepository(),
      new DrizzleProductRepository(),
      testTransaction,
    );

    setupCartRepo = new DrizzleCartRepository(db);
    verifyOrderRepo = new DrizzleOrderRepository(db);
    verifyCartRepo = new DrizzleCartRepository(db);
    verifyStockRepo = new DrizzleStockRepository(db);

    mockAdd.mockClear();
  });

  it("commits order, clears cart and confirms stock inside a real transaction", async () => {
    const cart = await setupCartRepo.create(TEST_USER_ID);
    await setupCartRepo.addItem(cart.id, { variantId: TEST_VARIANT_ID, quantity: 2 });

    const order = await useCase.execute({
      userId: TEST_USER_ID,
      userEmail: "checkout-e2e@example.com",
      address,
    });

    expect(order.status).toBe("pending");

    const afterCart = await verifyCartRepo.findByUserId(TEST_USER_ID);
    expect(afterCart?.items).toHaveLength(0);

    const stock = await verifyStockRepo.findByVariantId(TEST_VARIANT_ID);
    expect(stock?.quantity).toBe(98);

    expect(mockAdd).toHaveBeenCalledTimes(1);
  });

  it("rolls back all writes when the transaction aborts due to insufficient stock", async () => {
    const cart = await setupCartRepo.create(TEST_USER_ID);
    await setupCartRepo.addItem(cart.id, { variantId: TEST_VARIANT_ID, quantity: 150 });

    await expect(
      useCase.execute({
        userId: TEST_USER_ID,
        userEmail: "checkout-e2e@example.com",
        address,
      }),
    ).rejects.toThrow("Insufficient stock");

    const orders = await verifyOrderRepo.findByUserId(TEST_USER_ID);
    expect(orders).toHaveLength(0);

    const stock = await verifyStockRepo.findByVariantId(TEST_VARIANT_ID);
    expect(stock?.quantity).toBe(100);

    expect(mockAdd).not.toHaveBeenCalled();
  });

  it("confirms withTransaction rolls back prior writes on failure", async () => {
    await expect(
      withTransaction(async () => {
        await new DrizzleCartRepository().create(TEST_USER_ID);
        throw new Error("boom");
      }, db),
    ).rejects.toThrow("boom");

    const cart = await verifyCartRepo.findByUserId(TEST_USER_ID);
    expect(cart).toBeNull();
  });
});
