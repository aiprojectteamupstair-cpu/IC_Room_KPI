import { addDays, parseISO, startOfMonth, startOfWeek } from "date-fns";

export function monthRange(date: string) {
  const start = startOfWeek(startOfMonth(parseISO(date)), { weekStartsOn: 1 });
  return { start, end: addDays(start, 41) };
}
