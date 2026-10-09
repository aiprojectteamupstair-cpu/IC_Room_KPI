import {
  addDays,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfYear,
  format,
  parseISO,
  differenceInCalendarDays,
} from "date-fns";
import { today } from "@/lib/booking/time";
import { z } from "zod";
export const periods = [
  { value: "today", label: "Today" },
  { value: "7days", label: "Last 7 days" },
  { value: "month", label: "This month" },
  { value: "lastmonth", label: "Last month" },
  { value: "3months", label: "Last 3 months" },
  { value: "year", label: "This year" },
  { value: "custom", label: "Custom range" },
];
export function resolvePeriod(params: Record<string, string | undefined>, now = today()) {
  const day = parseISO(now);
  const preset = periods.some((p) => p.value === params.period) ? params.period! : "month";
  let from = startOfMonth(day),
    to = day;
  if (preset === "today") from = day;
  if (preset === "7days") from = addDays(day, -6);
  if (preset === "lastmonth") {
    from = startOfMonth(subMonths(day, 1));
    to = endOfMonth(from);
  }
  if (preset === "3months") from = addDays(subMonths(day, 3), 1);
  if (preset === "year") from = startOfYear(day);
  if (preset === "custom") {
    const parsed = z.object({ from: z.string().date(), to: z.string().date() }).safeParse(params);
    if (!parsed.success)
      throw new Error("Choose a valid start and end date for your custom range.");
    from = parseISO(parsed.data.from);
    to = parseISO(parsed.data.to);
  }
  if (from > to || differenceInCalendarDays(to, from) > 365)
    throw new Error("Choose a date range of up to 366 days, with the end after the start.");
  return { preset, from: format(from, "yyyy-MM-dd"), to: format(to, "yyyy-MM-dd") };
}
