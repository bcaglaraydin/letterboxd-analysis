'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { useRatingGameStore } from '@/store/rating/ratingStore';

interface GameBackgroundProps {
  className?: string;
  children?: React.ReactNode;
}

export const GameBackground: React.FC<GameBackgroundProps> = ({ className, children }) => {
  const theme = useRatingGameStore((state) => state.theme);

  return (
    <div
      className={cn(
        'h-[100dvh] w-screen flex flex-col relative overflow-hidden transition-colors duration-700',
        className,
      )}
    >
      {/* Dynamic Gradient Background */}
      <div
        className={cn(
          'absolute inset-0 bg-gradient-to-br transition-all duration-700',
          theme.bgGradient,
        )}
      />

      {/* Organic Blobs (Watercolor effect) — offset off-screen so overflow-hidden doesn't create visible edges */}
      <div
        className={cn(
          'absolute -top-16 -left-16 md:top-0 md:left-0 w-48 h-48 md:w-96 md:h-96 bg-primary/15 md:bg-primary/20 rounded-full mix-blend-multiply filter blur-3xl opacity-50 md:opacity-70 animate-blob',
          theme.orb1Color,
        )}
      />
      <div
        className={cn(
          'absolute -top-16 -right-16 md:top-0 md:right-0 w-48 h-48 md:w-96 md:h-96 bg-accent/15 md:bg-accent/20 rounded-full mix-blend-multiply filter blur-3xl opacity-50 md:opacity-70 animate-blob animation-delay-2000',
          theme.orb2Color,
        )}
      />
      <div
        className={cn(
          'absolute -bottom-48 left-10 md:-bottom-32 md:left-20 w-48 h-48 md:w-96 md:h-96 bg-secondary/20 md:bg-secondary/30 rounded-full mix-blend-multiply filter blur-3xl opacity-50 md:opacity-70 animate-blob animation-delay-4000',
        )}
      />

      {/* Content Layer */}
      <div className="z-10 flex-1 flex flex-col w-full">{children}</div>
    </div>
  );
};
