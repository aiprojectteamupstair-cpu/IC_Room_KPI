import { cn } from "@/lib/utils";
import type { BookingStatus } from "@/types";
const styles = {
  pending: "bg-amber-50 text-amber-800 border-amber-200",
  approved: "bg-red-50 text-red-700 border-red-100",
  completed: "bg-emerald-50 text-emerald-800 border-emerald-100",
  rejected: "bg-zinc-100 text-zinc-600 border-zinc-200",
  cancelled: "bg-zinc-100 text-zinc-600 border-zinc-200",
  blocked: "bg-slate-100 text-slate-600 border-slate-200",
};
export function BookingStatusBadge({ status }: { status: BookingStatus | "blocked" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize",
        styles[status],
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}
