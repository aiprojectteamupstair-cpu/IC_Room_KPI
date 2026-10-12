import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/auth";
import { getAdminData, getRooms } from "@/lib/supabase/queries";
import { buildWorkbook } from "@/lib/export/workbook";
import { resolvePeriod } from "@/lib/analytics/period";
import { z } from "zod";
import { statuses, purposes } from "@/types";
import { today } from "@/lib/booking/time";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  await requireAdmin();
  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = z
    .object({
      scope: z.enum(["bookings", "kpi"]).default("kpi"),
      search: z.string().max(100).optional(),
      status: z.enum(statuses).optional(),
      date: z.string().date().optional(),
      purpose: z.enum(purposes).optional(),
      room: z.union([z.string().uuid(), z.literal("all")]).optional(),
      sort: z.enum(["date-desc", "date-asc", "created", "duration", "people"]).optional(),
    })
    .safeParse(params);
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid export filters" }, { status: 400 });
  try {
    const period =
      parsed.data.scope === "bookings"
        ? { from: parsed.data.date || "2000-01-01", to: parsed.data.date || "2100-12-31" }
        : resolvePeriod(params);
    const [allRooms, data] = await Promise.all([getRooms(), getAdminData(period.from, period.to)]);
    const rooms =
      parsed.data.room && parsed.data.room !== "all"
        ? allRooms.filter((r) => r.id === parsed.data.room)
        : allRooms;
    const ids = new Set(rooms.map((r) => r.id));
    const { search, status, purpose } = parsed.data;
    const bookings = data.bookings
      .filter(
        (b) =>
          ids.has(b.room_id) &&
          (!status || b.status === status) &&
          (!purpose || b.purpose === purpose) &&
          (!search ||
            [b.full_name, b.email || "", b.phone, b.reference].some((v) =>
              v.toLowerCase().includes(search.toLowerCase()),
            )),
      )
      .sort((a, b) =>
        parsed.data.sort === "created"
          ? b.created_at.localeCompare(a.created_at)
          : parsed.data.sort === "duration"
            ? b.duration_minutes - a.duration_minutes
            : parsed.data.sort === "people"
              ? b.number_of_people - a.number_of_people
              : parsed.data.sort === "date-desc"
                ? (b.booking_date + b.start_time).localeCompare(a.booking_date + a.start_time)
                : (a.booking_date + a.start_time).localeCompare(b.booking_date + b.start_time),
      );
    const dates = bookings.map((b) => b.booking_date).sort();
    const from = parsed.data.scope === "bookings" ? dates[0] || today() : period.from;
    const to = parsed.data.scope === "bookings" ? dates.at(-1) || from : period.to;
    const bytes = await buildWorkbook(rooms, bookings, data.blocks, from, to);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="Innovation-Centre-${from}-to-${to}.xlsx"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Could not create the Excel export. Please check your reporting dates and retry." },
      { status: 500 },
    );
  }
}
