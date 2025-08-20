"use client";

import React, { useMemo, useState, useEffect } from "react";

interface MatrixRainProps {
  gridSize?: number;
  minDurationSec?: number;
  maxDurationSec?: number;
}

export function MatrixRain({
  gridSize = 24,
  minDurationSec = 15,
  maxDurationSec = 25,
}: MatrixRainProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const columns = useMemo(() => {
    if (!isClient) return [];

    // Create a grid-based layout
    const cols = [];
    const columnWidth = 100 / gridSize;

    for (let i = 0; i < gridSize; i++) {
      const seed = i * 98765; // Unique seed for each column

      // Calculate position based on grid
      const leftPercent = i * columnWidth + columnWidth * 0.1; // Slight offset for visual appeal

      // Create multiple data streams per column for continuous flow
      const streams = 2 + (seed % 3); // 2-4 streams per column

      for (let stream = 0; stream < streams; stream++) {
        const streamSeed = seed + stream * 54321;
        const duration =
          minDurationSec + (streamSeed % (maxDurationSec - minDurationSec));
        const delay = -(streamSeed % duration);
        const length = 20 + (streamSeed % 15); // 20-34 characters

        // Generate more varied content (0, 1, and some special characters)
        const content = Array.from({ length })
          .map((_, charIndex) => {
            const charSeed = streamSeed + charIndex;
            const charType = charSeed % 10;

            if (charType < 6) return "1";
            if (charType < 8) return "0";
            if (charType === 8) return "█";
            return "░";
          })
          .join("\n");

        cols.push({
          id: `${i}-${stream}`,
          leftPercent,
          duration,
          delay,
          content,
          columnIndex: i,
          streamIndex: stream,
        });
      }
    }

    return cols;
  }, [gridSize, minDurationSec, maxDurationSec, isClient]);

  if (!isClient) {
    return null;
  }

  return (
    <div className="matrix-container" aria-hidden>
      {columns.map((col) => (
        <pre
          key={col.id}
          className="matrix-column"
          style={{
            left: `${col.leftPercent}%`,
            animationDuration: `${col.duration}s`,
            animationDelay: `${col.delay}s`,
          }}
        >
          {col.content}
        </pre>
      ))}
    </div>
  );
}
