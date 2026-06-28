"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, tokens } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated || !tokens) {
      router.replace("/login");
    }
  }, [isAuthenticated, tokens, router]);

  if (!isAuthenticated || !tokens) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
