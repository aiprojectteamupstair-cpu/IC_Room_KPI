import { NextRequest, NextResponse } from "next/server";
import { bookingSchema, type BookingInput } from "@/lib/validation/booking";
import { bookingService } from "@/lib/supabase/service";
import { getRooms, getBusy } from "@/lib/supabase/queries";
import { validDurations } from "@/lib/booking/availability";
import { isDemo, isLocal } from "@/lib/supabase/config";
import { localQuery } from "@/lib/database/local";
import { deliverBookingEmails } from "@/lib/email/notifications";
export async function POST(req: NextRequest) {
  if (req.headers.get("origin") !== req.nextUrl.origin)
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  if (isDemo())
    return NextResponse.json(
      { error: "Demo is read-only. Connect Supabase to submit real booking requests." },
      { status: 503 },
    );
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const parsed = bookingSchema.safeParse(raw);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const b = parsed.data as BookingInput;
  try {
    const room = (await getRooms()).find((r) => r.id === b.room_id && r.is_active);
    if (!room) return NextResponse.json({ error: "Room unavailable" }, { status: 404 });
    if (b.number_of_people > room.capacity)
      return NextResponse.json(
        { error: `Maximum capacity is ${room.capacity} people.` },
        { status: 400 },
      );
    if (
      !validDurations(
        room,
        b.booking_date,
        b.start_time,
        await getBusy(room.id, b.booking_date),
      ).includes(b.duration_minutes)
    )
      return NextResponse.json(
        { error: "This time is no longer available. Choose another time." },
        { status: 409 },
      );
    const args = {
      p_room_id: b.room_id,
      p_full_name: b.full_name,
      p_phone: b.phone,
      p_people: b.number_of_people,
      p_date: b.booking_date,
      p_start: b.start_time,
      p_minutes: b.duration_minutes,
      p_purpose: b.purpose,
      p_notes: b.notes,
      p_email: b.email,
    };
    const { data, error } = isLocal()
      ? await localQuery<{ reference: string; status: string }>(
          "select * from public.create_booking_request($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
          Object.values(args),
          "service_role",
        )
          .then((data) => ({ data, error: null }))
          .catch((error: { code: string; message: string }) => ({ data: null, error }))
      : await bookingService().rpc("create_booking_request", args);
    if (error) {
      if (error.code === "23P01")
        return NextResponse.json(
          { error: "Another request just reserved this time. Please choose another slot." },
          { status: 409 },
        );
      if (error.message.includes("Too many"))
        return NextResponse.json(
          { error: "Too many requests. Please try again in 10 minutes." },
          { status: 429 },
        );
      return NextResponse.json(
        { error: "The booking could not be submitted. Refresh availability and try again." },
        { status: 400 },
      );
    }
    // Automatic approval also queues a confirmation in the booking transaction.
    if (data![0].status === "approved") {
      try {
        const booking = isLocal()
          ? (
              await localQuery<{ id: string }>(
                "select id from public.bookings where reference=$1",
                [data![0].reference],
                "service_role",
              )
            )[0]
          : (
              await bookingService()
                .from("bookings")
                .select("id")
                .eq("reference", data![0].reference)
                .single()
            ).data;
        if (booking) await deliverBookingEmails(booking.id);
      } catch {
        // The booking is committed; never report a submission failure for an email failure.
        console.error("[Booking email] Automatic confirmation remains queued");
      }
    }
    return NextResponse.json(
      { booking: data![0] },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Booking service unavailable. Please try again shortly." },
      { status: 503 },
    );
  }
}
