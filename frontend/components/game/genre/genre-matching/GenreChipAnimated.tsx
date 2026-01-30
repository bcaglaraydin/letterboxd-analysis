'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Genre, ChipDisplayState, TIER_POINTS } from './types';

interface GenreChipAnimatedProps {
  genre: Genre;
  state: ChipDisplayState;
  isDisabled: boolean;
  onClick?: () => void;
  chipRef?: (el: HTMLButtonElement | null) => void;
}

export const GenreChipAnimated = ({
  genre,
  state,
  isDisabled,
  onClick,
  chipRef,
}: GenreChipAnimatedProps) => {
  const points = TIER_POINTS[genre.tier];

  const getStateStyle = () => {
    switch (state) {
      case 'selected':
        return 'bg-primary/20 border-primary ring-2 ring-primary/30 shadow-md';
      case 'correct':
        // Solid green for maximum readability
        return 'bg-green-600 border-green-700 text-white shadow-md font-bold ring-1 ring-green-700/50';
      case 'incorrect':
        // Clear red text, no opacity, no line-through for readability
        return 'bg-destructive/15 border-destructive text-destructive font-semibold';
      case 'missed':
        return 'border-dashed border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium';
      default:
        return cn(
          'bg-card/60 hover:bg-card/80',
          genre.tier === 'niche' && 'border-accent/50 hover:border-accent',
          genre.tier === 'mid-tier' && 'border-primary/50 hover:border-primary',
          genre.tier === 'popular' && 'border-muted-foreground/30 hover:border-muted-foreground/50',
        );
    }
  };

  const getPointsLabel = () => {
    if (state === 'correct') return `+${points.correct}`;
    if (state === 'incorrect') return `${points.incorrect}`;
    return null;
  };

  const pointsLabel = getPointsLabel();

  return (
    <motion.button
      ref={chipRef}
      layout
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      whileTap={{ scale: isDisabled ? 1 : 0.95 }}
      whileHover={{ scale: isDisabled ? 1 : 1.03 }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{
        opacity: 1,
        scale: 1,
        transition: { type: 'spring', stiffness: 600, damping: 25, mass: 0.8 },
      }}
      exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.15 } }}
      className={cn(
        'relative px-2 py-1 md:px-2.5 md:py-1 lg:px-3 lg:py-1.5 xl:px-4 xl:py-2 rounded-full border transition-colors duration-200 shrink-0',
        'text-xs md:text-xs lg:text-sm xl:text-base font-medium',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
        !isDisabled && 'cursor-pointer',
        isDisabled && 'cursor-default',
        getStateStyle(),
      )}
    >
      <span className="inline-flex items-center gap-1">
        {genre.name}
        {pointsLabel && (
          <motion.span
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              'text-[8px] md:text-[10px] font-bold',
              state === 'correct' && 'text-green-400',
              state === 'incorrect' && 'text-destructive',
            )}
          >
            {pointsLabel}
          </motion.span>
        )}
      </span>
    </motion.button>
  );
};
