import "server-only";
import nodemailer from "nodemailer";
import { isLocal } from "@/lib/supabase/config";
import { bookingService } from "@/lib/supabase/service";
import { supabaseServer } from "@/lib/supabase/server";
import { localQuery } from "@/lib/database/local";
import { dispatchBookingEmails } from "./dispatch";
import { bookingEmail, type BookingEmailJob } from "./message";
import { smtpSettings, smtpErrorCode, smtpErrorMessage } from "./smtp-settings";

async function serviceRpc(name: string, args: Record<string, unknown>) {
  if (isLocal()) {
    if (name === "claim_booking_emails")
      return localQuery<BookingEmailJob>(
        "select * from public.claim_booking_emails($1)",
        Object.values(args),
        "service_role",
      );
    return localQuery(
      "select public.finish_booking_email($1,$2,$3,$4)",
      Object.values(args),
      "service_role",
    );
  }
  const { data, error } = await bookingService().rpc(name, args);
  if (error) throw new Error("Email queue unavailable");
  return data;
}

export async function deliverBookingEmails(bookingId: string): Promise<string | undefined> {
  try {
    const state = await readEmailState(bookingId, false);
    if (!state)
      return "No email is queued. Older bookings need a customer email before a decision can be emailed.";
    if (state === "sent") return;
  } catch {
    return "Booking saved, but email queue could not be checked. Retry email from booking details.";
  }
  let settings: ReturnType<typeof smtpSettings>;
  try {
    settings = smtpSettings(process.env);
  } catch (error) {
    return `Booking saved. Email remains queued. ${(error as Error).message}`;
  }
  const transport = nodemailer.createTransport(settings);
  try {
    const result = await dispatchBookingEmails(
      bookingId,
      {
        claim: async (id) =>
          (await serviceRpc("claim_booking_emails", { p_booking_id: id })) as BookingEmailJob[],
        finish: async (job, sent, error) => {
          await serviceRpc("finish_booking_email", {
            p_id: job.id,
            p_token: job.lease_token,
            p_sent: sent,
            p_error: error,
          });
        },
      },
      async (job) => {
        const result = await transport.sendMail({
          from: { name: "Innovation Centre", address: settings.auth.user },
          to: job.recipient,
          replyTo: "innovation.centre4@gmail.com",
          messageId: `<booking-${job.id}@${settings.auth.user.split("@")[1]}>`,
          ...bookingEmail(job),
        });
        if (!result.accepted?.length)
          throw Object.assign(new Error("Recipient was not accepted"), { code: "ERECIPIENT" });
      },
    );
    if (result.failed)
      return `Booking saved. ${smtpErrorMessage(result.lastError || "SMTP_ERROR")}`;
    const state = await readEmailState(bookingId, false);
    if (state && state !== "sent")
      return "Email is queued or already being sent. Check booking details before retrying.";
  } catch {
    console.error("[Booking email] Delivery or queue update failed", { bookingId });
    return "Booking saved, but email delivery could not be confirmed. Check booking details and retry email.";
  } finally {
    transport.close();
  }
}

export async function bookingEmailState(bookingId: string): Promise<string | null> {
  return readEmailState(bookingId, true);
}
export async function bookingEmailError(bookingId: string): Promise<string | null> {
  if (isLocal()) {
    const rows = await localQuery<{ last_error: string | null }>(
      "select last_error from public.booking_emails where booking_id=$1 order by created_at desc limit 1",
      [bookingId],
      "authenticated",
    );
    return rows[0]?.last_error ? smtpErrorMessage(rows[0].last_error) : null;
  }
  const db = await supabaseServer();
  const { data, error } = await db
    .from("booking_emails")
    .select("last_error")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw new Error("Could not load email delivery error");
  return data[0]?.last_error ? smtpErrorMessage(data[0].last_error) : null;
}
export async function verifySmtpConnection(): Promise<{ success: true } | { error: string }> {
  let settings: ReturnType<typeof smtpSettings>;
  try {
    settings = smtpSettings(process.env);
  } catch (error) {
    return { error: (error as Error).message };
  }
  const transport = nodemailer.createTransport(settings);
  try {
    await transport.verify();
    return { success: true };
  } catch (error) {
    return { error: smtpErrorMessage(smtpErrorCode(error)) };
  } finally {
    transport.close();
  }
}
async function readEmailState(bookingId: string, admin: boolean): Promise<string | null> {
  if (isLocal()) {
    const rows = await localQuery<{ state: string }>(
      "select state from public.booking_emails where booking_id=$1 order by created_at desc limit 1",
      [bookingId],
      admin ? "authenticated" : "service_role",
    );
    return rows[0]?.state || null;
  }
  const db = admin ? await supabaseServer() : bookingService();
  const { data, error } = await db
    .from("booking_emails")
    .select("state")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw new Error("Could not load email status");
  return data[0]?.state || null;
}
