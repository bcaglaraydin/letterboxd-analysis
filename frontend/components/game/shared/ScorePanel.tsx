import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ScorePanelProps {
  /** Current total score to display */
  score: number;
  /** Points just earned (triggers flying animation when changed) */
  pointsEarned?: number | null;
  /** Starting position for flying animation ({x, y} in viewport pixels) */
  flyFromPosition?: { x: number; y: number };
  /** Maximum possible score for color calculation (default: 100) */
  maxScore?: number;
  /** Label text above the score (default: "Score") */
  label?: string;
  /** Delay before starting the count animation (ms, default: 600) */
  animationDelay?: number;
  /** Speed of counting animation (ms per point, default: 50) */
  countSpeed?: number;
  /** Duration of flying animation in seconds (default: 0.6) */
  flyDuration?: number;
  /** Custom className for container */
  className?: string;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Position of the panel */
  position?: "static" | "top-right";
  /** Maximum points possible per action (for flying point color, default: 15) */
  pointsPerAction?: number;
  /** Whether to show maxScore next to current score (e.g., '45/120', default: false) */
  showMaxScore?: boolean;
}

/**
 * ScorePanel - A unified component for score display with flying point animation.
 *
 * This component combines:
 * 1. Flying score animation that flies towards the counter (using Portal for z-index safety)
 * 2. Animated score counter that ticks up as points arrive
 *
 * Usage:
 * - Set `score` to the current total score
 * - When points are earned, set `pointsEarned` to trigger the flying animation
 * - Provide `flyFromPosition` directly as {x, y} viewport coordinates
 */
export const ScorePanel: React.FC<ScorePanelProps> = ({
  score,
  pointsEarned = null,
  flyFromPosition,
  maxScore = 100,
  label = "Score",
  animationDelay = 600,
  countSpeed = 50,
  flyDuration = 0.6,
  className,
  size = "lg",
  position = "static",
  pointsPerAction = 15,
  showMaxScore = false,
}) => {
  // Display score (animated counting)
  const [displayScore, setDisplayScore] = useState(score);
  // Flying animation state
  const [flyingPoints, setFlyingPoints] = useState<{
    value: number;
    key: number;
    startX: number;
    startY: number;
    targetX: number;
    targetY: number;
  } | null>(null);

  // Ref for the score counter element
  const counterRef = useRef<HTMLDivElement>(null);
  // Previous score for detecting resets
  const prevScoreRef = useRef(score);
  // Previous points for detecting new earnings
  const prevPointsRef = useRef(pointsEarned);

  // Calculate dynamic color based on performance
  const ratio = maxScore > 0 ? displayScore / maxScore : 0;
  const hue = Math.min(120, Math.max(0, ratio * 120)); // 0 (Red) -> 120 (Green)
  const scoreColorStyle = { color: `hsl(${hue}, 70%, 35%)` };

  // Trigger flying animation when pointsEarned changes
  useEffect(() => {
    if (
      pointsEarned !== null &&
      pointsEarned > 0 &&
      pointsEarned !== prevPointsRef.current &&
      flyFromPosition &&
      counterRef.current
    ) {
      // Measure destination dynamically
      const destRect = counterRef.current.getBoundingClientRect();
      const targetX = destRect.left + destRect.width / 2;
      const targetY = destRect.top + destRect.height / 2;

      setFlyingPoints({
        value: pointsEarned,
        key: Date.now(),
        startX: flyFromPosition.x,
        startY: flyFromPosition.y,
        targetX,
        targetY,
      });
    }
    prevPointsRef.current = pointsEarned;
  }, [pointsEarned, flyFromPosition]);

  // Animate score counting up
  useEffect(() => {
    if (displayScore >= score) return;

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
      }, countSpeed);

      return () => clearInterval(timer);
    }, animationDelay);

    return () => clearTimeout(startTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score]);

  // When score decreases (game reset), snap to new value
  useEffect(() => {
    if (score < prevScoreRef.current) {
      setDisplayScore(score);
    }
    prevScoreRef.current = score;
  }, [score]);

  const sizeClasses = {
    sm: {
      label: "text-[8px]",
      score: "text-3xl",
      flying: "text-3xl md:text-4xl",
    },
    md: {
      label: "text-[10px]",
      score: "text-4xl md:text-5xl",
      flying: "text-4xl md:text-5xl",
    },
    lg: {
      label: "text-[10px]",
      score: "text-4xl md:text-6xl",
      flying: "text-4xl md:text-5xl",
    },
  };

  const positionClasses =
    position === "top-right"
      ? "fixed top-4 right-4 md:top-6 md:right-6 z-[55]"
      : "";

  // Get score color style for flying animation (matches RankingItem color formula)
  const getFlyingPointsColor = (points: number): React.CSSProperties => {
    const ratio = pointsPerAction > 0 ? points / pointsPerAction : 0;
    const hue = Math.round(Math.min(1, Math.max(0, ratio)) * 120); // 0 = red, 120 = green
    return { color: `hsl(${hue}, 70%, 35%)` };
  };

  return (
    <>
      {/* Flying Score Animation - Direct Render (No Portal) */}
      {flyingPoints && (
        <AnimatePresence>
          <motion.div
            key={flyingPoints.key}
            initial={{
              opacity: 1,
              scale: 1.2,
              top: flyingPoints.startY,
              left: flyingPoints.startX,
            }}
            animate={{
              opacity: [1, 1, 0],
              scale: [1.2, 1, 0.6],
              top: flyingPoints.targetY,
              left: flyingPoints.targetX,
            }}
            transition={{
              duration: flyDuration,
              ease: "easeInOut",
            }}
            className={`fixed z-[9999] font-bold drop-shadow-lg pointer-events-none ${sizeClasses[size].flying} flex items-center justify-center`}
            style={{
              transform: "translate(-50%, -50%)", // Centering adjustment
              position: "fixed",
              ...getFlyingPointsColor(flyingPoints.value),
            }}
          >
            +{flyingPoints.value}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Score Counter */}
      <div
        className={`flex flex-col items-end gap-0 ${positionClasses} ${className || ""}`}
      >
        <span
          className={`uppercase tracking-[0.2em] font-bold text-muted-foreground ${sizeClasses[size].label}`}
        >
          {label}
        </span>
        <motion.span
          ref={counterRef}
          className={`font-serif italic transition-colors duration-300 ${sizeClasses[size].score}`}
          style={scoreColorStyle}
          key={displayScore}
          animate={{ scale: [1.1, 1] }}
          transition={{ duration: 0.15 }}
        >
          {displayScore}
          {showMaxScore && (
            <span className="text-muted-foreground/50 font-normal text-[0.5em]">
              /{maxScore}
            </span>
          )}
        </motion.span>
      </div>
    </>
  );
};

export default ScorePanel;
