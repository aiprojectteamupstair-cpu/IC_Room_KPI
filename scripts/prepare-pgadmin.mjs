import fs from "node:fs/promises";

const root = new URL("../", import.meta.url);
const output = new URL(".local/pgadmin/", root);
await fs.mkdir(output, { recursive: true });
let sql = "-- Run in pgAdmin Query Tool connected to IC_Room_Schedule on localhost:5432.\nBEGIN;\n";
sql += await fs.readFile(new URL("local/bootstrap.sql", root), "utf8");
sql +=
  "\nCREATE TABLE IF NOT EXISTS public.local_migrations(name text PRIMARY KEY, applied_at timestamptz DEFAULT now());\n";
for (const name of (await fs.readdir(new URL("supabase/migrations/", root)))
  .filter((name) => name.endsWith(".sql"))
  .sort()) {
  const migration = await fs.readFile(new URL(`supabase/migrations/${name}`, root), "utf8");
  sql += `\nDO $migration$ BEGIN\nIF NOT EXISTS (SELECT 1 FROM public.local_migrations WHERE name = '${name.replaceAll("'", "''")}') THEN\n`;
  sql += migration;
  sql += `\nINSERT INTO public.local_migrations(name) VALUES ('${name.replaceAll("'", "''")}');\nEND IF;\nEND $migration$;\n`;
}
sql += await fs.readFile(new URL("local/grants.sql", root), "utf8");
// Add only the room, without copying sample bookings or customer information.
const seed = await fs.readFile(new URL("supabase/seed.sql", root), "utf8");
sql += "\n" + seed;
sql +=
  "\nCOMMIT;\nSELECT table_schema, table_name FROM information_schema.tables WHERE table_schema IN ('public','auth','private') AND table_type = 'BASE TABLE' ORDER BY table_schema, table_name;\n";
await fs.writeFile(new URL("create-tables.sql", output), sql);
await fs.writeFile(
  new URL("servers.json", output),
  JSON.stringify(
    {
      Servers: {
        1: {
          Name: "Innovation Centre - Local PostgreSQL",
          Group: "Local Projects",
          Host: "localhost",
          Port: 5432,
          Username: "postgres",
          MaintenanceDB: "postgres",
          DBRestriction: "IC_Room_Schedule",
          SSLMode: "disable",
          ConnectionParameters: { sslmode: "disable", connect_timeout: 10 },
        },
      },
    },
    null,
    2,
  ) + "\n",
);
console.log("pgAdmin schema and connection import: .local/pgadmin/");
