import "server-only";
import { supabaseServer } from "./server";
import { isDemo, isLocal } from "./config";
import { localQuery } from "@/lib/database/local";
import { localSession } from "@/lib/database/session";
import { requireAdmin } from "./auth";
import { demoRoom, demoBookings, demoBlocks } from "@/lib/demo";
import type { Booking, Room, RoomBlock, ScheduleEntry, BusySlot } from "@/types";
export async function getRooms(): Promise<Room[]> {
  if (isLocal())
    return localQuery<Room>(
      "select * from public.rooms order by created_at",
      [],
      (await localSession()) ? "authenticated" : "anon",
    );
  if (isDemo()) return [demoRoom];
  const db = await supabaseServer();
  const { data, error } = await db.from("rooms").select("*").order("created_at");
  if (error) throw new Error("Could not load rooms. Please try again.");
  return data as Room[];
}
export async function getSchedule(
  room: string,
  from: string,
  to: string,
): Promise<ScheduleEntry[]> {
  if (isLocal())
    return localQuery<ScheduleEntry>("select * from public.public_schedule($1,$2,$3)", [
      room,
      from,
      to,
    ]);
  if (isDemo())
    return [
      ...demoBookings()
        .filter(
          (b) =>
            b.room_id === room &&
            b.booking_date >= from &&
            b.booking_date <= to &&
            ["approved", "completed"].includes(b.status),
        )
        .map((b) => ({
          room_id: b.room_id,
          booking_date: b.booking_date,
          start_time: b.start_time,
          end_time: b.end_time,
          purpose: b.purpose,
          status: b.status as "approved" | "completed",
        })),
      ...demoBlocks()
        .filter((b) => b.room_id === room && b.block_date >= from && b.block_date <= to)
        .map((b) => ({
          room_id: b.room_id,
          booking_date: b.block_date,
          start_time: b.start_time,
          end_time: b.end_time,
          purpose: "Unavailable",
          status: "blocked" as const,
        })),
    ];
  const db = await supabaseServer();
  const { data, error } = await db.rpc("public_schedule", {
    p_room_id: room,
    p_from: from,
    p_to: to,
  });
  if (error) throw new Error("Could not load the schedule. Please try again.");
  return data as ScheduleEntry[];
}
export async function getBusy(room: string, date: string): Promise<BusySlot[]> {
  if (isLocal())
    return localQuery<BusySlot>("select * from public.busy_slots($1,$2)", [room, date]);
  if (isDemo())
    return [
      ...demoBookings().filter(
        (b) =>
          b.room_id === room &&
          b.booking_date === date &&
          ["pending", "approved", "completed"].includes(b.status),
      ),
      ...demoBlocks().filter((b) => b.room_id === room && b.block_date === date),
    ].map((slot) => ({ start_time: slot.start_time, end_time: slot.end_time }));
  const db = await supabaseServer();
  const { data, error } = await db.rpc("busy_slots", { p_room_id: room, p_date: date });
  if (error) throw new Error("Could not load availability. Please try again.");
  return data as BusySlot[];
}
export async function getUnavailableRanges(
  room: string,
  from: string,
  to: string,
): Promise<(BusySlot & { booking_date: string })[]> {
  if (isLocal())
    return localQuery("select * from public.unavailable_ranges($1,$2,$3)", [room, from, to]);
  if (isDemo())
    return [
      ...demoBookings()
        .filter(
          (b) =>
            b.room_id === room &&
            b.booking_date >= from &&
            b.booking_date <= to &&
            ["pending", "approved", "completed"].includes(b.status),
        )
        .map((b) => ({
          booking_date: b.booking_date,
          start_time: b.start_time,
          end_time: b.end_time,
        })),
      ...demoBlocks()
        .filter((b) => b.room_id === room && b.block_date >= from && b.block_date <= to)
        .map((b) => ({
          booking_date: b.block_date,
          start_time: b.start_time,
          end_time: b.end_time,
        })),
    ];
  const db = await supabaseServer();
  const { data, error } = await db.rpc("unavailable_ranges", {
    p_room_id: room,
    p_from: from,
    p_to: to,
  });
  if (error) throw new Error("Could not load room availability.");
  return data;
}
// Page through API limits so analytics are complete even beyond 1,000 bookings.
export async function getAdminData(
  from: string,
  to: string,
): Promise<{ bookings: Booking[]; blocks: RoomBlock[] }> {
  await requireAdmin();
  if (isLocal()) {
    const [bookings, blocks] = await Promise.all([
      localQuery<Booking>(
        "select * from public.bookings where booking_date between $1 and $2 order by booking_date,start_time",
        [from, to],
        "authenticated",
      ),
      localQuery<RoomBlock>(
        "select * from public.room_blocks where block_date between $1 and $2 order by block_date,start_time",
        [from, to],
        "authenticated",
      ),
    ]);
    return { bookings, blocks };
  }
  if (isDemo())
    return {
      bookings: demoBookings().filter((b) => b.booking_date >= from && b.booking_date <= to),
      blocks: demoBlocks().filter((b) => b.block_date >= from && b.block_date <= to),
    };
  const db = await supabaseServer();
  const bookings: Booking[] = [];
  const blocks: RoomBlock[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db
      .from("bookings")
      .select("*")
      .gte("booking_date", from)
      .lte("booking_date", to)
      .order("id")
      .range(offset, offset + 999);
    if (error) throw new Error("Could not load booking data.");
    bookings.push(...(data as Booking[]));
    if (data.length < 1000) break;
  }
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db
      .from("room_blocks")
      .select("*")
      .gte("block_date", from)
      .lte("block_date", to)
      .order("id")
      .range(offset, offset + 999);
    if (error) throw new Error("Could not load blocked periods.");
    blocks.push(...(data as RoomBlock[]));
    if (data.length < 1000) break;
  }
  return { bookings, blocks };
}
