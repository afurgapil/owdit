"use client";

import { useEffect, useMemo, useState } from "react";

export function LoadingOverlay() {
  const phrases = useMemo(
    () => [
      "ANALYZE BYTECODE",
      "DETECT SELECTORS",
      "RISK MODEL",
      "FETCH SOURCE",
      "SIMULATE OPS",
      "AGGREGATE",
      "SCORE AI",
      "VERIFY",
      "HEURISTICS",
      "REPORT",
    ],
    []
  );

  const glyphs = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<>_-+=[]{}()#%^*";
  const makeRandom = (len: number) =>
    Array.from(
      { length: len },
      () => glyphs[Math.floor(Math.random() * glyphs.length)]
    ).join("");
  const initTiles = () =>
    Array.from({ length: 14 }, (_, i) =>
      i % 3 === 0 ? phrases[i % phrases.length] : makeRandom(8)
    );

  const [tiles, setTiles] = useState<string[]>(initTiles());

  // Minimal state: only tiles

  useEffect(() => {
    // Light scramble: mutate a single random tile occasionally to reduce reflow
    const interval = setInterval(() => {
      setTiles((prev) => {
        const next = [...prev];
        const idx = Math.floor(Math.random() * next.length);
        const src = next[idx];
        if (Math.random() < 0.22) {
          next[idx] = phrases[Math.floor(Math.random() * phrases.length)];
        } else {
          const chars = src.split("");
          const pos = Math.floor(Math.random() * Math.max(4, chars.length));
          if (chars[pos])
            chars[pos] = glyphs[Math.floor(Math.random() * glyphs.length)];
          next[idx] = chars.join("");
        }
        return next;
      });
    }, 420);
    return () => clearInterval(interval);
  }, [phrases, glyphs]);

  // No stage/tip cycling

  return (
    <div
      className="loader-overlay"
      role="status"
      aria-live="polite"
      aria-label="Processing"
    >
      <div className="loader-card">
        <div className="loader-body">
          <div>
            <div className="loader-conveyor" aria-hidden>
              <div className="loader-belt" role="presentation">
                {[...tiles, ...tiles].map((t, i) => (
                  <div key={i} className={`loader-tile`}>
                    <code className="loader-tile-text">{t}</code>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoadingOverlay;
