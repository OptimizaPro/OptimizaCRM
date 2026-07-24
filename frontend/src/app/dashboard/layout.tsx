import type { Metadata } from "next";
import { Toaster } from "sonner";
import { AuthGuard } from "@/components/auth-guard";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { BodyScrollLock } from "@/components/layout/body-scroll-lock";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <BodyScrollLock />
      <div className="flex h-screen overflow-hidden bg-slate-700">
        <DashboardSidebar />
        <div className="flex flex-1 min-h-0 min-w-0 flex-col overflow-hidden">{children}</div>
      </div>
      <Toaster
        position="bottom-right"
        theme="dark"
        toastOptions={{
          classNames: {
            toast: "!bg-slate-800 !border-slate-700 !text-slate-100",
            description: "!text-slate-400",
            actionButton: "!bg-orange-600 !text-white hover:!bg-orange-500",
            cancelButton: "!bg-slate-700 !text-slate-300 hover:!bg-slate-600",
          },
        }}
      />
    </AuthGuard>
  );
}
