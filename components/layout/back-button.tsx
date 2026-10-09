import Link from "next/link";
import { ChevronLeft } from "lucide-react";
export function BackButton({ href, label = "Back" }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center gap-1 rounded-full pr-3 text-sm font-medium text-primary transition-colors hover:bg-[#fff0ed]"
      aria-label={label}
    >
      <ChevronLeft size={22} aria-hidden="true" />
      {label}
    </Link>
  );
}
