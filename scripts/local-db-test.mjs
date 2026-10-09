import pg from "pg";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { localConnectionString } from "./local-config.mjs";
const pool = new pg.Pool({
  connectionString: localConnectionString(),
});
try {
  await pool.query(
    await fs.readFile(new URL("../supabase/tests/constraints.sql", import.meta.url), "utf8"),
  );
  const id = randomUUID();
  await pool.query(
    "insert into public.rooms(id,name,capacity,opening_time,closing_time,minimum_booking_minutes,maximum_booking_minutes,booking_interval_minutes) values($1,'Concurrent test',30,'09:00','18:00',60,360,30)",
    [id],
  );
  const future = new Date(Date.now() + 150 * 86400000).toISOString().slice(0, 10);
  const insert = async () => {
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query("set local role service_role");
      await client.query(
        "select * from public.create_booking_request($1,'Test Concurrency','09987654321',2,$2,'10:00',120,'Other','')",
        [id, future],
      );
      await client.query("commit");
      return true;
    } catch (e) {
      await client.query("rollback");
      throw e;
    } finally {
      client.release();
    }
  };
  try {
    const result = await Promise.allSettled([insert(), insert()]);
    assert.equal(result.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal(
      result.filter((r) => r.status === "rejected" && r.reason.code === "23P01").length,
      1,
    );
    console.log(
      "PASS SQL constraints, RLS grants and two genuinely concurrent booking transactions",
    );
  } finally {
    await pool.query("delete from public.bookings where room_id=$1", [id]);
    await pool.query("delete from public.rooms where id=$1", [id]);
  }
} finally {
  await pool.end();
}
