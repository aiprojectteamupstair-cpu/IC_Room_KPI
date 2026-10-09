"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { bookingSchema } from "@/lib/validation/booking";
import { roomSchema } from "@/lib/validation/room";
import { minutes, timeString } from "@/lib/booking/time";
import { statuses } from "@/types";
import { mutate } from "@/lib/database/mutations";
import { isLocal } from "@/lib/supabase/config";
import { localQuery } from "@/lib/database/local";
type Result = { success: true } | { error: string };
function invalidate() {
  for (const path of [
    "/",
    "/schedule",
    "/book",
    "/admin",
    "/admin/bookings",
    "/admin/calendar",
    "/admin/kpi",
    "/admin/settings",
  ])
    revalidatePath(path);
}
function dbError(code: string | undefined, message: string) {
  if (code === "23P01") return "This time overlaps another reservation or blocked period.";
  if (code === "P0001") return message;
  return "Could not save this change. Please try again.";
}
export async function changeStatus(id: string, status: string): Promise<Result> {
  const admin = await requireAdmin();
  if (admin.demo) return { error: "Demo is read-only. Connect Supabase to manage bookings." };
  const parsed = z
    .object({ id: z.string().uuid(), status: z.enum(statuses) })
    .safeParse({ id, status });
  if (!parsed.success) return { error: "Invalid booking status" };
  const { data, error } = await mutate("bookings", "update", { status: parsed.data.status }, id);
  if (error) return { error: dbError(error.code, error.message) };
  if (!data?.length) return { error: "Booking not found or no permission." };
  invalidate();
  return { success: true };
}
export async function saveBooking(input: unknown, id?: string): Promise<Result> {
  const admin = await requireAdmin();
  if (admin.demo) return { error: "Demo is read-only." };
  const parsed = bookingSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (id && !z.string().uuid().safeParse(id).success) return { error: "Invalid booking" };
  const b = parsed.data;
  const { website, ...fields } = b;
  void website;
  const end = minutes(b.start_time) + b.duration_minutes;
  if (end >= 1440) return { error: "Booking must end before midnight" };
  const payload = { ...fields, end_time: timeString(end) };
  const result = await mutate(
    "bookings",
    id ? "update" : "insert",
    id ? payload : { ...payload, status: "approved" },
    id,
  );
  if (result.error) return { error: dbError(result.error.code, result.error.message) };
  if (!result.data?.length) return { error: "Booking not found." };
  invalidate();
  return { success: true };
}
const blockSchema = z
  .object({
    room_id: z.string().uuid(),
    block_date: z.string().date(),
    start_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    end_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    reason: z.string().trim().min(2).max(100),
    notes: z.string().max(1000),
  })
  .refine((b) => minutes(b.start_time) < minutes(b.end_time), "End time must be after start time");
export async function saveBlock(input: unknown): Promise<Result> {
  const admin = await requireAdmin();
  if (admin.demo) return { error: "Demo is read-only." };
  const parsed = blockSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { error } = await mutate("room_blocks", "insert", parsed.data);
  if (error) return { error: dbError(error.code, error.message) };
  invalidate();
  return { success: true };
}
export async function deleteBlock(id: string): Promise<Result> {
  const admin = await requireAdmin();
  if (admin.demo) return { error: "Demo is read-only." };
  if (!z.string().uuid().safeParse(id).success) return { error: "Invalid block" };
  const { error } = await mutate("room_blocks", "delete", {}, id);
  if (error) return { error: "Could not remove this block" };
  invalidate();
  return { success: true };
}
export async function saveRoom(input: unknown): Promise<Result> {
  const admin = await requireAdmin();
  if (admin.demo) return { error: "Demo is read-only." };
  const parsed = roomSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { id, ...fields } = parsed.data;
  const { data, error } = await mutate("rooms", "update", fields, id);
  if (error) return { error: dbError(error.code, error.message) };
  if (!data?.length) return { error: "Room not found." };
  invalidate();
  return { success: true };
}
export async function bookingHistory(id: string) {
  await requireAdmin();
  if (!z.string().uuid().safeParse(id).success) return [];
  if (isLocal())
    return localQuery<{ id: number; action: string; created_at: string }>(
      "select id,action,created_at from public.booking_history where booking_id=$1 order by created_at desc",
      [id],
      "authenticated",
    );
  const db = await supabaseServer();
  const { data, error } = await db
    .from("booking_history")
    .select("id,action,created_at")
    .eq("booking_id", id)
    .order("created_at", { ascending: false });
  if (error) throw new Error("Could not load history");
  return data as { id: number; action: string; created_at: string }[];
}
