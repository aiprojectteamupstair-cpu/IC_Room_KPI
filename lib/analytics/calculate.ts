import { eachDayOfInterval, parseISO, format } from "date-fns";
import type { Room, Booking, RoomBlock } from "@/types";
import { minutes } from "@/lib/booking/time";
export function calculateKpis(
  rooms: Room[],
  bookings: Booking[],
  blocks: RoomBlock[],
  from: string,
  to: string,
) {
  const roomIds = new Set(rooms.map((r) => r.id));
  const eligible = bookings.filter(
    (b) =>
      roomIds.has(b.room_id) &&
      ["approved", "completed"].includes(b.status) &&
      b.booking_date >= from &&
      b.booking_date <= to,
  );
  const hours = eligible.reduce((n, b) => n + b.duration_minutes / 60, 0);
  const participants = eligible.reduce((n, b) => n + b.number_of_people, 0);
  const days = eachDayOfInterval({ start: parseISO(from), end: parseISO(to) }).map((d) => {
    const date = format(d, "yyyy-MM-dd");
    const daily = eligible.filter((b) => b.booking_date === date);
    const available = rooms.reduce((n, r) => {
      const open = minutes(r.opening_time),
        close = minutes(r.closing_time);
      const ranges = blocks
        .filter((b) => b.room_id === r.id && b.block_date === date)
        .map((b) => [Math.max(open, minutes(b.start_time)), Math.min(close, minutes(b.end_time))])
        .filter(([s, e]) => s < e)
        .sort((a, b) => a[0] - b[0]);
      let blocked = 0,
        end = open;
      for (const [s, e] of ranges) {
        blocked += Math.max(0, e - Math.max(s, end));
        end = Math.max(end, e);
      }
      return n + Math.max(0, close - open - blocked) / 60;
    }, 0);
    const booked = daily.reduce((n, b) => n + b.duration_minutes / 60, 0);
    return {
      date,
      label: format(d, "d MMM"),
      bookings: daily.length,
      bookedHours: booked,
      availableHours: available,
      utilization: available ? Math.round((booked / available) * 1000) / 10 : 0,
    };
  });
  const availableHours = days.reduce((n, d) => n + d.availableHours, 0);
  const activityMap = new Map<string, number>();
  eligible.forEach((b) => activityMap.set(b.purpose, (activityMap.get(b.purpose) || 0) + 1));
  const activities = [...activityMap]
    .map(([name, value]) => ({
      name,
      value,
      percent: Math.round((value / eligible.length) * 1000) / 10,
    }))
    .sort((a, b) => b.value - a.value);
  const popularHours = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    label: `${h % 12 || 12}${h < 12 ? "am" : "pm"}`,
    bookings: eligible.filter(
      (b) => minutes(b.start_time) < (h + 1) * 60 && minutes(b.end_time) > h * 60,
    ).length,
  })).filter((h) =>
    rooms.some(
      (r) => minutes(r.opening_time) < (h.hour + 1) * 60 && minutes(r.closing_time) > h.hour * 60,
    ),
  );
  const weekdays = Array.from({ length: 7 }, (_, day) => ({
    name: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][day],
    count: eligible.filter((b) => parseISO(b.booking_date).getDay() === day).length,
  })).sort((a, b) => b.count - a.count);
  const busiest = [...popularHours].sort((a, b) => b.bookings - a.bookings)[0];
  return {
    totalBookings: eligible.length,
    totalHours: hours,
    availableHours,
    utilization: availableHours ? (hours / availableHours) * 100 : 0,
    averageDuration: eligible.length ? hours / eligible.length : 0,
    averagePeople: eligible.length ? participants / eligible.length : 0,
    totalParticipants: participants,
    popularTime: busiest?.bookings
      ? `${busiest.label} – ${(busiest.hour + 1) % 12 || 12}${busiest.hour + 1 < 12 ? "am" : "pm"}`
      : "—",
    popularDay: weekdays[0]?.count ? weekdays[0].name : "—",
    activities,
    popularHours,
    days,
  };
}
export type KpiData = ReturnType<typeof calculateKpis>;
