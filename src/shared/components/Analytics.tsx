"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

export function Analytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const id = process.env.NEXT_PUBLIC_GA_ID;
    if (
      !id ||
      typeof window === "undefined" ||
      typeof window.gtag !== "function"
    )
      return;

    const pagePath = `${pathname}${
      searchParams?.toString() ? `?${searchParams.toString()}` : ""
    }`;
    window.gtag("config", id, {
      page_path: pagePath,
    });
  }, [pathname, searchParams]);

  return null;
}
