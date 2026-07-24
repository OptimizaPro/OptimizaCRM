"use client";

import { useState, useEffect } from "react";
import { useSidebarStore } from "@/store/auth";

const DESKTOP_WIDTH = 1280;

export function DashboardMainArea({ children }: { children: React.ReactNode }) {
  const { isCollapsed, isOpen } = useSidebarStore();
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const update = () => setIsDesktop(window.innerWidth >= DESKTOP_WIDTH);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const sidebarWidth = isDesktop && isOpen ? (isCollapsed ? 64 : 256) : 0;

  return (
    <div
      className="flex flex-1 min-h-0 min-w-0 flex-col overflow-hidden transition-[margin-left] duration-300"
      style={{ marginLeft: sidebarWidth }}
    >
      {children}
    </div>
  );
}
