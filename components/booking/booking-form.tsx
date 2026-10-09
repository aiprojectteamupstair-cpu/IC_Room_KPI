"use client";
import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, Check, Clock3, ShieldCheck, Users } from "lucide-react";
import { bookingSchema, type BookingInput } from "@/lib/validation/booking";
import { validStarts, validDurations } from "@/lib/booking/availability";
import { today, minutes, timeString, displayTime, displayDate } from "@/lib/booking/time";
import type { Room, BusySlot } from "@/types";
import { purposes } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AvailabilityTimeline } from "./availability-timeline";
export function BookingForm({
  rooms,
  initialDate,
  initialStart,
  demo = false,
}: {
  rooms: Room[];
  initialDate?: string;
  initialStart?: string;
  demo?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<BusySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [retry, setRetry] = useState(0);
  const firstLoad = useRef(true);
  const {
    register,
    watch,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<BookingInput>({
    resolver: zodResolver(
      bookingSchema.superRefine((data, context) => {
        const selectedRoom = rooms.find((r) => r.id === data.room_id);
        if (selectedRoom && data.number_of_people > selectedRoom.capacity) {
          context.addIssue({
            code: "custom",
            path: ["number_of_people"],
            message: `Maximum capacity is ${selectedRoom.capacity} people.`,
          });
        }
      }),
    ),
    defaultValues: {
      room_id: rooms[0].id,
      full_name: "",
      phone: "",
      number_of_people: 1,
      booking_date: initialDate && initialDate >= today() ? initialDate : today(),
      start_time: "",
      duration_minutes: 0,
      purpose: "Other",
      notes: "",
      website: "",
    },
  });
  const roomId = watch("room_id"),
    date = watch("booking_date"),
    start = watch("start_time"),
    duration = watch("duration_minutes");
  const room = rooms.find((r) => r.id === roomId)!;
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError("");
    setValue("start_time", "");
    setValue("duration_minutes", 0);
    fetch(`/api/availability?room=${roomId}&date=${date}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setBusy(data.slots);
        if (
          firstLoad.current &&
          initialStart &&
          validStarts(room, date, data.slots).includes(initialStart)
        )
          setValue("start_time", initialStart);
        firstLoad.current = false;
        setLoading(false);
      })
      .catch((e) => {
        if (!controller.signal.aborted) {
          setLoadError(e instanceof Error ? e.message : "Could not load availability");
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [roomId, date, setValue, retry]);
  const starts = validStarts(room, date, busy);
  const durations = start ? validDurations(room, date, start, busy) : [];
  useEffect(() => {
    if (!durations.includes(duration)) setValue("duration_minutes", durations[0] || 0);
  }, [start, busy, room, date, duration, setValue]);
  const end = start && duration ? timeString(minutes(start) + duration) : "";
  async function submit(input: BookingInput) {
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) setRetry((r) => r + 1);
        throw new Error(data.error);
      }
      sessionStorage.setItem("ic-booking-receipt", JSON.stringify(data.booking));
      toast.success("Booking request submitted");
      router.push("/booking-success");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not submit booking. Please retry.");
    }
  }
  return (
    <form
      onSubmit={handleSubmit(submit)}
      className="grid gap-6 lg:grid-cols-[1.6fr_1fr]"
      noValidate
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>
              <span className="mr-3 inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[#fff0ed] text-xs text-primary">
                01
              </span>
              Choose your time
            </CardTitle>
            <span className="text-xs text-muted-foreground">Asia/Yangon</span>
          </CardHeader>
          <CardContent className="space-y-5">
            {rooms.length > 1 && (
              <div>
                <label htmlFor="room">Room</label>
                <select id="room" {...register("room_id")}>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label htmlFor="booking-date">Booking date</label>
              <input id="booking-date" type="date" min={today()} {...register("booking_date")} />
              {errors.booking_date && <p className="field-error">{errors.booking_date.message}</p>}
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="start">Start time</label>
                <select id="start" disabled={loading || !!loadError} {...register("start_time")}>
                  <option value="">
                    {loading ? "Loading availability…" : "Select an available time"}
                  </option>
                  {starts.map((s) => (
                    <option key={s} value={s}>
                      {displayTime(s)}
                    </option>
                  ))}
                </select>
                {errors.start_time && <p className="field-error">{errors.start_time.message}</p>}
              </div>
              <div>
                <label htmlFor="duration">Duration</label>
                <select
                  id="duration"
                  disabled={!start || loading || !!loadError}
                  {...register("duration_minutes", { valueAsNumber: true })}
                >
                  <option value={0}>Select duration</option>
                  {durations.map((d) => (
                    <option key={d} value={d}>
                      {d / 60} {d === 60 ? "hour" : "hours"}
                    </option>
                  ))}
                </select>
                {errors.duration_minutes && <p className="field-error">Select a valid duration</p>}
              </div>
            </div>
            <div
              aria-live="polite"
              className="flex items-center justify-between rounded-xl bg-muted px-4 py-3"
            >
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock3 size={16} />
                Calculated end time
              </span>
              <strong>{end ? displayTime(end) : "—"}</strong>
            </div>
            <p className="text-xs leading-5 text-muted-foreground">
              Choose {room.minimum_booking_minutes / 60}–{room.maximum_booking_minutes / 60} hours,
              in {room.booking_interval_minutes}-minute intervals. Only available time ranges can be
              selected.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>
              <span className="mr-3 inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[#fff0ed] text-xs text-primary">
                02
              </span>
              Your details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="name">Full name</label>
                <input
                  id="name"
                  autoComplete="name"
                  placeholder="Your full name"
                  {...register("full_name")}
                />
                {errors.full_name && <p className="field-error">{errors.full_name.message}</p>}
              </div>
              <div>
                <label htmlFor="phone">Phone number</label>
                <input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="09… or +95…"
                  {...register("phone")}
                />
                {errors.phone && <p className="field-error">{errors.phone.message}</p>}
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="people">Number of people</label>
                <input
                  id="people"
                  type="number"
                  min={1}
                  max={room.capacity}
                  {...register("number_of_people", { valueAsNumber: true })}
                />
                <p className="mt-2 text-xs text-muted-foreground">Up to {room.capacity} people</p>
                {errors.number_of_people && (
                  <p className="field-error">{errors.number_of_people.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="purpose">
                  Purpose / activity{" "}
                  <span className="font-normal text-muted-foreground">(optional)</span>
                </label>
                <select id="purpose" {...register("purpose")}>
                  {purposes.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="notes">
                Additional notes{" "}
                <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <textarea
                id="notes"
                rows={3}
                placeholder="Anything the centre team should know?"
                {...register("notes")}
              />
              {errors.notes && <p className="field-error">{errors.notes.message}</p>}
            </div>
            <div className="hidden" aria-hidden="true">
              <input tabIndex={-1} autoComplete="off" {...register("website")} />
            </div>
          </CardContent>
        </Card>
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <p className="flex max-w-sm items-start gap-2 text-xs leading-5 text-muted-foreground">
            <ShieldCheck size={18} className="shrink-0" />
            Your personal details are kept private. Requests are reviewed by the Innovation Centre
            team.
          </p>
          <Button
            type="submit"
            size="lg"
            disabled={isSubmitting || loading || !!loadError || !start || !duration || demo}
          >
            {isSubmitting ? "Submitting…" : "Submit booking request"}
            <ArrowRight size={16} />
          </Button>
        </div>
        {demo && (
          <p className="text-sm text-amber-800">
            This is a read-only demo. Connect Supabase to submit bookings.
          </p>
        )}
      </div>
      <aside className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>Availability</CardTitle>
            <span className="rounded-full bg-muted px-2 py-1 text-[10px] text-muted-foreground">
              Live check
            </span>
          </CardHeader>
          <CardContent>
            <p className="mb-5 text-sm font-semibold">
              {date ? displayDate(date) : "Select a date"}
            </p>
            {loading ? (
              <p role="status" className="py-8 text-sm text-muted-foreground">
                Loading schedule…
              </p>
            ) : loadError ? (
              <div role="alert">
                <p className="mb-3 text-sm text-red-700">{loadError}</p>
                <Button variant="outline" onClick={() => setRetry((r) => r + 1)}>
                  Retry availability
                </Button>
              </div>
            ) : (
              <>
                <AvailabilityTimeline room={room} slots={busy} />
                {starts.length === 0 && (
                  <p className="mt-4 text-sm text-muted-foreground">
                    Room is fully booked or no future slots remain for this date.
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
        <Card className="border-[#f4ded8] bg-[#fff5f1]">
          <CardContent className="p-6">
            <p className="text-xs font-medium text-primary">Your space</p>
            <h2 className="mt-2 text-lg font-bold">{room.name}</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{room.description}</p>
            <div className="mt-5 space-y-3 border-t border-[#f4ded8] pt-5 text-xs text-muted-foreground">
              <p className="flex items-center gap-2">
                <Users size={15} />
                {room.capacity} people maximum
              </p>
              <p className="flex items-center gap-2">
                <Clock3 size={15} />
                {displayTime(room.opening_time)} – {displayTime(room.closing_time)}
              </p>
              <p className="flex items-center gap-2">
                <Check size={15} />
                Pending approval after submission
              </p>
            </div>
          </CardContent>
        </Card>
      </aside>
    </form>
  );
}
