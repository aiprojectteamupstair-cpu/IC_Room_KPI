import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getBusy, getRooms } from "@/lib/supabase/queries";
export async function GET(req: NextRequest) {
  const input = z
    .object({
      room: z.union([z.string().uuid(), z.string().regex(/^IC-\d{3,}$/)]),
      date: z.string().date(),
    })
    .safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!input.success) return NextResponse.json({ error: "Invalid date or room" }, { status: 400 });
  try {
    const room = (await getRooms()).find(
      (item) =>
        item.is_active && (item.id === input.data.room || item.room_code === input.data.room),
    );
    if (!room) return NextResponse.json({ error: "Room unavailable" }, { status: 404 });
    return NextResponse.json(
      {
        slots: (await getBusy(room.id, input.data.date)).map((slot) => ({
          start_time: slot.start_time,
          end_time: slot.end_time,
        })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Availability is temporarily unavailable. Please retry." },
      { status: 503 },
    );
  }
}
