"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Brand } from "./brand";
export function PublicNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const context = new URLSearchParams();
  for (const key of ["room", "date"]) {
    const value = searchParams.get(key);
    if (value) context.set(key, value);
  }
  const back = pathname === "/book" || pathname === "/booking-success" ? "/schedule" : "/";
  return (
    <header className="app-bar sticky top-0 z-30">
      <nav
        aria-label="Page navigation"
        className="mx-auto grid min-h-18 max-w-[1200px] grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-2 px-4 sm:min-h-20 sm:px-8"
      >
        {pathname !== "/" ? (
          <Link
            href={context.size ? `${back}?${context}` : back}
            aria-label={back === "/schedule" ? "Back to calendar" : "Back to Explore"}
            className="flex h-11 w-11 items-center justify-center rounded-full text-primary hover:bg-red-50"
          >
            <ChevronLeft size={24} />
          </Link>
        ) : (
          <span />
        )}
        <Brand />
        <span aria-hidden="true" />
      </nav>
    </header>
  );
}
