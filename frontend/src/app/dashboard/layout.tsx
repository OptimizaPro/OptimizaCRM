import type { Metadata } from "next";
import { AuthGuard } from "@/components/auth-guard";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden bg-slate-700">
        <DashboardSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">{children}</div>
      </div>
    </AuthGuard>
  );
}
