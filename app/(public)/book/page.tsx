import { z } from "zod";
import { getRooms } from "@/lib/supabase/queries";
import { isDemo } from "@/lib/supabase/config";
import { BookingForm } from "@/components/booking/booking-form";
import { EmptyState } from "@/components/ui/empty-state";
export default async function Book({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; room?: string; start?: string }>;
}) {
  const params = await searchParams;
  const rooms = (await getRooms())
    .filter((r) => r.is_active)
    .sort((a, b) =>
      a.id === params.room || a.room_code === params.room
        ? -1
        : b.id === params.room || b.room_code === params.room
          ? 1
          : 0,
    );
  return (
    <main className="mx-auto max-w-[1200px] px-5 pt-5 sm:pt-8 md:px-8">
      <div className="booking-hero mb-7 overflow-hidden rounded-[28px] border border-[#f4ded8] bg-[#fff5f1] p-6 sm:p-9">
        <p className="eyebrow mb-2">Make space for your ideas</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Your next idea starts here.
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Find your time, tell us a little about your visit, and leave the rest to us.
        </p>
      </div>
      {rooms.length ? (
        <BookingForm
          rooms={rooms}
          initialDate={z.string().date().safeParse(params.date).success ? params.date : undefined}
          initialStart={
            z
              .string()
              .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
              .safeParse(params.start).success
              ? params.start
              : undefined
          }
          demo={isDemo()}
        />
      ) : (
        <EmptyState title="No room is currently available" />
      )}
    </main>
  );
}
