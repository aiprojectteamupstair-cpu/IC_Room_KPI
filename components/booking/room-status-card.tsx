import Link from "next/link";
import { ArrowUpRight, Clock3, Users, CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AvailabilityTimeline } from "./availability-timeline";
import { currentMinutes, displayTime, minutes, today } from "@/lib/booking/time";
import { validStarts } from "@/lib/booking/availability";
import type { Room, ScheduleEntry, BusySlot } from "@/types";
export function RoomStatusCard({
  room,
  schedule,
  busy,
}: {
  room: Room;
  schedule: ScheduleEntry[];
  busy: BusySlot[];
}) {
  const now = currentMinutes();
  const inUse = schedule.find((s) => minutes(s.start_time) <= now && minutes(s.end_time) > now);
  const unavailable = busy.some((s) => minutes(s.start_time) <= now && minutes(s.end_time) > now);
  const closed = now < minutes(room.opening_time) || now >= minutes(room.closing_time);
  const next = validStarts(room, today(), busy)[0];
  const hours = schedule
    .filter((s) => s.status !== "blocked")
    .reduce((n, s) => n + (minutes(s.end_time) - minutes(s.start_time)) / 60, 0);
  const status = closed
    ? "Closed"
    : inUse?.status === "blocked"
      ? "Unavailable"
      : inUse
        ? "In use"
        : unavailable
          ? "Reserved"
          : "Available";
  return (
    <Card>
      <CardHeader>
        <CardTitle>Today&apos;s room status</CardTitle>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${status === "Available" ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-700"}`}
        >
          {status}
        </span>
      </CardHeader>
      <CardContent>
        <div className="mb-5 grid grid-cols-3 gap-2 border-b border-border pb-5">
          <div>
            <Clock3 size={16} className="mb-2 text-muted-foreground" />
            <p className="text-xl font-bold">
              {hours}
              <span className="text-xs font-normal text-muted-foreground"> hrs</span>
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">Booked today</p>
          </div>
          <div>
            <CalendarDays size={16} className="mb-2 text-muted-foreground" />
            <p className="text-xl font-bold">
              {schedule.filter((s) => s.status !== "blocked").length}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">Bookings</p>
          </div>
          <div>
            <Users size={16} className="mb-2 text-muted-foreground" />
            <p className="text-xl font-bold">{room.capacity}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">Room capacity</p>
          </div>
        </div>
        <p className="eyebrow mb-3">Today&apos;s availability</p>
        <AvailabilityTimeline room={room} slots={busy} />
        <div className="mt-4 flex items-center justify-between gap-3 text-xs">
          <span className="text-muted-foreground">
            Next available:{" "}
            <strong className="text-foreground">
              {next ? displayTime(next) : "No remaining slots today"}
            </strong>
          </span>
          <Link
            href={`/book?room=${room.room_code}`}
            className="flex items-center gap-1 font-semibold text-primary"
          >
            Reserve <ArrowUpRight size={14} />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
