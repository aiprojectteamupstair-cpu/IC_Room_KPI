import { addDays, format, parseISO } from "date-fns";
import { CalendarDays, Clock3, ChartNoAxesCombined, Inbox } from "lucide-react";
import { AdminHeader } from "@/components/admin/admin-header";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { UtilizationChart, BookingActivityChart } from "@/components/dashboard/charts";
import { getRooms, getAdminData } from "@/lib/supabase/queries";
import { calculateKpis } from "@/lib/analytics/calculate";
import { today } from "@/lib/booking/time";
import { ExportButton } from "@/components/admin/export-button";
export default async function Dashboard() {
  const date = today();
  const from = format(addDays(parseISO(date), -6), "yyyy-MM-dd");
  const [rooms, data] = await Promise.all([getRooms(), getAdminData("2000-01-01", "2100-12-31")]);
  const activeRooms = rooms.filter((r) => r.is_active);
  const daily = calculateKpis(activeRooms, data.bookings, data.blocks, date, date);
  const weekly = calculateKpis(activeRooms, data.bookings, data.blocks, from, date);
  const pending = data.bookings.filter((b) => b.status === "pending").length;
  return (
    <>
      <AdminHeader
        title="A good day for great ideas."
        description="A space for ideas. A clear view of everything happening in it."
      >
        <ExportButton params={{ scope: "kpi", period: "month" }} />
      </AdminHeader>
      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard
          label="Today's bookings"
          value={daily.totalBookings}
          detail="Approved and completed bookings"
          icon={CalendarDays}
        />
        <KpiCard
          label="Today's booked hours"
          value={`${daily.totalHours.toFixed(1)} hrs`}
          detail="Time reserved for your community"
          icon={Clock3}
        />
        <KpiCard
          label="Room utilization"
          value={`${daily.utilization.toFixed(1)}%`}
          detail="Of today's available operating hours"
          icon={ChartNoAxesCombined}
          accent
        />
        <KpiCard
          label="Pending requests"
          value={pending}
          detail="Waiting for your approval"
          icon={Inbox}
        />
      </div>
      <DashboardContent bookings={data.bookings} blocks={data.blocks} rooms={rooms} />
      <div className="grid gap-5 xl:grid-cols-2">
        <UtilizationChart days={weekly.days} />
        <BookingActivityChart days={weekly.days} />
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        Charts show the last 7 days. Approved and completed bookings contribute to usage.
      </p>
    </>
  );
}
