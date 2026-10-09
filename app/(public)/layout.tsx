import { PublicNav } from "@/components/layout/public-nav";
import { BottomNav } from "@/components/layout/bottom-nav";
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-content">
      <a href="#page-content" className="skip-link">
        Skip to content
      </a>
      <PublicNav />
      <div id="page-content">{children}</div>
      <BottomNav />
    </div>
  );
}
