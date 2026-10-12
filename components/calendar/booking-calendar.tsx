"use client";
import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, Clock3 } from "lucide-react";
import { addMonths, format, eachDayOfInterval, parseISO } from "date-fns";
import { monthRange } from "@/lib/booking/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BookingStatusBadge } from "@/components/booking/status-badge";
import { cn } from "@/lib/utils";
import { today, displayTime, displayDate } from "@/lib/booking/time";
import type { Room, BookingStatus } from "@/types";
export type CalendarEvent = {
  id?: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  purpose: string;
  status: BookingStatus | "blocked";
};
const dotStyles = {
  approved: "bg-primary",
  completed: "bg-emerald-500",
  pending: "bg-amber-500",
  blocked: "bg-slate-400",
  cancelled: "bg-slate-400",
  rejected: "bg-slate-400",
};
export function BookingCalendar({
  room,
  events,
  date,
  admin = false,
  onEvent,
  onSlot,
  basePath,
  children,
}: {
  room: Room;
  events: CalendarEvent[];
  date: string;
  admin?: boolean;
  onEvent?: (event: CalendarEvent) => void;
  onSlot?: (date: string, start: string) => void;
  basePath?: string;
  children?: ReactNode;
}) {
  const selected = parseISO(date);
  const days = eachDayOfInterval(monthRange(date));
  const base = basePath || (admin ? "/admin/calendar" : "/schedule");
  const href = (day: Date) =>
    base + "?" + new URLSearchParams({ date: format(day, "yyyy-MM-dd"), room: room.room_code });
  const selectedEvents = events
    .filter((event) => event.booking_date === date)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));
  return (
    <div className="grid items-start gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Card className="mini-calendar mx-auto w-full max-w-lg p-3 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold">{format(selected, "MMMM yyyy")}</h2>
          <div className="flex items-center gap-1">
            <Link
              href={href(parseISO(today()))}
              className="flex min-h-11 items-center rounded-xl px-2 text-xs font-semibold text-primary hover:bg-red-50"
            >
              Today
            </Link>
            <Button asChild variant="ghost" size="icon">
              <Link href={href(addMonths(selected, -1))} aria-label="Previous month">
                <ChevronLeft size={18} />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="icon">
              <Link href={href(addMonths(selected, 1))} aria-label="Next month">
                <ChevronRight size={18} />
              </Link>
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1" aria-label="Days of the week">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
            <span
              key={day}
              className="py-2 text-center text-[10px] font-medium text-muted-foreground"
            >
              {day}
            </span>
          ))}
        </div>
        <div className="mini-calendar-days" aria-label={format(selected, "MMMM yyyy") + " dates"}>
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const dayEvents = events.filter((event) => event.booking_date === key);
            const statuses = [...new Set(dayEvents.map((event) => event.status))].slice(0, 3);
            const active = key === date;
            const current = key === today();
            return (
              <Link
                key={key}
                href={href(day)}
                aria-current={active ? "date" : undefined}
                data-today={current ? "true" : undefined}
                aria-label={
                  displayDate(key, "EEEE, d MMMM yyyy") +
                  (current ? ", today" : "") +
                  (dayEvents.length
                    ? ", " + dayEvents.length + " reservations"
                    : ", no reservations")
                }
                className={cn(
                  "mini-calendar-day flex min-w-0 flex-col items-center justify-center gap-1 py-1 text-sm transition-colors",
                  active ? "bg-primary font-semibold text-white shadow-sm" : "hover:bg-muted",
                  !active && day.getMonth() !== selected.getMonth() && "text-slate-400",
                  !active && current && "bg-[#fff0ed] font-semibold text-primary",
                )}
              >
                <span>{format(day, "d")}</span>
                <span className="flex h-1.5 items-center gap-0.5" aria-hidden="true">
                  {statuses.map((status) => (
                    <span
                      key={status}
                      className={cn(
                        "h-1 w-1 rounded-full",
                        active ? "bg-white" : dotStyles[status],
                      )}
                    />
                  ))}
                </span>
              </Link>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2 border-t border-border pt-4 text-[10px] text-muted-foreground">
          {[
            { status: "approved", label: "Booked" },
            { status: "completed", label: "Completed" },
            ...(admin ? [{ status: "pending", label: "Pending" }] : []),
            { status: "blocked", label: admin ? "Blocked" : "Unavailable" },
          ].map((item) => (
            <span key={item.status} className="flex items-center gap-1.5">
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  dotStyles[item.status as keyof typeof dotStyles],
                )}
              />
              {item.label}
            </span>
          ))}
        </div>
      </Card>
      <Card className="selected-day-schedule w-full">
        <CardContent className="space-y-4">
          <div className="border-b border-border pb-4">
            <p className="mb-1 text-xs text-muted-foreground">Selected day · Myanmar time</p>
            <h2 className="text-lg font-semibold">{displayDate(date, "EEEE, d MMMM")}</h2>
          </div>
          {selectedEvents.length > 0 && (
            <div className="space-y-2">
              {selectedEvents.map((event) => {
                const content = (
                  <>
                    <span className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock3 size={13} />
                      {displayTime(event.start_time)} – {displayTime(event.end_time)}
                    </span>
                    <span className="flex flex-wrap items-center justify-between gap-2">
                      <span className="min-w-0 break-words text-sm font-medium">
                        {event.purpose}
                      </span>
                      {admin && <BookingStatusBadge status={event.status} />}
                    </span>
                  </>
                );
                return admin ? (
                  <button
                    type="button"
                    key={event.id || event.start_time}
                    onClick={() => onEvent?.(event)}
                    className="w-full rounded-2xl bg-muted p-4 text-left hover:bg-slate-100"
                  >
                    {content}
                  </button>
                ) : (
                  <div key={event.id || event.start_time} className="rounded-2xl bg-muted p-4">
                    {content}
                  </div>
                );
              })}
            </div>
          )}
          {!selectedEvents.length && !children && (
            <p className="py-4 text-sm text-muted-foreground">No reservations on this day.</p>
          )}
          {children}
          {admin && onSlot && (
            <Button className="w-full" onClick={() => onSlot(date, room.opening_time.slice(0, 5))}>
              <Plus size={17} />
              Add reservation
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
