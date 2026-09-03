import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import {
  type ZodTypeProvider,
  serializerCompiler,
  validatorCompiler,
} from "@fastify/type-provider-zod";
import scalar from "@scalar/fastify-api-reference";
import Fastify from "fastify";
import { env } from "./env.js";
import { errorHandler } from "./middleware/error-handler.js";
import { authRoutes } from "./modules/auth/routes.js";
import { DrizzleCartRepository } from "./modules/cart/infra/drizzle-cart-repository.js";
import { createCartRoutes } from "./modules/cart/routes/index.js";
import { DrizzleCategoryRepository } from "./modules/categories/infra/drizzle-category-repository.js";
import { createCategoryRoutes } from "./modules/categories/routes/index.js";
import { DrizzleCouponRepository } from "./modules/coupons/infra/drizzle-coupon-repository.js";
import { createCouponRoutes } from "./modules/coupons/routes/index.js";
import { DrizzleEmailRepository } from "./modules/emails/infra/drizzle-email-repository.js";
import { createEmailRoutes } from "./modules/emails/routes/index.js";
import { DrizzleOrderRepository } from "./modules/orders/infra/drizzle-order-repository.js";
import { createAdminOrderRoutes } from "./modules/orders/routes/admin.js";
import { createCheckoutRoutes } from "./modules/orders/routes/index.js";
import { DrizzlePaymentRepository } from "./modules/payments/infra/drizzle-payment-repository.js";
import { createPaymentRoutes } from "./modules/payments/routes/index.js";
import { DrizzleProductRepository } from "./modules/products/infra/drizzle-product-repository.js";
import { createProductRoutes } from "./modules/products/routes/index.js";
import { DrizzleStockRepository } from "./modules/stock/infra/drizzle-stock-repository.js";
import { createAdminStockRoutes } from "./modules/stock/routes/admin.js";
import { DrizzleUserRepository } from "./modules/users/infra/drizzle-user-repository.js";
import { createAdminUserRoutes } from "./modules/users/routes/admin.js";
import { createWebhookRoutes } from "./modules/webhooks/routes/index.js";

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === "development" ? "info" : "warn",
    },
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(errorHandler);

  await app.register(cors, {
    origin: env.CORS_ORIGIN ?? (env.NODE_ENV === "development" ? "http://localhost:3000" : false),
    credentials: true,
  });

  await app.register(swagger, {
    openapi: {
      info: {
        title: "KronoStore API",
        version: "1.0.0",
        description: "API do e-commerce KronoStore",
      },
      servers: [{ url: `http://localhost:${env.API_PORT}`, description: "Development" }],
      components: {
        securitySchemes: {
          cookieAuth: {
            type: "apiKey",
            in: "cookie",
            name: "session_token",
          },
        },
      },
    },
  });

  await app.register(scalar, { routePrefix: "/docs" });

  await app.register(authRoutes);

  const productRepository = new DrizzleProductRepository();
  await app.register(createProductRoutes(productRepository));

  const cartRepository = new DrizzleCartRepository();
  const stockRepository = new DrizzleStockRepository();
  const couponRepository = new DrizzleCouponRepository();
  await app.register(createCartRoutes(cartRepository, stockRepository));

  const orderRepository = new DrizzleOrderRepository();
  const paymentRepository = new DrizzlePaymentRepository();
  await app.register(
    createCheckoutRoutes(
      orderRepository,
      cartRepository,
      stockRepository,
      couponRepository,
      productRepository,
      paymentRepository,
    ),
  );

  await app.register(createPaymentRoutes(paymentRepository));

  const emailRepository = new DrizzleEmailRepository();
  await app.register(createEmailRoutes(emailRepository));

  const categoryRepository = new DrizzleCategoryRepository();
  await app.register(createCategoryRoutes(categoryRepository));

  await app.register(createCouponRoutes(couponRepository));

  await app.register(createAdminOrderRoutes(orderRepository));

  await app.register(createAdminStockRoutes(stockRepository));

  const userRepository = new DrizzleUserRepository();
  await app.register(createAdminUserRoutes(userRepository));

  await app.register(createWebhookRoutes(paymentRepository, orderRepository));

  app.get("/health", async () => ({ status: "ok" }));

  return app;
}
