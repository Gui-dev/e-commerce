import { buildApp } from "./app.js";
import { env } from "./env.js";
import { ensureBucketExists } from "./lib/storage/index.js";

async function main() {
  await ensureBucketExists();

  const app = await buildApp();

  try {
    await app.listen({ port: env.API_PORT, host: "0.0.0.0" });
    app.log.info(`KronoStore API running on http://localhost:${env.API_PORT}`);
    app.log.info(`Docs at http://localhost:${env.API_PORT}/docs`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
