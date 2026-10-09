import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateKpis } from "../lib/analytics/calculate";
import { resolvePeriod } from "../lib/analytics/period";
import type { Booking, RoomBlock } from "../types";
import { room } from "./fixtures";
function booking(id: string, status: Booking["status"]): Booking {
  return {
    id,
    reference: id,
    room_id: room.id,
    full_name: "Test",
    phone: "09123456789",
    booking_date: "2026-10-08",
    start_time: "09:00",
    end_time: "12:00",
    duration_minutes: 180,
    number_of_people: 10,
    purpose: "Workshop",
    notes: "",
    status,
    created_at: "2026-10-08T00:00:00Z",
    updated_at: "2026-10-08T00:00:00Z",
    approved_at: null,
    approved_by: null,
    rejected_at: null,
    cancelled_at: null,
  };
}
test("KPI excludes non-confirmed requests and subtracts blocked hours", () => {
  const blocks: RoomBlock[] = [
    {
      id: "b",
      room_id: room.id,
      block_date: "2026-10-08",
      start_time: "16:00",
      end_time: "18:00",
      reason: "Maintenance",
      notes: "",
      created_at: "2026-10-08T00:00:00Z",
    },
  ];
  const kpi = calculateKpis(
    [room],
    [booking("1", "approved"), booking("2", "pending"), booking("3", "cancelled")],
    blocks,
    "2026-10-08",
    "2026-10-08",
  );
  assert.equal(kpi.totalBookings, 1);
  assert.equal(kpi.totalHours, 3);
  assert.equal(kpi.availableHours, 7);
  assert.equal(kpi.utilization, (3 / 7) * 100);
  assert.equal(kpi.averagePeople, 10);
  assert.equal(kpi.activities[0].percent, 100);
});
test("zero denominator does not produce NaN or Infinity", () => {
  const kpi = calculateKpis([], [], [], "2026-10-08", "2026-10-08");
  assert.equal(kpi.utilization, 0);
  assert.equal(kpi.averageDuration, 0);
  assert.equal(kpi.popularDay, "—");
});
test("periods use calendar boundaries and reject reversed custom dates", () => {
  assert.deepEqual(resolvePeriod({ period: "lastmonth" }, "2026-10-08"), {
    preset: "lastmonth",
    from: "2026-09-01",
    to: "2026-09-30",
  });
  assert.throws(() => resolvePeriod({ period: "custom", from: "2026-10-08", to: "2026-10-01" }));
});
