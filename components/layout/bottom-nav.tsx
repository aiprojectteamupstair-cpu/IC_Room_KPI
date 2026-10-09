"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Sparkles,
  Plus,
  CalendarDays,
  House,
  ClipboardList,
  ChartNoAxesCombined,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const publicLinks = [
  { href: "/", label: "Explore", icon: Sparkles },
  { href: "/book", label: "Book a space", icon: Plus, featured: true },
  { href: "/schedule", label: "Calendar", icon: CalendarDays },
];
const adminLinks = [
  { href: "/admin", label: "Overview", icon: House },
  { href: "/admin/bookings", label: "Bookings", icon: ClipboardList },
  { href: "/admin/calendar", label: "Calendar", icon: CalendarDays, featured: true },
  { href: "/admin/kpi", label: "Insights", icon: ChartNoAxesCombined },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];
export function BottomNav({ admin = false }: { admin?: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const context = new URLSearchParams();
  for (const key of ["room", "date"]) {
    const value = searchParams.get(key);
    if (value) context.set(key, value);
  }
  const links = admin ? adminLinks : publicLinks;
  return (
    <nav
      aria-label={admin ? "Workspace navigation" : "Main navigation"}
      className="bottom-dock"
      style={{ gridTemplateColumns: `repeat(${links.length}, minmax(0, 1fr))` }}
    >
      {links.map(({ href, label, icon: Icon, ...item }) => (
        <Link
          key={href}
          href={!admin && context.size ? `${href}?${context}` : href}
          aria-current={
            pathname === href || (href === "/book" && pathname === "/booking-success")
              ? "page"
              : undefined
          }
          className={cn("dock-link", "featured" in item && item.featured && "dock-link-featured")}
        >
          <span className="dock-icon">
            <Icon size={22} strokeWidth={1.8} aria-hidden="true" />
          </span>
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
