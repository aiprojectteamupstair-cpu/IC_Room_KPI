"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { periods } from "@/lib/analytics/period";
import { Button } from "@/components/ui/button";
import type { Room } from "@/types";
export function DateRangeFilter({
  preset,
  from,
  to,
  rooms,
  roomId,
}: {
  preset: string;
  from: string;
  to: string;
  rooms: Room[];
  roomId?: string;
}) {
  const router = useRouter();
  const [period, setPeriod] = useState(preset);
  const [start, setStart] = useState(from);
  const [end, setEnd] = useState(to);
  const [selected, setSelected] = useState(roomId || "all");
  function apply(p = period, r = selected) {
    const params = new URLSearchParams({ period: p, room: r });
    if (p === "custom") {
      params.set("from", start);
      params.set("to", end);
    }
    router.push(`/admin/kpi?${params}`);
  }
  return (
    <div className="mb-6 flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-white p-4">
      <div className="w-full sm:w-auto sm:min-w-44">
        <label htmlFor="kpi-period" className="eyebrow">
          Reporting period
        </label>
        <select
          id="kpi-period"
          value={period}
          onChange={(e) => {
            setPeriod(e.target.value);
            if (e.target.value !== "custom") apply(e.target.value);
          }}
        >
          {periods.map((p) => (
            <option value={p.value} key={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
      {rooms.length > 1 && (
        <div className="w-full sm:w-auto sm:min-w-44">
          <label htmlFor="kpi-room" className="eyebrow">
            Room
          </label>
          <select
            id="kpi-room"
            value={selected}
            onChange={(e) => {
              setSelected(e.target.value);
              apply(period, e.target.value);
            }}
          >
            <option value="all">All rooms</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {period === "custom" && (
        <>
          <div>
            <label htmlFor="kpi-from" className="eyebrow">
              From
            </label>
            <input
              id="kpi-from"
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="kpi-to" className="eyebrow">
              To
            </label>
            <input
              id="kpi-to"
              type="date"
              min={start}
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </div>
          <Button onClick={() => apply()}>Apply range</Button>
        </>
      )}
      <p className="ml-auto pb-3 text-xs text-muted-foreground">
        Asia/Yangon · Approved + completed only
      </p>
    </div>
  );
}
