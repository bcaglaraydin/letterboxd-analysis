'use client';

import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Genre, GenreTier, TIER_POINTS } from './types';

export type GenreChipState = 'default' | 'selected' | 'correct' | 'incorrect' | 'missed';

interface GenreChipProps {
  genre: Genre;
  state: GenreChipState;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

// Color styling based on tier
const tierColors: Record<GenreTier, { border: string; bg: string; selectedBg: string }> = {
  niche: {
    border: 'border-accent/50 hover:border-accent',
    bg: 'bg-accent/5',
    selectedBg: 'bg-accent/20',
  },
  'mid-tier': {
    border: 'border-primary/50 hover:border-primary',
    bg: 'bg-primary/5',
    selectedBg: 'bg-primary/20',
  },
  popular: {
    border: 'border-muted-foreground/30 hover:border-muted-foreground/50',
    bg: 'bg-muted/30',
    selectedBg: 'bg-muted/60',
  },
};

export const GenreChip = forwardRef<HTMLButtonElement, GenreChipProps>(
  ({ genre, state, onClick, disabled = false, className }, ref) => {
    const tierStyle = tierColors[genre.tier];
    const points = TIER_POINTS[genre.tier];

    // Get state-specific styling
    const getStateStyle = () => {
      switch (state) {
        case 'selected':
          return cn(tierStyle.selectedBg, 'border-primary ring-2 ring-primary/30', 'shadow-md');
        case 'correct':
          return 'bg-green-500/20 border-green-500 text-green-700';
        case 'incorrect':
          return 'bg-destructive/10 border-destructive/50 text-destructive line-through opacity-60';
        case 'missed':
          return 'border-dashed border-muted-foreground/40 bg-muted/20 text-muted-foreground';
        default:
          return cn(tierStyle.bg, tierStyle.border);
      }
    };

    // Calculate points display
    const getPointsLabel = () => {
      if (state === 'correct') return `+${points.correct}`;
      if (state === 'incorrect') return `${points.incorrect}`;
      return null;
    };

    const pointsLabel = getPointsLabel();

    return (
      <motion.button
        ref={ref}
        type="button"
        onClick={onClick}
        disabled={disabled || state === 'correct' || state === 'incorrect' || state === 'missed'}
        whileTap={{ scale: disabled ? 1 : 0.95 }}
        whileHover={{ scale: disabled ? 1 : 1.03 }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          'relative px-3 py-1.5 md:px-4 md:py-2 rounded-full border-2 transition-all duration-200',
          'text-sm md:text-base font-medium',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
          !disabled && 'cursor-pointer',
          disabled && 'cursor-default',
          getStateStyle(),
          className,
        )}
      >
        <span className="inline-flex items-center gap-1.5">
          {genre.name}
          {/* Points badge on reveal */}
          {pointsLabel && (
            <motion.span
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                'text-xs font-bold ml-1',
                state === 'correct' && 'text-green-600',
                state === 'incorrect' && 'text-destructive',
              )}
            >
              {pointsLabel}
            </motion.span>
          )}
        </span>
      </motion.button>
    );
  },
);

GenreChip.displayName = 'GenreChip';
