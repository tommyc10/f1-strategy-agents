import { useState, useEffect, useRef } from "react";

/**
 * Smoothly reveals text character-by-character even if the source
 * updates in large chunks. Returns the portion of `text` revealed so far.
 */
export function useTypewriter(text: string, charsPerFrame = 3): string {
  const [revealed, setRevealed] = useState("");
  const indexRef = useRef(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!text) {
      setRevealed("");
      indexRef.current = 0;
      return;
    }

    const tick = () => {
      indexRef.current = Math.min(indexRef.current + charsPerFrame, text.length);
      setRevealed(text.slice(0, indexRef.current));

      if (indexRef.current < text.length) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    // If text grew, start revealing from where we left off
    if (indexRef.current < text.length) {
      rafRef.current = requestAnimationFrame(tick);
    }

    return () => cancelAnimationFrame(rafRef.current);
  }, [text, charsPerFrame]);

  return revealed;
}
