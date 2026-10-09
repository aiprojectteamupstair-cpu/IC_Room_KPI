import { test } from "node:test";
import assert from "node:assert/strict";
import { overlaps, validDurations, validStarts, timeline } from "../lib/booking/availability";
import { today, currentMinutes } from "../lib/booking/time";
import { room } from "./fixtures";
const busy = [{ start_time: "10:00", end_time: "12:00" }];
test("detect all overlap shapes and allow exact adjacency", () => {
  for (const [s, e] of [
    [540, 660],
    [630, 690],
    [660, 780],
    [540, 780],
  ])
    assert.equal(overlaps(s, e, busy), true);
  assert.equal(overlaps(480, 600, busy), false);
  assert.equal(overlaps(720, 840, busy), false);
});
test("durations stop at booked time and closing", () => {
  const now = new Date("2026-10-08T00:00:00Z");
  assert.deepEqual(
    validDurations(room, "2026-10-09", "10:00", [{ start_time: "12:00", end_time: "14:00" }], now),
    [60, 90, 120],
  );
  assert.deepEqual(validDurations(room, "2026-10-09", "17:00", [], now), [60]);
});
test("settings drive options, and invalid intervals are rejected", () => {
  const custom = {
    ...room,
    opening_time: "08:30",
    closing_time: "12:30",
    minimum_booking_minutes: 30,
    maximum_booking_minutes: 120,
  };
  const now = new Date("2026-10-08T00:00:00Z");
  assert.equal(validStarts(custom, "2026-10-09", [], now)[0], "08:30");
  assert.deepEqual(validDurations(custom, "2026-10-09", "08:45", [], now), []);
});
test("Yangon date rolls over while UTC is still previous day", () => {
  const now = new Date("2026-10-08T18:00:00Z");
  assert.equal(today(now), "2026-10-09");
  assert.equal(currentMinutes(now), 30);
});
test("today rejects elapsed slots independent of browser zone", () => {
  const now = new Date("2026-10-08T04:30:00Z");
  assert.deepEqual(validDurations(room, "2026-10-08", "10:30", [], now), []);
  assert.equal(validStarts(room, "2026-10-08", [], now)[0], "11:30");
});
test("timeline merges overlapping and adjacent busy intervals", () => {
  assert.deepEqual(
    timeline(room, [
      { start_time: "10:00", end_time: "12:00" },
      { start_time: "11:00", end_time: "13:00" },
      { start_time: "13:00", end_time: "14:00" },
    ]),
    [
      { start: "09:00", end: "10:00", busy: false },
      { start: "10:00", end: "14:00", busy: true },
      { start: "14:00", end: "18:00", busy: false },
    ],
  );
});
