import { getAdminData, getRooms } from "@/lib/supabase/queries";
import { AdminHeader } from "@/components/admin/admin-header";
import { BookingsTable } from "@/components/admin/bookings-table";
import { EmptyState } from "@/components/ui/empty-state";
export default async function Bookings() {
  const [data, rooms] = await Promise.all([getAdminData("2000-01-01", "2100-12-31"), getRooms()]);
  return (
    <>
      <AdminHeader
        title="Bookings"
        description="Every request, every gathering. Manage your room bookings here."
      />
      {rooms.length ? (
        <BookingsTable bookings={data.bookings} rooms={rooms} />
      ) : (
        <EmptyState title="No room configured" />
      )}
    </>
  );
}
