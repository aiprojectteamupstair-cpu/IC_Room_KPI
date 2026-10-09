import fs from "node:fs/promises";
import { randomBytes, scryptSync } from "node:crypto";
import pg from "pg";
import { localConnectionString } from "./local-config.mjs";
const root = new URL("../", import.meta.url);
const connectionString = localConnectionString();
const pool = new pg.Pool({
  connectionString,
});
const client = await pool.connect();
try {
  await client.query("begin");
  await client.query(
    "create table if not exists public.local_migrations(name text primary key,applied_at timestamptz default now())",
  );
  await client.query(await fs.readFile(new URL("local/bootstrap.sql", root), "utf8"));
  for (const name of (await fs.readdir(new URL("supabase/migrations/", root)))
    .filter((n) => n.endsWith(".sql"))
    .sort()) {
    const applied = await client.query("select 1 from public.local_migrations where name=$1", [
      name,
    ]);
    if (!applied.rowCount) {
      await client.query(await fs.readFile(new URL(`supabase/migrations/${name}`, root), "utf8"));
      await client.query("insert into public.local_migrations(name)values($1)", [name]);
    }
  }
  await client.query(await fs.readFile(new URL("local/grants.sql", root), "utf8"));
  const rooms = await client.query("select 1 from public.rooms limit 1");
  if (!rooms.rowCount)
    await client.query(await fs.readFile(new URL("supabase/seed.sql", root), "utf8"));
  const admin = await client.query("select 1 from auth.users limit 1");
  if (!admin.rowCount) {
    const password = randomBytes(12).toString("base64url");
    const salt = randomBytes(16).toString("hex");
    const hash = salt + ":" + scryptSync(password, salt, 64).toString("hex");
    const user = await client.query(
      "insert into auth.users(email,password_hash) values($1,$2) returning id",
      ["admin@innovation.local", hash],
    );
    await client.query(
      "insert into public.profiles(id,full_name,role)values($1,$2,'super_admin')",
      [user.rows[0].id, "Centre Administrator"],
    );
    await fs.mkdir(new URL(".local/", root), { recursive: true });
    await fs.writeFile(
      new URL(".local/admin-credentials.txt", root),
      `Local development administrator\nEmail: admin@innovation.local\nPassword: ${password}\nChange with npm run admin:local-reset\n`,
      { mode: 0o600 },
    );
  }
  await client.query("commit");
  const envPath = new URL(".env.local", root);
  let env = "";
  try {
    env = await fs.readFile(envPath, "utf8");
  } catch {}
  const entries = {
    DATABASE_PROVIDER: "local",
    DATABASE_URL: connectionString,
    DEMO_MODE: "false",
  };
  if (!/^LOCAL_SESSION_SECRET=.+/m.test(env))
    entries.LOCAL_SESSION_SECRET = randomBytes(48).toString("hex");
  for (const [key, value] of Object.entries(entries)) {
    const line = new RegExp(`^${key}=.*$`, "m");
    env = line.test(env) ? env.replace(line, `${key}=${value}`) : env + `\n${key}=${value}`;
  }
  await fs.writeFile(envPath, env.trim() + "\n", { mode: 0o600 });
  const database = new URL(connectionString);
  console.log(
    `Local PostgreSQL ready at ${database.hostname}:${database.port || "5432"} / ${decodeURIComponent(database.pathname.slice(1))}. Admin credentials: .local/admin-credentials.txt`,
  );
} catch (error) {
  await client.query("rollback");
  throw error;
} finally {
  client.release();
  await pool.end();
}
