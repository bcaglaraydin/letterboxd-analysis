import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getScoreColor } from '@/lib/scoreUtils';

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
  size?: 'sm' | 'md' | 'lg';
  /** Position of the panel */
  position?: 'static' | 'top-right';
  /** Whether to show maxScore next to current score (e.g., '45/120', default: false) */
  showMaxScore?: boolean;
  /** Maximum possible point (positive value) in a single action (for color scaling) */
  maxPositivePoint?: number;
  /** Maximum possible penalty (negative value) in a single action (for color scaling) */
  maxNegativePoint?: number;
  /** Optional class name to override default color logic for flying points */
  flyingPointsClassName?: string;
}

/**
 * ScorePanel - A unified component for score display with flying point animation.
 *
 * This component combines:
 * 1. Flying score animation that flies towards the counter
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
  label = 'Score',
  animationDelay,
  countSpeed = 50,
  flyDuration = 0.6,
  className,
  size = 'lg',
  position = 'static',
  showMaxScore = false,
  maxPositivePoint = 50,
  maxNegativePoint = -50,
  flyingPointsClassName,
}) => {
  // Calculate effective delay: if provided, use it. Otherwise, sync with flyDuration minus a small overlap for impact.
  const effectiveAnimationDelay = animationDelay ?? flyDuration * 1000 - 150;

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

  // Calculate dynamic color based on performance (supports negative scores)
  const scoreColorStyle = getScoreColor(displayScore, maxScore, maxNegativePoint);

  // Trigger flying animation when pointsEarned changes (supports negative values)
  useEffect(() => {
    if (pointsEarned !== null && pointsEarned !== 0 && flyFromPosition && counterRef.current) {
      // Measure destination dynamically
      const destRect = counterRef.current.getBoundingClientRect();
      const targetX = destRect.left + destRect.width / 2;
      const targetY = destRect.top + destRect.height / 2;

      // Clamp start position to viewport with padding to prevent overflow
      const PADDING = 75; // Increased buffer for large text width
      const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1000;
      const startX = Math.max(PADDING, Math.min(viewportWidth - PADDING, flyFromPosition.x));

      setFlyingPoints({
        value: pointsEarned,
        key: Date.now(), // Unique key ensures animation triggers even for same value
        startX,
        startY: flyFromPosition.y,
        targetX,
        targetY,
      });
    }
    prevPointsRef.current = pointsEarned;
  }, [pointsEarned, flyFromPosition]);

  // Animate score counting (bi-directional: up or down)
  useEffect(() => {
    if (displayScore === score) return;

    const direction = score > displayScore ? 1 : -1;

    // Delay start to match flying animation arrival
    const startTimeout = setTimeout(() => {
      const timer = setInterval(() => {
        setDisplayScore((prev) => {
          const next = prev + direction;
          if ((direction > 0 && next >= score) || (direction < 0 && next <= score)) {
            clearInterval(timer);
            return score;
          }
          return next;
        });
      }, countSpeed);

      return () => clearInterval(timer);
    }, effectiveAnimationDelay);

    return () => clearTimeout(startTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score]);

  // When score resets (e.g., new game), snap to new value immediately
  useEffect(() => {
    // Detect large sudden drops (reset scenario, not gradual decrease)
    const diff = Math.abs(score - prevScoreRef.current);
    if (score === 0 && diff > 10) {
      setDisplayScore(score);
    }
    prevScoreRef.current = score;
  }, [score]);

  const sizeClasses = {
    sm: {
      label: 'text-[10px]',
      score: 'text-2xl md:text-4xl',
      flying: 'text-xl md:text-4xl',
    },
    md: {
      label: 'text-[10px] md:text-xs',
      score: 'text-3xl md:text-6xl',
      flying: 'text-2xl md:text-5xl',
    },
    lg: {
      label: 'text-[10px] md:text-xs',
      score: 'text-4xl md:text-7xl',
      flying: 'text-3xl md:text-6xl',
    },
  };

  const positionClasses =
    position === 'top-right' ? 'fixed top-4 right-4 md:top-6 md:right-6 z-[55]' : '';

  // Get score color style for flying animation (supports negative values)
  const getFlyingPointsColor = (points: number): React.CSSProperties => {
    return getScoreColor(points, maxPositivePoint, maxNegativePoint);
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
              ease: 'easeInOut',
            }}
            className={`fixed z-[9999] font-bold drop-shadow-lg pointer-events-none ${sizeClasses[size].flying} flex items-center justify-center ${flyingPointsClassName || ''}`}
            style={{
              transform: 'translate(-50%, -50%)', // Centering adjustment
              position: 'fixed',
              ...(flyingPointsClassName ? {} : getFlyingPointsColor(flyingPoints.value)),
            }}
          >
            {flyingPoints.value > 0 ? '+' : ''}
            {flyingPoints.value}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Score Counter */}
      <div className={`flex flex-col items-end gap-0 ${positionClasses} ${className || ''}`}>
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
            <span className="text-muted-foreground font-normal text-[0.5em]">/{maxScore}</span>
          )}
        </motion.span>
      </div>
    </>
  );
};

export default ScorePanel;
