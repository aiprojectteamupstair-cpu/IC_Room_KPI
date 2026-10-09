import { randomBytes, scryptSync } from "node:crypto";
import fs from "node:fs/promises";
import pg from "pg";
import { localConnectionString } from "./local-config.mjs";
const pool = new pg.Pool({
  connectionString: localConnectionString(),
});
try {
  const password = randomBytes(12).toString("base64url");
  const salt = randomBytes(16).toString("hex");
  const hash = salt + ":" + scryptSync(password, salt, 64).toString("hex");
  const { rowCount } = await pool.query(
    "update auth.users set password_hash=$1,session_version=session_version+1 where email='admin@innovation.local'",
    [hash],
  );
  if (!rowCount) throw new Error("Run local database setup first.");
  await fs.writeFile(
    new URL("../.local/admin-credentials.txt", import.meta.url),
    `Local development administrator\nEmail: admin@innovation.local\nPassword: ${password}\n`,
    { mode: 0o600 },
  );
  console.log(
    "Local admin password rotated; existing sessions revoked. Credentials: .local/admin-credentials.txt",
  );
} finally {
  await pool.end();
}
