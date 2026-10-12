import { requireAdmin } from "@/lib/supabase/auth";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AutoRefresh } from "@/components/layout/auto-refresh";
import { recentBookingNotifications } from "@/lib/admin/notifications";
import { isLocal } from "@/lib/supabase/config";
export default async function Workspace({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const notifications = await recentBookingNotifications().catch(() => []);
  return (
    <div className="app-content">
      <a href="#page-content" className="skip-link">
        Skip to content
      </a>
      <AdminSidebar
        name={admin.name}
        demo={admin.demo}
        accountId={admin.id}
        notifications={notifications}
        realtime={!isLocal()}
      />
      <main id="page-content" className="mx-auto max-w-[1200px] px-5 pt-5 sm:px-8 sm:pt-8">
        <AutoRefresh />
        {children}
      </main>
    </div>
  );
}
