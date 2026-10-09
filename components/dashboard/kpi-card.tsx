import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
export function KpiCard({
  label,
  value,
  detail,
  icon: Icon,
  accent = false,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: LucideIcon;
  accent?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col-reverse items-start justify-between gap-3 sm:flex-row sm:items-center">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <div
            className={`rounded-lg p-2 ${accent ? "bg-red-50 text-primary" : "bg-muted text-zinc-500"}`}
          >
            <Icon size={17} />
          </div>
        </div>
        <p className="mt-3 break-words text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
          {value}
        </p>
        <p className="mt-2 text-[11px] text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}
