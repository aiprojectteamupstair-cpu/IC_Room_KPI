import Link from "next/link";
import { z } from "zod";
import { format } from "date-fns";
import { monthRange } from "@/lib/booking/calendar";
import { getRooms, getAdminData } from "@/lib/supabase/queries";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminCalendar } from "@/components/admin/admin-calendar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { today } from "@/lib/booking/time";
export default async function Calendar({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const rooms = await getRooms();
  const room = rooms.find((r) => r.id === params.room || r.room_code === params.room) || rooms[0];
  if (!room) return <EmptyState title="No room configured" />;
  const date = z.string().date().safeParse(params.date).success ? params.date! : today();
  const range = monthRange(date);
  const data = await getAdminData(
    format(range.start, "yyyy-MM-dd"),
    format(range.end, "yyyy-MM-dd"),
  );
  return (
    <>
      <AdminHeader
        title="Room calendar"
        description={`${room.name} · Bookings, requests and unavailable time in one place.`}
      />
      {rooms.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {rooms.map((r) => (
            <Button key={r.id} asChild variant={r.id === room.id ? "secondary" : "outline"}>
              <Link href={`/admin/calendar?room=${r.room_code}&date=${date}`}>
                {r.room_code} · {r.name}
              </Link>
            </Button>
          ))}
        </div>
      )}
      <AdminCalendar
        room={room}
        rooms={rooms}
        bookings={data.bookings}
        blocks={data.blocks}
        date={date}
      />
    </>
  );
}
