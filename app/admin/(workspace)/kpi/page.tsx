import Link from "next/link";
import { CalendarDays, Clock3, ChartNoAxesCombined, Users, Timer, UserRound } from "lucide-react";
import { AdminHeader } from "@/components/admin/admin-header";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { DateRangeFilter } from "@/components/dashboard/date-range-filter";
import {
  UtilizationChart,
  BookingActivityChart,
  ActivityDistributionChart,
  PopularHoursChart,
} from "@/components/dashboard/charts";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { getRooms, getAdminData } from "@/lib/supabase/queries";
import { calculateKpis } from "@/lib/analytics/calculate";
import { resolvePeriod } from "@/lib/analytics/period";
import { displayDate } from "@/lib/booking/time";
import { ExportButton } from "@/components/admin/export-button";
export default async function Kpi({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  let period: ReturnType<typeof resolvePeriod>;
  try {
    period = resolvePeriod(params);
  } catch (e) {
    return (
      <>
        <AdminHeader
          title="Room KPI"
          description="Understand how your space supports your community."
        />
        <Card>
          <CardContent>
            <p className="text-sm text-red-700">
              {e instanceof Error ? e.message : "Invalid date range"}
            </p>
            <Link href="/admin/kpi" className="mt-4 block text-sm text-primary">
              Reset reporting period
            </Link>
          </CardContent>
        </Card>
      </>
    );
  }
  const [allRooms, data] = await Promise.all([getRooms(), getAdminData(period.from, period.to)]);
  const rooms =
    params.room && params.room !== "all" ? allRooms.filter((r) => r.id === params.room) : allRooms;
  const kpi = calculateKpis(rooms, data.bookings, data.blocks, period.from, period.to);
  return (
    <>
      <AdminHeader
        title="Room KPI"
        description={`A clearer picture of your impact · ${displayDate(period.from, "d MMM yyyy")} – ${displayDate(period.to, "d MMM yyyy")}`}
      >
        <ExportButton
          params={{
            ...params,
            scope: "kpi",
            period: period.preset,
            from: period.from,
            to: period.to,
          }}
        />
      </AdminHeader>
      <DateRangeFilter {...period} rooms={allRooms} roomId={params.room} />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
        <KpiCard
          label="Total bookings"
          value={kpi.totalBookings}
          detail="Confirmed and completed gatherings"
          icon={CalendarDays}
        />
        <KpiCard
          label="Total booked hours"
          value={`${kpi.totalHours.toFixed(1)} hrs`}
          detail="Time invested in ideas and collaboration"
          icon={Clock3}
        />
        <KpiCard
          label="Room utilization"
          value={`${kpi.utilization.toFixed(1)}%`}
          detail={`Of ${kpi.availableHours.toFixed(1)} available operating hours`}
          icon={ChartNoAxesCombined}
          accent
        />
        <KpiCard
          label="Average booking duration"
          value={`${kpi.averageDuration.toFixed(1)} hrs`}
          detail="Booked hours ÷ confirmed/completed bookings"
          icon={Timer}
        />
        <KpiCard
          label="Average people per booking"
          value={kpi.averagePeople.toFixed(1)}
          detail="Participants ÷ confirmed/completed bookings"
          icon={UserRound}
        />
        <KpiCard
          label="Total participants"
          value={kpi.totalParticipants}
          detail="Attendee places, including repeat participants"
          icon={Users}
        />
      </div>
      <div className="my-5 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Most popular time</p>
            <p className="text-lg font-bold">{kpi.popularTime}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Most popular day</p>
            <p className="text-lg font-bold">{kpi.popularDay}</p>
          </CardContent>
        </Card>
      </div>
      {kpi.totalBookings ? (
        <div className="grid gap-5 xl:grid-cols-2">
          <UtilizationChart days={kpi.days} />
          <BookingActivityChart days={kpi.days} />
          <ActivityDistributionChart activities={kpi.activities} />
          <PopularHoursChart hours={kpi.popularHours} />
        </div>
      ) : (
        <Card>
          <EmptyState
            title="No KPI information available for this period."
            description="Approved and completed bookings will appear here as your community uses the space."
          />
        </Card>
      )}
      <p className="mt-5 text-xs leading-6 text-muted-foreground">
        Utilization = booked hours ÷ operating hours after blocked time × 100. Reporting uses
        current room operating settings for each calendar day. Pending, rejected and cancelled
        bookings are excluded. Popular time counts any booking overlapping an hour; ties use the
        earliest hour. Participants are attendee places, not unique people.
      </p>
    </>
  );
}
