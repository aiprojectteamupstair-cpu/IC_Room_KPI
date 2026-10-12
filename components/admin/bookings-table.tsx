"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Plus, Eye, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import type { Booking, Room } from "@/types";
import { statuses, purposes } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { BookingStatusBadge } from "@/components/booking/status-badge";
import { BookingDetailsDialog } from "./booking-details-dialog";
import { BookingEditor } from "./booking-editor";
import { changeStatus } from "@/app/actions/admin";
import { displayTime, displayDate } from "@/lib/booking/time";
import { formatInTimeZone } from "@/lib/utils/date";
import { ExportButton } from "./export-button";
export function BookingsTable({ bookings, rooms }: { bookings: Booking[]; rooms: Room[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const requestedId = searchParams.get("booking");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [date, setDate] = useState("");
  const [purpose, setPurpose] = useState("");
  const [sort, setSort] = useState("date-desc");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Booking | null>(null);
  const [editing, setEditing] = useState<Booking | undefined>();
  const [editor, setEditor] = useState(false);
  const [pending, run] = useTransition();
  useEffect(() => {
    if (requestedId) setSelected(bookings.find((booking) => booking.id === requestedId) || null);
  }, [requestedId, bookings]);
  const rows = useMemo(
    () =>
      bookings
        .filter(
          (b) =>
            (!search ||
              [b.full_name, b.email || "", b.phone, b.reference].some((v) =>
                v.toLowerCase().includes(search.toLowerCase()),
              )) &&
            (!status || b.status === status) &&
            (!date || b.booking_date === date) &&
            (!purpose || b.purpose === purpose),
        )
        .sort((a, b) =>
          sort === "created"
            ? b.created_at.localeCompare(a.created_at)
            : sort === "duration"
              ? b.duration_minutes - a.duration_minutes
              : sort === "people"
                ? b.number_of_people - a.number_of_people
                : sort === "date-asc"
                  ? (a.booking_date + a.start_time).localeCompare(b.booking_date + b.start_time)
                  : (b.booking_date + b.start_time).localeCompare(a.booking_date + a.start_time),
        ),
    [bookings, search, status, date, purpose, sort],
  );
  const pages = Math.max(1, Math.ceil(rows.length / 10));
  const current = Math.min(page, pages);
  const filter =
    (set: (s: string) => void) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      set(e.target.value);
      setPage(1);
    };
  function approve(booking: Booking) {
    run(async () => {
      const result = await changeStatus(booking.id, "approved");
      if ("error" in result) toast.error(result.error);
      else {
        toast.success("Booking approved");
        if (result.warning) toast.warning(result.warning, { duration: 8000 });
      }
    });
  }
  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {rows.length} booking{rows.length !== 1 ? "s" : ""}
        </p>
        <div className="flex flex-wrap gap-3">
          <ExportButton
            params={{
              scope: "bookings",
              search: search || undefined,
              status: status || undefined,
              date: date || undefined,
              purpose: purpose || undefined,
              sort,
            }}
          />
          <Button
            onClick={() => {
              setEditing(undefined);
              setEditor(true);
            }}
          >
            <Plus size={16} />
            Create booking
          </Button>
        </div>
      </div>
      <Card>
        <div className="grid grid-cols-2 gap-3 border-b border-border p-4 sm:p-5 xl:grid-cols-[1.7fr_1fr_1fr_1fr_1fr]">
          <div className="relative col-span-2 xl:col-span-1">
            <label htmlFor="booking-search" className="sr-only">
              Search bookings
            </label>
            <Search className="absolute left-3 top-3.5 text-muted-foreground" size={16} />
            <input
              id="booking-search"
              className="pl-9"
              placeholder="Name, phone or reference…"
              value={search}
              onChange={filter(setSearch)}
            />
          </div>
          <div>
            <label htmlFor="status-filter" className="sr-only">
              Status
            </label>
            <select id="status-filter" value={status} onChange={filter(setStatus)}>
              <option value="">All statuses</option>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s[0].toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="date-filter" className="sr-only">
              Booking date
            </label>
            <input id="date-filter" type="date" value={date} onChange={filter(setDate)} />
          </div>
          <div>
            <label htmlFor="purpose-filter" className="sr-only">
              Purpose
            </label>
            <select id="purpose-filter" value={purpose} onChange={filter(setPurpose)}>
              <option value="">All activities</option>
              {purposes.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="booking-sort" className="sr-only">
              Sort by
            </label>
            <select id="booking-sort" value={sort} onChange={filter(setSort)}>
              <option value="date-desc">Date: newest</option>
              <option value="date-asc">Date: oldest</option>
              <option value="created">Recently created</option>
              <option value="duration">Longest duration</option>
              <option value="people">Most people</option>
            </select>
          </div>
        </div>
        {rows.length ? (
          <>
            <div className="divide-y divide-border px-4 md:hidden">
              {rows.slice((current - 1) * 10, current * 10).map((booking) => (
                <article key={booking.id} className="py-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-muted-foreground">
                        {booking.reference}
                      </p>
                      <h2 className="mt-1 break-words text-base font-semibold">
                        {booking.full_name}
                      </h2>
                    </div>
                    <BookingStatusBadge status={booking.status} />
                  </div>
                  <p className="mt-3 text-sm font-medium">{booking.purpose}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {displayDate(booking.booking_date, "EEE, d MMM")} ·{" "}
                    {displayTime(booking.start_time)} – {displayTime(booking.end_time)}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {booking.number_of_people} people · {booking.duration_minutes / 60} hours
                  </p>
                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setSelected(booking)}
                      aria-label={`View ${booking.reference}`}
                    >
                      <Eye size={16} />
                      Details
                    </Button>
                    {booking.status === "pending" && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="flex-1"
                        disabled={pending}
                        onClick={() => approve(booking)}
                        aria-label={`Approve ${booking.reference}`}
                      >
                        <Check size={16} />
                        Approve
                      </Button>
                    )}
                  </div>
                </article>
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full whitespace-nowrap text-left text-xs">
                <thead className="bg-zinc-50 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    {[
                      "Booking ID",
                      "Name / Phone",
                      "Date",
                      "Start / End",
                      "Duration",
                      "People",
                      "Purpose",
                      "Status",
                      "Created",
                      "Actions",
                    ].map((h) => (
                      <th key={h} className="px-4 py-4 font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice((current - 1) * 10, current * 10).map((b) => (
                    <tr key={b.id} className="border-t border-border hover:bg-zinc-50/50">
                      <td className="px-4 py-4 font-semibold">{b.reference}</td>
                      <td className="px-4 py-4">
                        <p className="font-semibold">{b.full_name}</p>
                        <p className="mt-1 text-muted-foreground">{b.phone}</p>
                      </td>
                      <td className="px-4 py-4">{displayDate(b.booking_date, "d MMM yy")}</td>
                      <td className="px-4 py-4">
                        <p>{displayTime(b.start_time)}</p>
                        <p className="mt-1 text-muted-foreground">{displayTime(b.end_time)}</p>
                      </td>
                      <td className="px-4 py-4">{b.duration_minutes / 60} hrs</td>
                      <td className="px-4 py-4">{b.number_of_people}</td>
                      <td className="px-4 py-4">{b.purpose}</td>
                      <td className="px-4 py-4">
                        <BookingStatusBadge status={b.status} />
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">
                        {formatInTimeZone(b.created_at)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`View ${b.reference}`}
                            onClick={() => setSelected(b)}
                          >
                            <Eye size={16} />
                          </Button>
                          {b.status === "pending" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Approve ${b.reference}`}
                              disabled={pending}
                              onClick={() => approve(b)}
                            >
                              <Check size={16} />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <EmptyState
            title="No bookings match your filters."
            description="Try a different search or clear your filters."
          />
        )}
        <div className="flex items-center justify-between border-t border-border p-4 text-xs text-muted-foreground">
          <span>
            {rows.length
              ? `${(current - 1) * 10 + 1}–${Math.min(current * 10, rows.length)} of ${rows.length}`
              : "0 bookings"}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              disabled={current === 1}
              onClick={() => setPage(current - 1)}
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </Button>
            <span>
              Page {current} of {pages}
            </span>
            <Button
              variant="outline"
              size="icon"
              disabled={current === pages}
              onClick={() => setPage(current + 1)}
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      </Card>
      <BookingDetailsDialog
        booking={selected}
        onClose={() => {
          setSelected(null);
          if (requestedId) {
            const params = new URLSearchParams(searchParams.toString());
            params.delete("booking");
            router.replace(`/admin/bookings${params.size ? `?${params}` : ""}`, { scroll: false });
          }
        }}
        onEdit={(b) => {
          setSelected(null);
          setEditing(b);
          setEditor(true);
        }}
      />
      {editor && (
        <BookingEditor
          key={editing?.id || "new"}
          open={editor}
          onOpenChange={setEditor}
          rooms={rooms}
          booking={editing}
        />
      )}
    </>
  );
}
