import { setupServer } from "msw/node";
import { adminHandlers } from "./handlers/admin";
import { authHandlers } from "./handlers/auth";
import { cartHandlers } from "./handlers/cart";
import { productsHandlers } from "./handlers/products";

export const server = setupServer(
  ...productsHandlers,
  ...authHandlers,
  ...cartHandlers,
  ...adminHandlers,
);
