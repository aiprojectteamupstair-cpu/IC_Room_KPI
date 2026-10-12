import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/auth";
import { recentBookingNotifications } from "@/lib/admin/notifications";
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Administrator login required" }, { status: 401 });
  }
  try {
    return NextResponse.json(
      { bookings: await recentBookingNotifications() },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "Notifications temporarily unavailable" }, { status: 503 });
  }
}
