'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useRatingGameStore } from '@/store/rating/ratingStore';
import { getScoreFeedback } from './constants';
import { Button } from '@/components/ui/button';
import { StarRating } from './StarRating';

interface FeedbackOverlayProps {
  userRating: number;
  actualRating: number;
  onContinue: () => void;
  onScorePosition?: (position: { x: number; y: number }) => void;
}

export const FeedbackOverlay: React.FC<FeedbackOverlayProps> = ({
  userRating,
  actualRating,
  onContinue,
  onScorePosition,
}) => {
  const { theme, roundScore } = useRatingGameStore();

  const feedback = getScoreFeedback(roundScore);
  const message = feedback.message;
  const scoreColor = feedback.color;

  const scoreRef = React.useRef<HTMLDivElement>(null);

  React.useLayoutEffect(() => {
    if (scoreRef.current && onScorePosition) {
      const rect = scoreRef.current.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      onScorePosition({ x, y });
    }
  }, [onScorePosition]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
    >
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Flying animation now handled by ScorePanel in parent */}

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center space-y-4 p-8 bg-card border border-border rounded-3xl shadow-2xl max-w-sm w-full mx-4"
        >
          <div
            className={cn(
              'inline-flex items-center justify-center w-32 h-32 rounded-full mb-6 shadow-xl ring-8 ring-opacity-20 transition-all duration-500',
              theme.orb1Color,
              scoreColor.replace('text-', 'ring-').replace('400', '400/30'), // Use matching colored ring
              'bg-opacity-10 bg-white dark:bg-black/10' // Subtle background
            )}
          >
             <div ref={scoreRef} className={cn('text-5xl lg:text-6xl font-black tracking-tighter drop-shadow-sm', scoreColor)}>
              +{roundScore}
            </div>
          </div>

          <div className="space-y-2 mb-8">
            <h3 className="text-3xl lg:text-4xl font-serif text-foreground font-medium tracking-wide">{message}</h3>
          </div>

          <div className="py-6 space-y-6 w-full px-4 bg-secondary/30 rounded-2xl border border-border/50">
            <div className="flex flex-col items-center gap-2">
              <span className="text-muted-foreground text-sm lg:text-base uppercase tracking-[0.2em] font-bold">
                Your Guess
              </span>
              <div className="flex items-center gap-3">
                <StarRating value={userRating} readOnly starSize="w-6 h-6 lg:w-8 lg:h-8" />
                <span className="text-lg font-bold text-foreground">{userRating}</span>
              </div>
            </div>

            <div className="w-full h-px bg-border/50" />

            <div className="flex flex-col items-center gap-2">
              <span className="text-muted-foreground text-sm lg:text-base uppercase tracking-[0.2em] font-bold">
                Actual Rating
              </span>
              <div className="flex items-center gap-3">
                <StarRating value={actualRating} readOnly starSize="w-6 h-6 lg:w-8 lg:h-8" />
                 <span className="text-lg font-bold text-foreground">{actualRating}</span>
              </div>
            </div>
            
            <div className="text-xs text-center text-muted-foreground/60 italic">
               Difference: {Math.abs(userRating - actualRating).toFixed(1)}
            </div>
          </div>

          <Button
            onClick={onContinue}
            className="w-full py-3 h-auto rounded-xl font-medium shadow-md hover:scale-105 transition-transform"
          >
            Continue
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
};
