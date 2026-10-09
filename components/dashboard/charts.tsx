"use client";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { KpiData } from "@/lib/analytics/calculate";
const colors = [
  "#E11D2E",
  "#0B0B0D",
  "#6B7280",
  "#B51224",
  "#9CA3AF",
  "#D1D5DB",
  "#4B5563",
  "#FCA5A5",
];
const axis = { fontSize: 10, fill: "#6B7280" };
export function UtilizationChart({ days }: { days: KpiData["days"] }) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Room utilization</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Booked hours as a share of available time
          </p>
        </div>
        <span className="text-[10px] font-semibold text-primary">UTILIZATION %</span>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={days} margin={{ top: 10, right: 12, left: -22, bottom: 0 }}>
              <CartesianGrid stroke="#F0F0F2" vertical={false} />
              <XAxis
                dataKey="label"
                tick={axis}
                axisLine={false}
                tickLine={false}
                minTickGap={25}
              />
              <YAxis unit="%" tick={axis} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
              <Area
                type="monotone"
                dataKey="utilization"
                name="Utilization %"
                stroke="#E11D2E"
                strokeWidth={2.5}
                fill="#E11D2E"
                fillOpacity={0.06}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
export function BookingActivityChart({ days }: { days: KpiData["days"] }) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Booking activity</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Confirmed and completed bookings per day
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={days} margin={{ top: 10, right: 12, left: -22, bottom: 0 }}>
              <CartesianGrid stroke="#F0F0F2" vertical={false} />
              <XAxis
                dataKey="label"
                tick={axis}
                axisLine={false}
                tickLine={false}
                minTickGap={25}
              />
              <YAxis allowDecimals={false} tick={axis} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
              <Bar
                dataKey="bookings"
                name="Bookings"
                fill="#0B0B0D"
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
export function ActivityDistributionChart({ activities }: { activities: KpiData["activities"] }) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Activity types</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">What brings your community together</p>
        </div>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center justify-around gap-3">
        <div className="h-60 w-60">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={activities}
                dataKey="value"
                nameKey="name"
                innerRadius={65}
                outerRadius={95}
                paddingAngle={3}
                isAnimationActive={false}
              >
                {activities.map((a, i) => (
                  <Cell key={a.name} fill={colors[i % colors.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="min-w-40 space-y-3">
          {activities.map((a, i) => (
            <div key={a.name} className="flex items-center gap-2 text-xs">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: colors[i % colors.length] }}
              />
              <span className="flex-1 text-muted-foreground">{a.name}</span>
              <strong>{a.percent}%</strong>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
export function PopularHoursChart({ hours }: { hours: KpiData["popularHours"] }) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Popular booking hours</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Bookings occupying each hour of the day
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hours} margin={{ top: 10, right: 12, left: -22, bottom: 0 }}>
              <CartesianGrid stroke="#F0F0F2" vertical={false} />
              <XAxis dataKey="label" tick={axis} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={axis} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
              <Bar
                dataKey="bookings"
                name="Bookings"
                fill="#E11D2E"
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
