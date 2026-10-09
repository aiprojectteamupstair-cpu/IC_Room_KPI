import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getBusy } from "@/lib/supabase/queries";
export async function GET(req: NextRequest) {
  const input = z
    .object({ room: z.string().uuid(), date: z.string().date() })
    .safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!input.success) return NextResponse.json({ error: "Invalid date or room" }, { status: 400 });
  try {
    return NextResponse.json(
      {
        slots: (await getBusy(input.data.room, input.data.date)).map((slot) => ({
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
