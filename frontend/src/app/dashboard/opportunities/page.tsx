"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function OpportunitiesRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/dashboard/pipeline"); }, [router]);
  return null;
}
