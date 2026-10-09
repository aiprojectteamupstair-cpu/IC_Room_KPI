import "server-only";
import { Pool, types } from "pg";
import { localSession } from "@/lib/database/session";
types.setTypeParser(1082, (value) => value);
types.setTypeParser(1184, (value) => new Date(value).toISOString());
types.setTypeParser(20, (value) => Number(value));
const globalDb = globalThis as typeof globalThis & { icPool?: Pool; icPoolUrl?: string };
export function localPool() {
  if (!process.env.DATABASE_URL) throw new Error("Local PostgreSQL is not configured.");
  if (process.env.VERCEL === "1") {
    const host = new URL(process.env.DATABASE_URL).hostname;
    if (["localhost", "127.0.0.1", "[::1]", "0.0.0.0"].includes(host))
      throw new Error(
        "Vercel cannot connect to a localhost database. Configure the hosted Supabase environment variables and redeploy.",
      );
  }
  if (globalDb.icPool && globalDb.icPoolUrl !== process.env.DATABASE_URL) {
    void globalDb.icPool
      .end()
      .catch((error) => console.error("Could not close old database pool", error));
    globalDb.icPool = undefined;
  }
  globalDb.icPoolUrl = process.env.DATABASE_URL;
  return (globalDb.icPool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
  }));
}
export async function localQuery<T>(
  sql: string,
  values: unknown[] = [],
  role: "anon" | "authenticated" | "service_role" = "anon",
) {
  const actor = role === "authenticated" ? await localSession() : null;
  if (role === "authenticated" && !actor) throw new Error("Administrator login required");
  const client = await localPool().connect();
  try {
    await client.query("begin");
    await client.query(`set local role ${role}`);
    if (actor) await client.query("select set_config('request.jwt.claim.sub',$1,true)", [actor.id]);
    const result = await client.query<T>(sql, values);
    await client.query("commit");
    return result.rows;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
