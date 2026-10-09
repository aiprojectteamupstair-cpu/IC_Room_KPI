"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Save, Info, Building2, Clock3, SlidersHorizontal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { saveRoom } from "@/app/actions/admin";
import type { Room } from "@/types";
export function RoomSettingsForm({ rooms }: { rooms: Room[] }) {
  const [selected, setSelected] = useState(rooms[0].id);
  const [pending, run] = useTransition();
  const room = rooms.find((r) => r.id === selected)!;
  return (
    <div className="mx-auto max-w-3xl">
      {rooms.length > 1 && (
        <div className="mb-5 max-w-sm">
          <label htmlFor="settings-room">Room</label>
          <select id="settings-room" value={selected} onChange={(e) => setSelected(e.target.value)}>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <form
        key={room.id}
        action={(form) =>
          run(async () => {
            const result = await saveRoom({
              id: room.id,
              name: form.get("name"),
              description: form.get("description"),
              capacity: Number(form.get("capacity")),
              opening_time: form.get("opening"),
              closing_time: form.get("closing"),
              minimum_booking_minutes: Number(form.get("minimum")),
              maximum_booking_minutes: Number(form.get("maximum")),
              booking_interval_minutes: Number(form.get("interval")),
              approval_mode: form.get("approval"),
              is_active: form.get("active") === "on",
            });
            if ("error" in result) toast.error(result.error);
            else toast.success("Room settings saved");
          })
        }
        className="space-y-4 sm:space-y-5"
      >
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#fff0ed] text-primary">
                <Building2 size={19} />
              </span>
              <div>
                <CardTitle>Your space</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">The details that make it yours</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-[2fr_1fr]">
              <div>
                <label htmlFor="settings-name">Room name</label>
                <input
                  id="settings-name"
                  name="name"
                  defaultValue={room.name}
                  required
                  maxLength={100}
                />
              </div>
              <div>
                <label htmlFor="settings-capacity">Capacity (people)</label>
                <input
                  id="settings-capacity"
                  name="capacity"
                  type="number"
                  min={1}
                  defaultValue={room.capacity}
                  required
                />
              </div>
            </div>
            <div>
              <label htmlFor="settings-description">Room description</label>
              <textarea
                id="settings-description"
                name="description"
                rows={3}
                maxLength={2000}
                defaultValue={room.description}
              />
            </div>
            <label className="mb-0 flex min-h-14 items-center justify-between gap-5 border-t border-border pt-4">
              <span>
                <span className="block text-sm font-semibold">Open for bookings</span>
                <span className="mt-1 block text-xs font-normal text-muted-foreground">
                  Let visitors request this room
                </span>
              </span>
              <input
                type="checkbox"
                name="active"
                defaultChecked={room.is_active}
                role="switch"
                className="setting-switch"
              />
            </label>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <Clock3 size={19} />
              </span>
              <div>
                <CardTitle>Opening hours</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">Make time for good things</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 gap-3 sm:gap-5">
              <div>
                <label htmlFor="settings-opening">Opening time</label>
                <input
                  id="settings-opening"
                  name="opening"
                  type="time"
                  defaultValue={room.opening_time.slice(0, 5)}
                  required
                />
              </div>
              <div>
                <label htmlFor="settings-closing">Closing time</label>
                <input
                  id="settings-closing"
                  name="closing"
                  type="time"
                  defaultValue={room.closing_time.slice(0, 5)}
                  required
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Myanmar time · Open daily. Add calendar blocks for closures.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                <SlidersHorizontal size={19} />
              </span>
              <div>
                <CardTitle>Booking preferences</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">A few simple ground rules</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-3">
              <div>
                <label htmlFor="settings-min">Minimum duration (minutes)</label>
                <input
                  id="settings-min"
                  name="minimum"
                  type="number"
                  min={1}
                  defaultValue={room.minimum_booking_minutes}
                  required
                />
              </div>
              <div>
                <label htmlFor="settings-max">Maximum duration (minutes)</label>
                <input
                  id="settings-max"
                  name="maximum"
                  type="number"
                  min={1}
                  defaultValue={room.maximum_booking_minutes}
                  required
                />
              </div>
              <div>
                <label htmlFor="settings-interval">Booking interval (minutes)</label>
                <input
                  id="settings-interval"
                  name="interval"
                  type="number"
                  min={5}
                  max={120}
                  defaultValue={room.booking_interval_minutes}
                  required
                />
              </div>
            </div>
            <div>
              <label htmlFor="settings-approval">Booking approval mode</label>
              <select id="settings-approval" name="approval" defaultValue={room.approval_mode}>
                <option value="manual">Manual approval</option>
                <option value="automatic">Automatic approval</option>
              </select>
              <p className="mt-2 text-xs text-muted-foreground">
                Manual approval is recommended. Automatic mode immediately confirms valid requests.
              </p>
            </div>
          </CardContent>
        </Card>
        <div className="flex items-start gap-3 rounded-2xl bg-[#edf2f8] p-4 text-xs leading-6 text-muted-foreground">
          <Info className="mt-1 shrink-0" size={16} />
          Settings changes that invalidate upcoming bookings or blocks are rejected. Historical KPI
          operating hours are recalculated using current settings.
        </div>
        <div className="flex justify-end pt-1">
          <Button disabled={pending} className="w-full sm:w-auto" size="lg">
            <Save size={16} />
            {pending ? "Saving…" : "Save settings"}
          </Button>
        </div>
      </form>
    </div>
  );
}
