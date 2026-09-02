import { setupServer } from "msw/node";
import { authHandlers } from "./handlers/auth";
import { productsHandlers } from "./handlers/products";

export const server = setupServer(...productsHandlers, ...authHandlers);
