"use client";
import type { Room, ScheduleEntry, BusySlot } from "@/types";
import { BookingCalendar } from "./booking-calendar";
import { AvailabilityTimeline } from "@/components/booking/availability-timeline";
import { Info } from "lucide-react";
export function PublicSchedule({
  room,
  schedule,
  busy,
  date,
}: {
  room: Room;
  schedule: ScheduleEntry[];
  busy: BusySlot[];
  date: string;
}) {
  return (
    <>
      <BookingCalendar room={room} events={schedule} date={date} basePath="/schedule">
        <div>
          <h3 className="mb-3 text-sm font-semibold">Available times</h3>
          <AvailabilityTimeline room={room} slots={busy} availableOnly />
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          Ready to reserve? Use Book a space below. Your selected day and room carry over.
        </p>
      </BookingCalendar>
      <p className="mt-5 flex items-start gap-2 text-xs leading-5 text-muted-foreground">
        <Info size={15} className="mt-0.5 shrink-0" />
        Confirmed activities and anonymous unavailable times are shown. Requests hold their time
        while they are reviewed.
      </p>
    </>
  );
}
