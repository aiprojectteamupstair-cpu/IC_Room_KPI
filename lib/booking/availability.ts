import type { BusySlot, Room } from "@/types";
import { currentMinutes, minutes, timeString, today } from "./time";
export function overlaps(start: number, end: number, busy: BusySlot[]) {
  return busy.some((slot) => start < minutes(slot.end_time) && end > minutes(slot.start_time));
}
export function validDurations(
  room: Room,
  date: string,
  start: string,
  busy: BusySlot[],
  now = new Date(),
) {
  const s = minutes(start),
    open = minutes(room.opening_time),
    close = minutes(room.closing_time);
  if (
    date < today(now) ||
    (date === today(now) && s <= currentMinutes(now)) ||
    s < open ||
    (s - open) % room.booking_interval_minutes !== 0
  )
    return [];
  const options: number[] = [];
  for (
    let d = room.minimum_booking_minutes;
    d <= room.maximum_booking_minutes;
    d += room.booking_interval_minutes
  ) {
    if (s + d <= close && !overlaps(s, s + d, busy)) options.push(d);
  }
  return options;
}
export function validStarts(room: Room, date: string, busy: BusySlot[], now = new Date()) {
  const result: string[] = [];
  for (
    let s = minutes(room.opening_time);
    s < minutes(room.closing_time);
    s += room.booking_interval_minutes
  ) {
    const time = timeString(s);
    if (validDurations(room, date, time, busy, now).length) result.push(time);
  }
  return result;
}
export function timeline(room: Room, busy: BusySlot[]) {
  const open = minutes(room.opening_time),
    close = minutes(room.closing_time);
  const ordered = busy
    .map((s) => [Math.max(open, minutes(s.start_time)), Math.min(close, minutes(s.end_time))])
    .filter((s) => s[0] < s[1])
    .sort((a, b) => a[0] - b[0]);
  const merged: number[][] = [];
  for (const slot of ordered) {
    const last = merged.at(-1);
    if (last && slot[0] <= last[1]) last[1] = Math.max(last[1], slot[1]);
    else merged.push([...slot]);
  }
  const result: { start: string; end: string; busy: boolean }[] = [];
  let cursor = open;
  for (const [start, end] of merged) {
    if (cursor < start)
      result.push({ start: timeString(cursor), end: timeString(start), busy: false });
    result.push({ start: timeString(start), end: timeString(end), busy: true });
    cursor = end;
  }
  if (cursor < close)
    result.push({ start: timeString(cursor), end: timeString(close), busy: false });
  return result;
}
