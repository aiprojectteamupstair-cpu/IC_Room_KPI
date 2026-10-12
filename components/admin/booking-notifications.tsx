"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bell, CheckCheck } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import {
  BookingNotificationTracker,
  type BookingNotification,
} from "@/lib/admin/notification-feed";
import { displayDate, displayTime } from "@/lib/booking/time";

export function BookingNotifications({
  initial,
  realtime,
  accountId,
}: {
  initial: BookingNotification[];
  realtime: boolean;
  accountId: string;
}) {
  const router = useRouter();
  const [bookings, setBookings] = useState(initial);
  const [readAt, setReadAt] = useState("");
  const [connection, setConnection] = useState("Connecting…");
  const tracker = useRef(new BookingNotificationTracker(initial));
  const storageKey = `ic-admin-notifications:${accountId}`;
  useEffect(() => {
    try {
      setReadAt(localStorage.getItem(storageKey) || "");
    } catch {}
    const onStorage = (event: StorageEvent) => {
      if (event.key === storageKey) setReadAt(event.newValue || "");
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [storageKey]);
  useEffect(() => {
    let active = true,
      inFlight = false,
      live = false;
    const controller = new AbortController();
    async function poll() {
      if (!active || inFlight) return;
      inFlight = true;
      try {
        const response = await fetch("/api/admin/notifications", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Notification feed unavailable");
        const data = await response.json();
        if (!active) return;
        const fresh = tracker.current.ingest(data.bookings);
        setBookings(data.bookings);
        setConnection(live ? "Live updates" : "Checking every 3 seconds");
        for (const booking of fresh)
          toast.info("New booking request", {
            id: `booking-${booking.id}`,
            description: `${booking.full_name} · ${displayDate(booking.booking_date)} · ${displayTime(booking.start_time)}`,
            duration: 10000,
            action: {
              label: "View booking",
              onClick: () => router.push(`/admin/bookings?booking=${booking.id}`),
            },
          });
        if (fresh.length) router.refresh();
      } catch {
        if (active) setConnection("Reconnecting…");
      } finally {
        inFlight = false;
      }
    }
    void poll();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") void poll();
    }, 3000);
    const onFocus = () => {
      if (document.visibilityState === "visible") {
        void poll();
        router.refresh();
      }
    };
    document.addEventListener("visibilitychange", onFocus);
    let cleanup = () => {};
    if (realtime) {
      const db = supabaseBrowser();
      const channel = db.channel(`admin-booking-notifications-${accountId}`);
      for (const table of ["bookings", "room_blocks", "rooms"])
        channel.on("postgres_changes", { event: "*", schema: "public", table }, () => {
          void poll();
          router.refresh();
        });
      channel.subscribe((status) => {
        live = status === "SUBSCRIBED";
        if (active) setConnection(live ? "Live updates" : "Checking every 3 seconds");
        if (live) void poll();
      });
      cleanup = () => {
        void db.removeChannel(channel);
      };
    }
    return () => {
      active = false;
      controller.abort();
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onFocus);
      cleanup();
    };
  }, [accountId, realtime, router]);
  const unread = bookings.filter(
    (booking) => !readAt || Date.parse(booking.created_at) > Date.parse(readAt),
  ).length;
  function markRead() {
    const latest = bookings[0]?.created_at || new Date().toISOString();
    setReadAt(latest);
    try {
      localStorage.setItem(storageKey, latest);
    } catch {}
  }
  return (
    <details className="relative">
      <summary
        aria-label={`Booking notifications${unread ? `, ${unread} unread` : ""}`}
        className="relative flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-full border border-border bg-white text-foreground hover:bg-muted"
      >
        <Bell size={20} aria-hidden="true" />
        {unread > 0 && (
          <span
            aria-hidden="true"
            className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white"
          >
            {unread}
          </span>
        )}
      </summary>
      <div className="absolute right-0 top-[calc(100%+12px)] z-45 w-[min(340px,calc(100vw-32px))] overflow-hidden rounded-3xl border border-border bg-white shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-border p-4">
          <div>
            <h2 className="text-sm font-semibold">Booking notifications</h2>
            <p role="status" className="mt-1 text-xs text-muted-foreground">
              {connection}
            </p>
          </div>
          <button
            type="button"
            onClick={markRead}
            aria-label="Mark notifications as read"
            className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-muted"
          >
            <CheckCheck size={18} />
          </button>
        </div>
        <ul className="max-h-80 overflow-y-auto">
          {bookings.length ? (
            bookings.map((booking) => (
              <li key={booking.id} className="border-b border-border last:border-0">
                <Link
                  href={`/admin/bookings?booking=${booking.id}`}
                  onClick={markRead}
                  className={`block p-4 hover:bg-muted ${!readAt || Date.parse(booking.created_at) > Date.parse(readAt) ? "bg-[#fff5f1]" : ""}`}
                >
                  <p className="text-sm font-semibold">{booking.full_name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {booking.reference} · <span className="capitalize">{booking.status}</span>
                  </p>
                  <p className="mt-2 text-xs">
                    {displayDate(booking.booking_date)} · {displayTime(booking.start_time)}
                  </p>
                </Link>
              </li>
            ))
          ) : (
            <li className="p-6 text-sm text-muted-foreground">No booking requests yet.</li>
          )}
        </ul>
        <Link
          href="/admin/bookings"
          className="block p-4 text-center text-xs font-semibold text-primary"
        >
          View all bookings
        </Link>
      </div>
    </details>
  );
}
