'use client';

import { track } from "@/share/utils/mixpanel";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    track("Main App View", {
      path: pathname,
      timestamp: new Date().toISOString()
    });
  }, [pathname]);

  return null;
} 