import "server-only";
import { isLocal } from "@/lib/supabase/config";
import { localQuery } from "@/lib/database/local";
import { supabaseServer } from "@/lib/supabase/server";
import type { BookingNotification } from "./notification-feed";

// Caller must authenticate; both transports enforce administrator SELECT policies.
export async function recentBookingNotifications(): Promise<BookingNotification[]> {
  if (isLocal())
    return localQuery<BookingNotification>(
      "select id,reference,full_name,booking_date,start_time,status,created_at from public.bookings order by created_at desc,id desc limit 20",
      [],
      "authenticated",
    );
  const db = await supabaseServer();
  const { data, error } = await db
    .from("bookings")
    .select("id,reference,full_name,booking_date,start_time,status,created_at")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(20);
  if (error) throw new Error("Could not load booking notifications");
  return data as BookingNotification[];
}
