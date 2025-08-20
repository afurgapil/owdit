import { Suspense } from "react";
import { HistoryContent } from "./HistoryContent";

export default function HistoryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-white text-xl">Loading...</div>
        </div>
      }
    >
      <HistoryContent />
    </Suspense>
  );
}
