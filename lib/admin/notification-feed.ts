export interface BookingNotification {
  id: string;
  reference: string;
  full_name: string;
  booking_date: string;
  start_time: string;
  status: string;
  created_at: string;
}

// Realtime and polling use the same tracker so each booking alerts only once.
export class BookingNotificationTracker {
  private seen: Set<string>;
  private latest: number;
  constructor(initial: BookingNotification[]) {
    this.seen = new Set(initial.map((booking) => booking.id));
    this.latest = Math.max(0, ...initial.map((booking) => Date.parse(booking.created_at)));
  }
  ingest(bookings: BookingNotification[]) {
    const fresh = bookings.filter(
      (booking) => !this.seen.has(booking.id) && Date.parse(booking.created_at) >= this.latest,
    );
    for (const booking of bookings) this.seen.add(booking.id);
    this.latest = Math.max(
      this.latest,
      ...bookings.map((booking) => Date.parse(booking.created_at)),
    );
    if (this.seen.size > 500) this.seen = new Set(bookings.map((booking) => booking.id));
    return fresh;
  }
}
