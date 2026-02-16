'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useRatingGameStore } from '@/store/rating/ratingStore';
import { getScoreFeedback, SCORE_FEEDBACK } from './constants';
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
  const { roundScore } = useRatingGameStore();

  const feedback = getScoreFeedback(roundScore);
  const message = feedback.message;
  const scoreColor = feedback.color;
  const isPerfect = roundScore !== null && roundScore >= SCORE_FEEDBACK.PERFECT.threshold;

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
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center space-y-4 p-8 bg-card border border-border rounded-3xl shadow-2xl max-w-sm w-full mx-4"
        >
          {/* Minimal Top Section (Variant 5) with Perfect Shimmer */}
          <div className="flex flex-col items-center gap-3 mb-8">
            <motion.div
              ref={scoreRef}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15 }}
              className={cn(
                'text-6xl lg:text-7xl font-black tracking-tighter relative',
                scoreColor,
              )}
            >
              {/* Perfect score shimmer/glow effect */}
              {isPerfect && (
                <>
                  {/* Outer glow pulse */}
                  <motion.div
                    className="absolute inset-0 -m-4 rounded-full bg-emerald-400/20 blur-xl"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{
                      scale: [1, 1.3, 1],
                      opacity: [0.4, 0.7, 0.4],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  />
                  {/* Inner glow */}
                  <motion.div
                    className="absolute inset-0 -m-2 rounded-full bg-emerald-300/30 blur-md"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  />
                  {/* Shimmer sweep */}
                  <motion.div
                    className="absolute inset-0 overflow-hidden rounded-lg"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12"
                      initial={{ x: '-200%' }}
                      animate={{ x: '200%' }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        repeatDelay: 1,
                        ease: 'easeInOut',
                      }}
                    />
                  </motion.div>
                </>
              )}
              <span className="relative z-10">+{roundScore}</span>
            </motion.div>
            <motion.h3
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className={cn(
                'text-3xl lg:text-4xl font-serif font-light tracking-wide',
                isPerfect ? 'text-emerald-400' : 'text-foreground/90',
              )}
            >
              {message}
            </motion.h3>
          </div>

          {/* Rating Comparison Section */}
          <div className="py-6 space-y-6 w-full px-4 bg-secondary/30 rounded-2xl border border-border/50">
            <div className="flex flex-col items-center gap-2">
              <span className="text-muted-foreground text-sm lg:text-base uppercase tracking-[0.2em] font-bold">
                Your Guess
              </span>
              <div className="flex items-center gap-3">
                <StarRating value={userRating} readOnly starSize="w-6 h-6 lg:w-8 lg:h-8" />
              </div>
            </div>

            <div className="w-full h-px bg-border/50" />

            <div className="flex flex-col items-center gap-2">
              <span className="text-muted-foreground text-sm lg:text-base uppercase tracking-[0.2em] font-bold">
                Actual Rating
              </span>
              <div className="flex items-center gap-3">
                <StarRating value={actualRating} readOnly starSize="w-6 h-6 lg:w-8 lg:h-8" />
              </div>
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
