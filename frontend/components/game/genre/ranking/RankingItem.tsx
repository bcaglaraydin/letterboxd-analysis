import React, { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { genreToColor, type Genre } from '@/store/genre/rankingStore';
import { useRankingScore } from '@/hooks/useDistanceScore';
import { getScoreColor } from '@/lib/scoreUtils';

interface RankingItemProps {
  genre: Genre;
  index: number;
  variant?: 'static' | 'ghost' | 'actual-slot' | 'actual-filled' | 'draggable';
  hasLanded?: boolean;
  isRevealed?: boolean;
  isCorrect?: boolean;
  score?: number;
  layoutId?: string;
  className?: string;
  style?: React.CSSProperties;
  hasJustLanded?: boolean;
  /** Callback with position when score badge is ready for flying animation */
  onScorePosition?: (position: { x: number; y: number }, score: number) => void;
  /** Max possible game score (defaults to 120 if not provided) */
  maxScore?: number;
  /** Total number of items in the ranking (defaults to 8 if not provided) */
  itemCount?: number;
  /** Whether the score badge should be visible (defaults to true). If false, it's rendered but hidden (opacity 0). */
  showScoreBadge?: boolean;
  /** Whether to show the drag handle (for draggable variant) */
  showDragHandle?: boolean;
  /** Whether this item is currently being dragged */
  isDragging?: boolean;
}

export const RankingItem = ({
  genre,
  index,
  variant = 'static',
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
  showScoreBadge = true,
  showDragHandle = true,
  isDragging = false,
}: RankingItemProps) => {
  const scoreBadgeRef = useRef<HTMLDivElement>(null);
  const hasReportedRef = useRef(false);
  const color = genreToColor(genre.name);
  const { pointsPerItem } = useRankingScore({
    maxScore,
    itemCount,
  });

  // Reset reporting flag when hasJustLanded becomes false
  useEffect(() => {
    if (!hasJustLanded) {
      hasReportedRef.current = false;
    }
  }, [hasJustLanded]);

  // Report position when hasJustLanded triggers
  useEffect(() => {
    if (hasJustLanded && scoreBadgeRef.current && onScorePosition && !hasReportedRef.current) {
      hasReportedRef.current = true;
      const rect = scoreBadgeRef.current.getBoundingClientRect();
      // Calculate center of the badge in viewport coordinates
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      onScorePosition({ x, y }, score ?? 0);
    }
  }, [hasJustLanded, onScorePosition, score]);

  // Common base styles - mobile uses flex intrinsic heights to fill parent container, desktop uses fixed height
  // Reduced right padding to allow rating to sit closer to the edge
  const baseClasses =
    'flex items-center gap-2 md:gap-4 pl-1.5 py-1.5 pr-1 md:pl-4 md:py-4 md:pr-2 rounded-md md:rounded-xl border-2 transition-all min-h-[44px] md:min-h-[72px]';

  // Variant-specific styles
  const variantStyles = {
    static: cn(baseClasses, 'bg-card/50 border-border/50'),
    ghost: cn(baseClasses, 'bg-card border-border shadow-md z-10', hasLanded && 'invisible'),
    'actual-slot': cn(baseClasses, 'border-dashed border-muted-foreground/30'),
    'actual-filled': cn(baseClasses, 'bg-card shadow-sm z-20 absolute inset-0 w-full'),
    draggable: cn(
      baseClasses,
      'bg-card border-border cursor-grab active:cursor-grabbing',
      'shadow-sm hover:shadow-md md:shadow-md md:hover:shadow-lg transition-shadow',
      isDragging && 'shadow-lg md:shadow-xl',
    ),
  };

  // Determine border color based on variant/state
  const getBorderColor = () => {
    if (variant === 'static' || variant === 'draggable') return undefined;
    if (variant === 'actual-slot') return undefined;

    if (isRevealed) {
      return isCorrect ? '#22c55e' : undefined;
    }
    return 'hsl(var(--border))';
  };

  const getBackgroundColor = () => {
    if (isRevealed && variant === 'actual-filled') {
      return isCorrect ? 'rgba(34,197,94,0.1)' : undefined;
    }
    return undefined;
  };

  return (
    <motion.div
      layoutId={layoutId}
      className={cn(variantStyles[variant], className)}
      style={{
        borderColor: getBorderColor(),
        ...(variant !== 'actual-slot' && {
          borderLeftColor: color,
          borderLeftWidth: '3px',
          borderLeftStyle: 'solid',
        }),
        backgroundColor: getBackgroundColor(),
        ...style,
      }}
    >
      {/* Rank Badge - Hide for empty slots */}
      {variant !== 'actual-slot' && (
        <motion.div
          layout="position"
          className={cn(
            'w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm font-bold shrink-0 text-white',
          )}
          style={{ backgroundColor: color }}
        >
          {index + 1}
        </motion.div>
      )}

      {/* Genre Name - Hide for empty slots, dynamic font size for long names */}
      {variant !== 'actual-slot' && (
        <motion.span
          layout="position"
          className={cn(
            'font-serif font-semibold text-foreground flex-1 min-w-0 leading-none whitespace-nowrap overflow-hidden',
            variant === 'actual-filled'
              ? // Aggressive dynamic sizing for Actual Order (has rating/score)
                genre.name.length > 18
                ? 'text-[9px] md:text-xs tracking-tighter'
                : genre.name.length > 14
                  ? 'text-[10px] md:text-sm tracking-tight'
                  : genre.name.length > 10
                    ? 'text-xs md:text-base'
                    : 'text-sm md:text-lg'
              : // Standard sizing for Your Ranking (more space)
                genre.name.length > 15
                ? 'text-xs md:text-base'
                : 'text-sm md:text-lg',
          )}
        >
          {genre.name}
        </motion.span>
      )}

      {/* Right Content Group: Rating & Score & Drag Handle */}
      <div className="flex shrink-0 items-center justify-end gap-1.5 md:gap-3 ml-1.5 md:ml-3">
        {/* Drag Handle - only for draggable variant */}
        {variant === 'draggable' && showDragHandle && (
          <div className="flex flex-col gap-0.5 opacity-40">
            <div className="w-3 md:w-4 h-0.5 bg-muted-foreground rounded" />
            <div className="w-3 md:w-4 h-0.5 bg-muted-foreground rounded" />
            <div className="w-3 md:w-4 h-0.5 bg-muted-foreground rounded" />
          </div>
        )}

        {/* Average Rating Display (Only for actual-filled or revealed items) */}
        {(variant === 'actual-filled' || (isRevealed && variant === 'static')) &&
          genre.averageRating !== undefined && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs md:text-sm font-semibold text-muted-foreground whitespace-nowrap text-right"
            >
              ★ {genre.averageRating.toFixed(1)}
            </motion.div>
          )}

        {/* In-Card Score Badge (Replaces Check/X) */}
        <AnimatePresence>
          {isRevealed && variant === 'actual-filled' && score !== undefined && (
            <motion.div
              ref={scoreBadgeRef}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{
                opacity: showScoreBadge ? 1 : 0,
                scale: showScoreBadge ? 1 : 0.5,
              }}
              transition={{ type: 'spring', stiffness: 500, damping: 14 }}
              className={cn('font-bold text-xs md:text-base text-right min-w-[2ch]')}
              style={
                score !== undefined
                  ? getScoreColor(score, pointsPerItem, 0)
                  : { color: 'var(--foreground)' }
              }
            >
              +{score}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
