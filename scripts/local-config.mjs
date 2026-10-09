import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const nextRequire = createRequire(require.resolve("next/package.json"));
nextRequire("@next/env").loadEnvConfig(process.cwd(), true);

export function localConnectionString() {
  if (process.env.DATABASE_PROVIDER !== "local" || !process.env.DATABASE_URL)
    throw new Error("Configure DATABASE_PROVIDER=local and DATABASE_URL in .env.local first.");
  return process.env.DATABASE_URL;
}
