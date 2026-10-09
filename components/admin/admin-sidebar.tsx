"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, ArrowUpRight, UserRound, ChevronLeft } from "lucide-react";
import { Brand } from "@/components/layout/brand";
import { BottomNav } from "@/components/layout/bottom-nav";
import { logout } from "@/app/actions/auth";
export function AdminSidebar({ name, demo }: { name: string; demo: boolean }) {
  const pathname = usePathname();
  return (
    <>
      <header className="app-bar sticky top-0 z-30">
        <div className="mx-auto grid min-h-18 max-w-[1200px] grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-2 px-4 sm:min-h-20 sm:px-8">
          {pathname === "/admin" ? (
            <span />
          ) : (
            <Link
              href="/admin"
              aria-label="Back to overview"
              className="flex h-11 w-11 items-center justify-center rounded-full text-primary hover:bg-red-50"
            >
              <ChevronLeft size={24} />
            </Link>
          )}
          <Brand href="/admin" />
          <details className="relative">
            <summary
              aria-label="Open account menu"
              className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-full border border-white bg-[#e8edf5] text-xs font-semibold text-slate-600"
            >
              {name
                .split(" ")
                .map((part) => part[0])
                .slice(0, 2)
                .join("") || <UserRound size={19} />}
            </summary>
            <div className="account-menu">
              <p className="text-sm font-semibold">{name}</p>
              <p className="mb-3 mt-1 text-xs text-muted-foreground">
                {demo ? "Read-only demo" : "Administrator"}
              </p>
              <Link
                href="/schedule"
                className="flex min-h-11 items-center justify-between gap-3 rounded-xl px-3 text-sm hover:bg-muted"
              >
                Visit public calendar
                <ArrowUpRight size={16} />
              </Link>
              <form action={logout}>
                <button className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm text-primary hover:bg-red-50">
                  <LogOut size={16} />
                  Sign out
                </button>
              </form>
            </div>
          </details>
        </div>
      </header>
      <BottomNav admin />
    </>
  );
}
