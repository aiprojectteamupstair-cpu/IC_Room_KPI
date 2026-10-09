import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import pg from "pg";

// Use the same environment loading and precedence as Next.js.
const require = createRequire(import.meta.url);
const nextRequire = createRequire(require.resolve("next/package.json"));
nextRequire("@next/env").loadEnvConfig(process.cwd(), true);

if (process.env.DATABASE_PROVIDER === "local") {
  async function checkDatabase() {
    const client = new pg.Client({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 3000,
      query_timeout: 5000,
    });
    try {
      await client.connect();
      await client.query("begin read only");
      await client.query("set local role anon");
      await client.query("select id from public.rooms limit 1");
    } finally {
      await client.end();
    }
  }

  try {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is missing.");
    try {
      await checkDatabase();
    } catch (error) {
      const url = new URL(process.env.DATABASE_URL);
      const projectCluster = url.hostname === "127.0.0.1" && url.port === "55432";
      if (error.code !== "ECONNREFUSED" || !projectCluster || process.platform !== "win32")
        throw error;
      console.log("Starting the project's local PostgreSQL database...");
      const result = spawnSync(
        "powershell.exe",
        [
          "-NoProfile",
          "-ExecutionPolicy",
          "Bypass",
          "-File",
          fileURLToPath(new URL("./local-db.ps1", import.meta.url)),
          "start",
        ],
        { stdio: "inherit", windowsHide: true },
      );
      if (result.error) throw result.error;
      if (result.status !== 0) throw new Error("Local PostgreSQL could not start.");
      await checkDatabase();
    }
    console.log("Local PostgreSQL is ready.");
  } catch (error) {
    console.error("Local database check failed:", error.message);
    console.error(
      "For first-time setup, run npm run db:local:setup. Otherwise, check npm run db:local:start and .local/postgres/launch-error.log.",
    );
    process.exitCode = 1;
  }
}
