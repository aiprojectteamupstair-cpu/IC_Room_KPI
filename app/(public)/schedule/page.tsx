import { z } from "zod";
import { format } from "date-fns";
import { monthRange } from "@/lib/booking/calendar";
import { getRooms, getSchedule, getBusy, getUnavailableRanges } from "@/lib/supabase/queries";
import { today } from "@/lib/booking/time";
import { PublicSchedule } from "@/components/calendar/public-schedule";
import { AutoRefresh } from "@/components/layout/auto-refresh";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { CalendarDays } from "lucide-react";
import Link from "next/link";
export default async function Schedule({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const rooms = (await getRooms()).filter((room) => room.is_active);
  const room =
    rooms.find((room) => room.id === params.room || room.room_code === params.room) || rooms[0];
  if (!room)
    return (
      <EmptyState
        title="The room is currently unavailable"
        description="Please contact the Innovation Centre team or check back later."
      />
    );
  const date = z.string().date().safeParse(params.date).success ? params.date! : today();
  const range = monthRange(date);
  const from = format(range.start, "yyyy-MM-dd"),
    to = format(range.end, "yyyy-MM-dd");
  const [confirmed, busy, unavailable] = await Promise.all([
    getSchedule(room.id, from, to),
    getBusy(room.id, date),
    getUnavailableRanges(room.id, from, to),
  ]);
  const schedule = [
    ...confirmed,
    ...unavailable
      .filter(
        (slot) =>
          !confirmed.some(
            (event) =>
              event.booking_date === slot.booking_date &&
              event.start_time === slot.start_time &&
              event.end_time === slot.end_time,
          ),
      )
      .map((slot) => ({
        ...slot,
        room_id: room.id,
        purpose: "Reserved time",
        status: "blocked" as const,
      })),
  ];
  return (
    <main className="mx-auto max-w-[1200px] px-5 pt-5 sm:px-8 sm:pt-8">
      <AutoRefresh />
      <section className="mb-6">
        <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-primary">
          <CalendarDays size={15} />
          Calendar
        </p>
        <h1 className="text-[28px] font-semibold tracking-tight sm:text-3xl">Find your day.</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {room.name} · Tap a date to see reservations and open times.
        </p>
      </section>
      {rooms.length > 1 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {rooms.map((item) => (
            <Button key={item.id} asChild variant={item.id === room.id ? "secondary" : "outline"}>
              <Link href={"/schedule?" + new URLSearchParams({ room: item.room_code, date })}>
                {item.name}
              </Link>
            </Button>
          ))}
        </div>
      )}
      <PublicSchedule room={room} schedule={schedule} busy={busy} date={date} />
    </main>
  );
}
