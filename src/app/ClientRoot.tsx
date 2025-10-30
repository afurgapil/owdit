"use client";

import { ReactNode, Suspense } from "react";
import { Analytics } from "../shared/components/Analytics";

export default function ClientRoot({ children }: { children: ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <Analytics />
      </Suspense>
      {children}
    </>
  );
}
