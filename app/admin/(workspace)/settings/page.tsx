import { getRooms } from "@/lib/supabase/queries";
import { AdminHeader } from "@/components/admin/admin-header";
import { RoomSettingsForm } from "@/components/admin/room-settings-form";
import { EmptyState } from "@/components/ui/empty-state";
import { EmailSettings } from "@/components/admin/email-settings";
export default async function Settings() {
  const rooms = await getRooms();
  return (
    <>
      <AdminHeader
        title="Room settings"
        description="Configure your space, operating hours and booking preferences."
      />
      {rooms.length ? (
        <RoomSettingsForm rooms={rooms} />
      ) : (
        <EmptyState
          title="No rooms configured"
          description="Run the initial room seed to set up your centre."
        />
      )}
      <EmailSettings />
    </>
  );
}
