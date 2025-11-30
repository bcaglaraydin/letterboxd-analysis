"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useGameStore } from "@/store/gameStore";

export const ScoreDisplay = () => {
  const { score, roundScore, theme, history, currentRound, totalRounds } =
    useGameStore();
  const [displayScore, setDisplayScore] = useState(0);

  // Calculate dynamic color based on performance (Use history to be stable across rounds)
  // If history is empty (start of game), maxPossible is 0.
  const maxPossible = history.length * 20;
  const ratio = maxPossible > 0 ? displayScore / maxPossible : 0;
  const hue = Math.min(120, Math.max(0, ratio * 120)); // 0 (Red) -> 120 (Green)
  // Darker HSL for visibility on light background
  const scoreColorStyle = { color: `hsl(${hue}, 70%, 35%)` };

  // Animate score counting up (Slower, satisfying tick)
  useEffect(() => {
    if (displayScore === score) return;

    // Delay start to match flying animation arrival
    const startTimeout = setTimeout(() => {
      const timer = setInterval(() => {
        setDisplayScore((prev) => {
          if (prev < score) {
            return prev + 1;
          }
          clearInterval(timer);
          return prev;
        });
      }, 50); // 50ms per point

      return () => clearInterval(timer);
    }, 1000); // Wait 1s for flying animation

    return () => clearTimeout(startTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score]);

  return (
    <div className="absolute top-0 left-0 w-full p-4 md:p-8 flex justify-between items-start z-20 pointer-events-none text-foreground">
      {/* Round Indicator (Top Left) */}
      {/* Round Indicator (Top Left) */}
      <div className="flex flex-col items-start gap-0">
        <div className="flex items-baseline gap-1 font-light">
          <span className="text-2xl font-serif">
            {currentRound}
          </span>
          <span className="text-sm text-muted-foreground">/ {totalRounds}</span>
        </div>
      </div>

      {/* Score Counter (Top Right) */}
      <div className="relative flex flex-col items-end gap-0">
        <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-muted-foreground mb-[-4px]">
          Total Score
        </span>
        <span
          className="text-5xl font-serif italic transition-colors duration-300"
          style={scoreColorStyle}
        >
          {displayScore}
        </span>
      </div>
    </div>
  );
};
