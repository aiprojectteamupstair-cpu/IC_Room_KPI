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
import {
  deliverBookingEmails,
  bookingEmailState,
  bookingEmailError,
  verifySmtpConnection,
} from "@/lib/email/notifications";
type Result = { success: true; warning?: string } | { error: string };
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
  const warning = ["approved", "rejected"].includes(parsed.data.status)
    ? await deliverBookingEmails(id)
    : undefined;
  return { success: true, warning };
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
  // New manual bookings and older approved bookings given an email queue confirmation.
  let warning: string | undefined;
  try {
    if (!id || (await bookingEmailState(result.data[0].id)))
      warning = await deliverBookingEmails(result.data[0].id);
  } catch {
    warning =
      "Booking saved, but email status could not be checked. Open booking details to retry.";
  }
  return { success: true, warning };
}
export async function emailDeliveryStatus(id: string) {
  await requireAdmin();
  if (!z.string().uuid().safeParse(id).success) return null;
  return bookingEmailState(id);
}
export async function emailDeliveryError(id: string) {
  await requireAdmin();
  if (!z.string().uuid().safeParse(id).success) return null;
  return bookingEmailError(id);
}
export async function testEmailConnection() {
  await requireAdmin();
  return verifySmtpConnection();
}
export async function addMissingBookingEmail(id: string, email: string): Promise<Result> {
  await requireAdmin();
  const parsed = z
    .object({ id: z.string().uuid(), email: z.string().trim().email().max(254).toLowerCase() })
    .safeParse({ id, email });
  if (!parsed.success) return { error: "Enter a valid customer email address." };
  try {
    const data = isLocal()
      ? await localQuery<{ id: string }>(
          "update public.bookings set email=$1 where id=$2 and email is null returning id",
          [parsed.data.email, id],
          "authenticated",
        )
      : await supabaseServer().then(async (db) => {
          const result = await db
            .from("bookings")
            .update({ email: parsed.data.email })
            .eq("id", id)
            .is("email", null)
            .select("id");
          if (result.error) throw new Error("Could not save email");
          return result.data;
        });
    if (!data.length)
      return {
        error: "Booking not found or an email is already recorded. Refresh booking details.",
      };
    invalidate();
    const warning = (await bookingEmailState(id)) ? await deliverBookingEmails(id) : undefined;
    return { success: true, warning };
  } catch {
    return { error: "Could not add the booking email. Please try again." };
  }
}
export async function retryBookingEmail(id: string): Promise<Result> {
  await requireAdmin();
  if (!z.string().uuid().safeParse(id).success) return { error: "Invalid booking" };
  const state = await bookingEmailState(id);
  if (!state)
    return { error: "No email is queued. Older bookings without an email cannot be notified." };
  const warning = await deliverBookingEmails(id);
  return { success: true, warning };
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
