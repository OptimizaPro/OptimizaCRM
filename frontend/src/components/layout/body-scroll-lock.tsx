"use client";

import { useEffect } from "react";

/** Prevents body scroll while the dashboard layout is mounted. */
export function BodyScrollLock() {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return null;
}
