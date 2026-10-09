import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { isDemo } from "@/lib/supabase/config";
import "./globals.css";
export const metadata: Metadata = {
  title: { default: "Innovation Centre | Room Booking", template: "%s | Innovation Centre" },
  description:
    "Book a space to meet, collaborate, learn and build. Innovation Centre room scheduling and management.",
};
export const dynamic = "force-dynamic";
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f6f7f9",
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {isDemo() && (
          <div className="bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-900">
            Development demo · Sample data · Read-only · Connect Supabase to enable bookings and
            admin actions
          </div>
        )}
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
