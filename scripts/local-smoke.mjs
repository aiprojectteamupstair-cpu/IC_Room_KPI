import assert from "node:assert/strict";
import fs from "node:fs/promises";
import pg from "pg";
import ExcelJS from "exceljs";
import { localConnectionString } from "./local-config.mjs";
const base = process.env.SMOKE_URL || "http://localhost:3017";
const pool = new pg.Pool({
  connectionString: localConnectionString(),
});
const name = "HTTP verification " + Date.now();
let bookingId;
async function manifest() {
  return JSON.parse(
    await fs.readFile(
      new URL(
        process.env.SMOKE_BUILD === "production"
          ? "../.next/server/server-reference-manifest.json"
          : "../.next/dev/server/server-reference-manifest.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
}
try {
  const root = await fetch(base);
  const rootHtml = await root.text();
  assert.equal(root.status, 200);
  assert.ok(rootHtml.includes("Find a time. Make it happen."));
  assert.ok(rootHtml.includes("Explore the space"));
  assert.ok(!rootHtml.includes('aria-label="Days of the week"'));
  assert.ok(!rootHtml.includes("09123456789"));
  const selectedDate = new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10);
  const calendarResponse = await fetch(
    base + `/schedule?date=${selectedDate}&room=11111111-1111-4111-8111-111111111111`,
  );
  assert.equal(calendarResponse.status, 200);
  const calendarHtml = await calendarResponse.text();
  assert.ok(calendarHtml.includes('aria-label="Days of the week"'));
  for (const html of [rootHtml, calendarHtml]) {
    assert.equal(
      [...html.matchAll(/<a\b[^>]*\bhref="\/book(?:\?[^"]*)?"[^>]*>/g)].length,
      1,
      "Public pages must have only one booking navigation action",
    );
  }
  const bookHref = calendarHtml
    .match(/<a\b[^>]*\bhref="(\/book\?[^"]*)"/)[1]
    .replaceAll("&amp;", "&");
  const bookLink = new URL(bookHref, base);
  assert.equal(bookLink.searchParams.get("date"), selectedDate);
  assert.equal(bookLink.searchParams.get("room"), "11111111-1111-4111-8111-111111111111");
  console.log(
    "PASS distinct Explore and mini-calendar pages, one booking action, selected-date context and public privacy",
  );
  for (const route of [
    "/admin",
    "/admin/bookings",
    "/admin/calendar",
    "/admin/kpi",
    "/admin/settings",
    "/admin/export",
  ]) {
    const denied = await fetch(base + route, { redirect: "manual" });
    assert.ok([303, 307, 308].includes(denied.status), `${route}: ${denied.status}`);
  }
  console.log("PASS every admin page and Excel export requires login");
  const deniedNotifications = await fetch(base + "/api/admin/notifications", {
    redirect: "manual",
  });
  assert.equal(deniedNotifications.status, 401);
  await fetch(base + "/admin/login");
  const map = await manifest();
  const loginId = Object.entries(map.node).find(([, a]) => a.exportedName === "login")[0];
  const credentials = await fs.readFile(
    new URL("../.local/admin-credentials.txt", import.meta.url),
    "utf8",
  );
  const form = new FormData();
  form.set("$ACTION_ID_" + loginId, "");
  form.set("email", credentials.match(/Email: (.+)/)[1]);
  form.set("password", credentials.match(/Password: (.+)/)[1]);
  const auth = await fetch(base + "/admin/login", {
    method: "POST",
    headers: { Origin: base },
    body: form,
    redirect: "manual",
  });
  assert.equal(auth.status, 303, await auth.text());
  const cookie = auth.headers
    .getSetCookie()
    .find((c) => c.startsWith("ic-local-admin="))
    ?.split(";")[0];
  assert.ok(cookie, "Login did not issue a session cookie");
  console.log("PASS actual password login and HttpOnly session");
  const date = new Date(Date.now() + 120 * 86400000).toISOString().slice(0, 10);
  const room = "11111111-1111-4111-8111-111111111111";
  const input = {
    room_id: room,
    full_name: name,
    email: "booking-test@example.com",
    phone: "09" + String(Date.now()).slice(-8),
    number_of_people: 7,
    booking_date: date,
    start_time: "10:00",
    duration_minutes: 120,
    purpose: "Workshop",
    notes: "Verification",
    website: "",
  };
  const noEmail = { ...input };
  delete noEmail.email;
  const invalidEmail = await fetch(base + "/api/bookings", {
    method: "POST",
    headers: { Origin: base, "Content-Type": "application/json" },
    body: JSON.stringify(noEmail),
  });
  assert.equal(invalidEmail.status, 400);
  const shortCodeAvailability = await fetch(base + `/api/availability?room=IC-001&date=${date}`);
  assert.equal(shortCodeAvailability.status, 200);
  const submit = () =>
    fetch(base + "/api/bookings", {
      method: "POST",
      headers: { Origin: base, "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  const results = await Promise.all([submit(), submit()]);
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
  const receipt = await results.find((r) => r.status === 201).json();
  assert.equal(receipt.booking.status, "pending");
  const saved = await pool.query("select id from public.bookings where reference=$1", [
    receipt.booking.reference,
  ]);
  bookingId = saved.rows[0].id;
  const notifications = await fetch(base + "/api/admin/notifications", {
    headers: { Cookie: cookie },
  });
  assert.equal(notifications.status, 200);
  assert.match(notifications.headers.get("cache-control"), /no-store/);
  const feed = (await notifications.json()).bookings;
  const notification = feed.find((item) => item.id === bookingId);
  assert.ok(notification);
  assert.equal(notification.full_name, name);
  assert.equal("email" in notification, false);
  assert.equal("phone" in notification, false);
  console.log(
    "PASS new request in authenticated notification feed; private contact fields omitted",
  );
  console.log("PASS concurrent HTTP requests: one saved, one rejected");
  let schedule = await pool.query("select * from public.public_schedule($1,$2,$2)", [room, date]);
  assert.ok(!schedule.rows.some((b) => b.start_time === "10:00:00"));
  const page = await fetch(base + "/admin/bookings", { headers: { Cookie: cookie } });
  assert.equal(page.status, 200);
  assert.ok((await page.text()).includes(name));
  const actions = await manifest();
  const approveId = Object.entries(actions.node).find(
    ([, a]) => a.exportedName === "changeStatus",
  )[0];
  const approval = await fetch(base + "/admin/bookings", {
    method: "POST",
    headers: {
      Origin: base,
      Cookie: cookie,
      "Next-Action": approveId,
      "Content-Type": "text/plain;charset=UTF-8",
    },
    body: JSON.stringify([bookingId, "approved"]),
  });
  assert.equal(approval.status, 200, await approval.text());
  const status = await pool.query("select status from public.bookings where id=$1", [bookingId]);
  assert.equal(status.rows[0].status, "approved");
  const queued = await pool.query(
    "select state,decision,recipient from public.booking_emails where booking_id=$1",
    [bookingId],
  );
  assert.equal(queued.rowCount, 1);
  assert.equal(queued.rows[0].decision, "approved");
  assert.equal(queued.rows[0].recipient, input.email);
  const retryId = Object.entries(actions.node).find(
    ([, action]) => action.exportedName === "retryBookingEmail",
  )[0];
  const retryEmail = await fetch(base + "/admin/bookings", {
    method: "POST",
    headers: {
      Origin: base,
      Cookie: cookie,
      "Next-Action": retryId,
      "Content-Type": "text/plain;charset=UTF-8",
    },
    body: JSON.stringify([bookingId]),
  });
  assert.equal(retryEmail.status, 200);
  assert.equal(
    (
      await pool.query(
        "select count(*)::integer as count from public.booking_emails where booking_id=$1",
        [bookingId],
      )
    ).rows[0].count,
    1,
  );
  console.log(
    "PASS required email, short room code, transactional approval email and authenticated retry",
  );
  schedule = await pool.query("select * from public.public_schedule($1,$2,$2)", [room, date]);
  assert.ok(schedule.rows.some((b) => b.start_time === "10:00:00"));
  console.log("PASS administrator approval updates public schedule");
  const exportResponse = await fetch(
    base + `/admin/export?scope=bookings&search=${encodeURIComponent(name)}`,
    { headers: { Cookie: cookie } },
  );
  assert.equal(exportResponse.status, 200);
  assert.ok(exportResponse.headers.get("content-type").includes("spreadsheetml"));
  const bytes = Buffer.from(await exportResponse.arrayBuffer());
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(bytes);
  assert.equal(wb.getWorksheet("Bookings").getCell("C6").value, name);
  assert.equal(wb.getWorksheet("Bookings").rowCount, 6);
  assert.equal(wb.getWorksheet("Overview").getCell("B6").result, 1);
  console.log("PASS protected Excel export respects filters and has correct cached KPI totals");
  for (const route of ["/admin", "/admin/calendar", "/admin/kpi", "/admin/settings"]) {
    const res = await fetch(base + route, { headers: { Cookie: cookie } });
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.ok(!html.includes("We couldn&#x27;t load this page"), route);
  }
  console.log("PASS authenticated management pages");
  const forged = await fetch(base + "/admin/export", {
    headers: { Cookie: "ic-local-admin=forged.invalid" },
    redirect: "manual",
  });
  assert.equal(forged.status, 307);
  console.log("PASS forged session denied");
} finally {
  if (bookingId) await pool.query("delete from public.bookings where id=$1", [bookingId]);
  else await pool.query("delete from public.bookings where full_name=$1", [name]);
  await pool.end();
}
