import { test } from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import { buildWorkbook } from "../lib/export/workbook";
import { room } from "./fixtures";
import type { Booking } from "../types";
test("Excel report has formatted sheets, correct cached formulas, filters and private text fields", async () => {
  const booking: Booking = {
    id: "test",
    reference: "IC-20261008-000AAA",
    room_id: room.id,
    full_name: "=SUM(1,2)",
    email: "test@example.com",
    phone: "09123456789",
    number_of_people: 10,
    booking_date: "2026-10-08",
    start_time: "09:00",
    end_time: "12:00",
    duration_minutes: 180,
    purpose: "Workshop",
    notes: "Private note",
    status: "approved",
    created_at: "2026-10-08T00:00:00Z",
    updated_at: "2026-10-08T00:00:00Z",
    approved_at: null,
    approved_by: null,
    rejected_at: null,
    cancelled_at: null,
  };
  const bytes = await buildWorkbook([room], [booking], [], "2026-10-08", "2026-10-08");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(bytes);
  assert.deepEqual(
    workbook.worksheets.map((s) => s.name),
    ["Overview", "Bookings", "Daily usage"],
  );
  const overview = workbook.getWorksheet("Overview")!;
  assert.equal(overview.getCell("B6").result, 1);
  assert.equal(overview.getCell("B7").result, 3);
  assert.ok(Math.abs(Number(overview.getCell("B8").result) - 1 / 3) < 1e-12);
  assert.equal(overview.getCell("B11").result, 10);
  assert.equal(overview.getCell("B15").result, 9);
  const data = workbook.getWorksheet("Bookings")!;
  assert.equal(data.getCell("D6").value, "09123456789");
  assert.equal(data.getCell("N6").value, "test@example.com");
  assert.equal(data.getCell("C6").value, "=SUM(1,2)");
  assert.equal(data.getCell("C6").type, ExcelJS.ValueType.String);
  const time = data.getCell("F6").value;
  assert.ok(time instanceof Date);
  assert.equal(time.getUTCHours(), 9);
  assert.equal(time.getUTCMinutes(), 0);
  assert.ok(data.autoFilter);
  assert.equal(data.views[0].state, "frozen");
});
