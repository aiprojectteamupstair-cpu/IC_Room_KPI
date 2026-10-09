"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { saveBlock } from "@/app/actions/admin";
import type { Room } from "@/types";
import { today } from "@/lib/booking/time";
export function RoomBlockDialog({
  open,
  onOpenChange,
  room,
  date,
  start,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  room: Room;
  date?: string;
  start?: string;
}) {
  const [pending, run] = useTransition();
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Block room time"
      description="Blocked time is unavailable for all bookings and reduces available operating hours in KPI reporting."
    >
      <form
        action={(form) =>
          run(async () => {
            const result = await saveBlock({
              room_id: room.id,
              block_date: form.get("date"),
              start_time: form.get("start"),
              end_time: form.get("end"),
              reason: form.get("reason"),
              notes: form.get("notes"),
            });
            if ("error" in result) toast.error(result.error);
            else {
              toast.success("Room time blocked");
              onOpenChange(false);
            }
          })
        }
        className="space-y-4"
      >
        <div>
          <label htmlFor="block-date">Date</label>
          <input id="block-date" type="date" name="date" defaultValue={date || today()} required />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="block-start">Start</label>
            <input
              id="block-start"
              type="time"
              name="start"
              defaultValue={start || room.opening_time.slice(0, 5)}
              required
            />
          </div>
          <div>
            <label htmlFor="block-end">End</label>
            <input
              id="block-end"
              type="time"
              name="end"
              defaultValue={room.closing_time.slice(0, 5)}
              required
            />
          </div>
        </div>
        <div>
          <label htmlFor="block-reason">Reason</label>
          <select id="block-reason" name="reason">
            {["Maintenance", "Internal Event", "Holiday", "Cleaning", "Private Event"].map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="block-notes">Notes</label>
          <textarea id="block-notes" name="notes" rows={3} maxLength={1000} />
        </div>
        <Button className="w-full" disabled={pending}>
          {pending ? "Saving…" : "Block time"}
        </Button>
      </form>
    </Dialog>
  );
}
