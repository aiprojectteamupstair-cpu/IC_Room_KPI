"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, X, Clock3, Users } from "lucide-react";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { BookingStatusBadge } from "@/components/booking/status-badge";
import { BookingDetailsDialog } from "@/components/admin/booking-details-dialog";
import { ConfirmationDialog } from "@/components/admin/confirmation-dialog";
import { BookingEditor } from "@/components/admin/booking-editor";
import { changeStatus } from "@/app/actions/admin";
import type { Booking, Room, RoomBlock } from "@/types";
import { today, displayTime, displayDate } from "@/lib/booking/time";
export function DashboardContent({
  bookings,
  blocks,
  rooms,
}: {
  bookings: Booking[];
  blocks: RoomBlock[];
  rooms: Room[];
}) {
  const [selected, setSelected] = useState<Booking | null>(null);
  const [reject, setReject] = useState<Booking | null>(null);
  const [editing, setEditing] = useState<Booking | undefined>();
  const [pending, run] = useTransition();
  const date = today();
  const confirmed = bookings
    .filter((b) => b.booking_date === date && ["approved", "completed"].includes(b.status))
    .sort((a, b) => a.start_time.localeCompare(b.start_time));
  const requests = bookings
    .filter((b) => b.status === "pending")
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const upcoming = bookings
    .filter((b) => b.booking_date > date && b.status === "approved")
    .sort((a, b) => (a.booking_date + a.start_time).localeCompare(b.booking_date + b.start_time))
    .slice(0, 6);
  function update(b: Booking, status: "approved" | "rejected") {
    run(async () => {
      const result = await changeStatus(b.id, status);
      if ("error" in result) toast.error(result.error);
      else {
        toast.success(`Booking ${status}`);
        setReject(null);
      }
    });
  }
  return (
    <>
      <div className="mb-6 grid gap-5 xl:grid-cols-[1.45fr_1fr]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Today&apos;s schedule</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">{displayDate(date)}</p>
            </div>
            <Link href="/admin/calendar" className="text-xs font-semibold text-primary">
              View calendar ↗
            </Link>
          </CardHeader>
          <CardContent>
            {!confirmed.length && !blocks.some((b) => b.block_date === date) ? (
              <EmptyState title="No bookings today." description="An open day for new ideas." />
            ) : (
              <div className="space-y-4">
                {confirmed.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setSelected(b)}
                    className="flex w-full flex-wrap items-start gap-3 rounded-2xl border border-border p-4 text-left hover:bg-zinc-50 sm:flex-nowrap"
                  >
                    <div className="flex w-full items-center gap-2 text-xs tabular-nums sm:block sm:w-20 sm:shrink-0">
                      <p className="font-bold">{displayTime(b.start_time)}</p>
                      <p className="text-muted-foreground sm:mt-1">– {displayTime(b.end_time)}</p>
                    </div>
                    <div className="min-w-0 flex-1 border-l-2 border-primary pl-4">
                      <p className="font-semibold">{b.purpose}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {b.full_name} · {rooms.find((r) => r.id === b.room_id)?.name}
                      </p>
                      <p className="mt-3 flex gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users size={12} />
                          {b.number_of_people} people
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock3 size={12} />
                          {b.duration_minutes / 60} hrs
                        </span>
                      </p>
                    </div>
                    <BookingStatusBadge status={b.status} />
                  </button>
                ))}
                {blocks
                  .filter((b) => b.block_date === date)
                  .map((b) => (
                    <div key={b.id} className="rounded-xl bg-zinc-100 p-4 text-sm">
                      <strong>
                        {displayTime(b.start_time)} – {displayTime(b.end_time)}
                      </strong>
                      <p className="mt-1 text-muted-foreground">Blocked · {b.reason}</p>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Pending approval</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">Help your community plan ahead</p>
            </div>
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800">
              {requests.length}
            </span>
          </CardHeader>
          <CardContent>
            {requests.length ? (
              <div className="space-y-4">
                {requests.slice(0, 5).map((b) => (
                  <div key={b.id} className="rounded-xl border border-border p-4">
                    <div className="flex justify-between gap-3">
                      <button className="min-w-0 text-left" onClick={() => setSelected(b)}>
                        <p className="break-words text-sm font-semibold">{b.full_name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{b.purpose}</p>
                      </button>
                      <BookingStatusBadge status="pending" />
                    </div>
                    <p className="my-3 text-xs text-muted-foreground">
                      {displayDate(b.booking_date, "d MMM")} · {displayTime(b.start_time)} –{" "}
                      {displayTime(b.end_time)}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" disabled={pending} onClick={() => update(b, "approved")}>
                        <Check size={14} />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() => setReject(b)}
                      >
                        <X size={14} />
                        Reject
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setSelected(b)}>
                        Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No pending booking requests."
                description="You're all caught up."
              />
            )}
          </CardContent>
        </Card>
      </div>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Upcoming bookings</CardTitle>
          <Link
            href="/admin/bookings"
            className="flex items-center gap-1 text-xs font-semibold text-primary"
          >
            All bookings
            <ArrowUpRight size={14} />
          </Link>
        </CardHeader>
        <CardContent>
          {upcoming.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {upcoming.map((b) => (
                <button
                  key={b.id}
                  className="rounded-xl border border-border p-4 text-left hover:bg-zinc-50"
                  onClick={() => setSelected(b)}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">
                    {displayDate(b.booking_date, "EEE, d MMM")}
                  </p>
                  <p className="mt-2 text-sm font-semibold">{b.purpose}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {displayTime(b.start_time)} – {displayTime(b.end_time)} · {b.number_of_people}{" "}
                    people
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No upcoming confirmed bookings.</p>
          )}
        </CardContent>
      </Card>
      <BookingDetailsDialog
        booking={selected}
        onClose={() => setSelected(null)}
        onEdit={(b) => {
          setSelected(null);
          setEditing(b);
        }}
      />
      {editing && (
        <BookingEditor
          open={!!editing}
          onOpenChange={(v) => {
            if (!v) setEditing(undefined);
          }}
          rooms={rooms}
          booking={editing}
        />
      )}
      <ConfirmationDialog
        open={!!reject}
        onOpenChange={(v) => {
          if (!v) setReject(null);
        }}
        title="Reject this booking request?"
        message="This request will be rejected and its time slot released."
        pending={pending}
        onConfirm={() => reject && update(reject, "rejected")}
      />
    </>
  );
}
