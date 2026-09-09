import { execSync } from "node:child_process";

export default async function globalSetup() {
  console.log("Seeding catalog for e2e...");
  execSync("pnpm --filter @kronostore/api db:seed --clean", {
    stdio: "inherit",
    cwd: process.cwd(),
  });
  console.log("Catalog seeded.");
}
