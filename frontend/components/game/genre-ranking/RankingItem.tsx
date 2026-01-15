import React, { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { genreToColor } from "@/store/genreGameStore";
import { useRankingScore } from "@/hooks/useDistanceScore";

interface RankingItemProps {
  genre: { id: string; name: string };
  index: number;
  variant?: "static" | "ghost" | "actual-slot" | "actual-filled";
  hasLanded?: boolean;
  isRevealed?: boolean;
  isCorrect?: boolean;
  score?: number;
  layoutId?: string;
  className?: string;
  style?: React.CSSProperties;
  hasJustLanded?: boolean;
  /** Callback with position when score badge is ready for flying animation */
  onScorePosition?: (
    position: { top: string; right: string },
    score: number,
  ) => void;
  /** Max possible game score (defaults to 120 if not provided) */
  maxScore?: number;
  /** Total number of items in the ranking (defaults to 8 if not provided) */
  itemCount?: number;
}

export const RankingItem = ({
  genre,
  index,
  variant = "static",
  hasLanded = false,
  isRevealed = false,
  isCorrect = false,
  score,
  layoutId,
  className,
  style,
  hasJustLanded = false,
  onScorePosition,
  maxScore = 120,
  itemCount = 8,
}: RankingItemProps) => {
  const scoreBadgeRef = useRef<HTMLDivElement>(null);
  const hasReportedRef = useRef(false);
  const color = genreToColor(genre.name);
  const { pointsPerItem } = useRankingScore({
    maxScore,
    itemCount,
  }); // Used for badge color calculation

  // Reset reporting flag when hasJustLanded becomes false
  useEffect(() => {
    if (!hasJustLanded) {
      hasReportedRef.current = false;
    }
  }, [hasJustLanded]);

  // Report position when hasJustLanded triggers
  useEffect(() => {
    if (
      hasJustLanded &&
      scoreBadgeRef.current &&
      onScorePosition &&
      !hasReportedRef.current
    ) {
      hasReportedRef.current = true;
      const rect = scoreBadgeRef.current.getBoundingClientRect();
      const top = `${((rect.top + rect.height / 2) / window.innerHeight) * 100}%`;
      const right = `${((window.innerWidth - rect.right + rect.width / 2) / window.innerWidth) * 100}%`;
      onScorePosition({ top, right }, score ?? 0);
    }
  }, [hasJustLanded, onScorePosition, score]);

  // Common base styles - mobile uses h-full to fill parent container, desktop uses fixed height
  const baseClasses =
    "flex items-center gap-2 md:gap-4 p-1.5 md:p-4 rounded-md md:rounded-xl border-2 transition-all h-full md:h-[72px]";

  // Variant-specific styles
  const variantStyles = {
    static: cn(baseClasses, "bg-card/50 border-border/50"), // Removed opacity-50
    ghost: cn(
      baseClasses,
      "bg-card border-border shadow-md z-10",
      hasLanded && "invisible",
    ),
    "actual-slot": cn(baseClasses, "border-dashed border-muted-foreground/30"),
    "actual-filled": cn(
      baseClasses,
      "bg-card shadow-sm z-20 absolute inset-0 w-full",
    ),
  };

  // Determine border color based on variant/state
  const getBorderColor = () => {
    if (variant === "static") return undefined;
    if (variant === "actual-slot") return undefined; // Handled by class

    // For ghost/filled, score state overrides default
    if (isRevealed) {
      return isCorrect ? "#22c55e" : undefined; // Remove red for incorrect
    }
    return "hsl(var(--border))";
  };

  const getBackgroundColor = () => {
    if (isRevealed && variant === "actual-filled") {
      return isCorrect ? "rgba(34,197,94,0.1)" : undefined; // Remove red background
    }
    return undefined;
  };

  return (
    <motion.div
      layoutId={layoutId}
      className={cn(variantStyles[variant], className)}
      style={{
        borderColor: getBorderColor(),
        ...(variant !== "actual-slot" && {
          borderLeftColor: color,
          borderLeftWidth: "3px",
          borderLeftStyle: "solid",
        }),
        backgroundColor: getBackgroundColor(),
        ...style,
      }}
    >
      {/* Rank Badge - Hide for empty slots */}
      {variant !== "actual-slot" && (
        <motion.div
          layout="position"
          className={cn(
            "w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm font-bold shrink-0 text-white",
          )}
          style={{ backgroundColor: color }}
        >
          {index + 1}
        </motion.div>
      )}

      {/* Genre Name - Hide for empty slots, dynamic font size for long names */}
      {variant !== "actual-slot" && (
        <motion.span
          layout="position"
          className={cn(
            "font-serif font-semibold text-foreground flex-1 min-w-0 leading-tight",
            genre.name.length > 10 ? "text-xs md:text-lg" : "text-sm md:text-lg",
          )}
        >
          {genre.name}
        </motion.span>
      )}

      {/* In-Card Score Badge (Replaces Check/X) */}
      <AnimatePresence>
        {isRevealed && variant === "actual-filled" && score !== undefined && (
          <motion.div
            ref={scoreBadgeRef}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn("font-bold text-xs md:text-base ml-auto shrink-0 w-8 md:w-10 text-right")}
            style={{
              // Color based on per-item score ratio: 0 = red (hue 0), max = green (hue 120)
              color: `hsl(${Math.round((score / pointsPerItem) * 120)}, 70%, 35%)`,
            }}
          >
            +{score}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
