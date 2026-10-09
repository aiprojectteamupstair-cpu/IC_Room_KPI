import type { BusySlot, Room } from "@/types";
import { timeline } from "@/lib/booking/availability";
import { displayTime } from "@/lib/booking/time";
export function AvailabilityTimeline({
  room,
  slots,
  availableOnly = false,
}: {
  room: Room;
  slots: BusySlot[];
  availableOnly?: boolean;
}) {
  const segments = timeline(room, slots).filter((segment) => !availableOnly || !segment.busy);
  return (
    <div className="space-y-2">
      {!segments.length && (
        <p className="py-3 text-sm text-muted-foreground">No available time on this day.</p>
      )}
      {segments.map((s) => (
        <div
          key={s.start}
          className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-3 text-xs ${s.busy ? "border-zinc-200 bg-zinc-100" : "border-emerald-100 bg-white"}`}
        >
          <span className="font-medium tabular-nums">
            {displayTime(s.start)} – {displayTime(s.end)}
          </span>
          <span
            className={`text-[10px] font-bold uppercase tracking-wider ${s.busy ? "text-zinc-500" : "text-emerald-700"}`}
          >
            {s.busy ? "Unavailable" : "Available"}
          </span>
        </div>
      ))}
    </div>
  );
}
