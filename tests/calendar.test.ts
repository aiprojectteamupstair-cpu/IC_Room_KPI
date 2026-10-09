import test from "node:test";
import assert from "node:assert/strict";
import { eachDayOfInterval, format } from "date-fns";
import { monthRange } from "../lib/booking/calendar";

test("calendar data range covers all six visible weeks, including adjacent months", () => {
  const range = monthRange("2026-10-09");
  assert.equal(format(range.start, "yyyy-MM-dd"), "2026-09-28");
  assert.equal(format(range.end, "yyyy-MM-dd"), "2026-11-08");
  assert.equal(eachDayOfInterval(range).length, 42);
});

test("mini calendar consistently covers every date in short, leap and long months", () => {
  for (const date of ["2024-02-29", "2026-02-01", "2026-08-31", "2026-12-31"]) {
    const days = eachDayOfInterval(monthRange(date));
    assert.equal(days.length, 42);
    assert.equal(days[0].getDay(), 1);
    assert.equal(days.at(-1)!.getDay(), 0);
    assert.ok(days.some((day) => format(day, "yyyy-MM-dd") === date));
  }
});
