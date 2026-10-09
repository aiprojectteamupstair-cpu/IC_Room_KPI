import { today, displayDate } from "@/lib/booking/time";
export function AdminHeader({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">Your workspace</p>
        <h1 className="text-[28px] font-semibold tracking-[-.035em] sm:text-3xl">{title}</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-full bg-white px-3 py-2 text-xs text-muted-foreground">
          {displayDate(today())}
        </span>
        {children}
      </div>
    </div>
  );
}
