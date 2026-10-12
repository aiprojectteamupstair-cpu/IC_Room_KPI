"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { saveBooking } from "@/app/actions/admin";
import { purposes, type Booking, type Room } from "@/types";
import { today, minutes, timeString, displayTime } from "@/lib/booking/time";
export function BookingEditor({
  open,
  onOpenChange,
  rooms,
  booking,
  date,
  start,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  rooms: Room[];
  booking?: Booking;
  date?: string;
  start?: string;
}) {
  const [pending, run] = useTransition();
  const [selected, setSelected] = useState(booking?.room_id || rooms[0].id);
  const [time, setTime] = useState(
    booking?.start_time.slice(0, 5) || start || rooms[0].opening_time.slice(0, 5),
  );
  const [duration, setDuration] = useState(booking?.duration_minutes || 60);
  const room = rooms.find((r) => r.id === selected)!;
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={booking ? "Edit booking" : "Create a booking"}
      description="Manual bookings are confirmed immediately. The database checks capacity, operating hours and conflicts."
    >
      <form
        action={(form) =>
          run(async () => {
            const result = await saveBooking(
              {
                room_id: selected,
                full_name: form.get("full_name"),
                email: form.get("email"),
                phone: form.get("phone"),
                number_of_people: Number(form.get("people")),
                booking_date: form.get("date"),
                start_time: time,
                duration_minutes: duration,
                purpose: form.get("purpose"),
                notes: form.get("notes"),
                website: "",
              },
              booking?.id,
            );
            if ("error" in result) toast.error(result.error);
            else {
              toast.success(booking ? "Booking updated" : "Booking created");
              if (result.warning) toast.warning(result.warning, { duration: 8000 });
              onOpenChange(false);
            }
          })
        }
        className="space-y-4"
      >
        <div>
          <label htmlFor="editor-room">Room</label>
          <select id="editor-room" value={selected} onChange={(e) => setSelected(e.target.value)}>
            {rooms.map((r) => (
              <option value={r.id} key={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="editor-email">Email address</label>
            <input
              id="editor-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              defaultValue={booking?.email || ""}
            />
          </div>
          <div>
            <label htmlFor="editor-name">Full name</label>
            <input id="editor-name" name="full_name" required defaultValue={booking?.full_name} />
          </div>
          <div>
            <label htmlFor="editor-phone">Phone</label>
            <input
              id="editor-phone"
              name="phone"
              type="tel"
              required
              defaultValue={booking?.phone}
            />
          </div>
          <div>
            <label htmlFor="editor-date">Date</label>
            <input
              id="editor-date"
              name="date"
              type="date"
              min={today()}
              required
              defaultValue={booking?.booking_date || date || today()}
            />
          </div>
          <div>
            <label htmlFor="editor-people">People</label>
            <input
              id="editor-people"
              name="people"
              type="number"
              min={1}
              max={room.capacity}
              required
              defaultValue={booking?.number_of_people || 1}
            />
          </div>
          <div>
            <label htmlFor="editor-start">Start time</label>
            <input
              id="editor-start"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="editor-duration">Duration (minutes)</label>
            <input
              id="editor-duration"
              type="number"
              min={room.minimum_booking_minutes}
              max={room.maximum_booking_minutes}
              step={room.booking_interval_minutes}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              required
            />
          </div>
        </div>
        <p className="rounded-xl bg-muted p-3 text-sm">
          End time:{" "}
          <strong>
            {time && duration ? displayTime(timeString(minutes(time) + duration)) : "—"}
          </strong>
        </p>
        <div>
          <label htmlFor="editor-purpose">Purpose</label>
          <select id="editor-purpose" name="purpose" defaultValue={booking?.purpose || "Other"}>
            {purposes.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="editor-notes">Notes</label>
          <textarea
            id="editor-notes"
            name="notes"
            rows={3}
            maxLength={1000}
            defaultValue={booking?.notes || ""}
          />
        </div>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button disabled={pending} type="submit">
            {pending ? "Saving…" : "Save booking"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
