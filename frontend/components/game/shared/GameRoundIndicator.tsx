import React from 'react';
import { cn } from '@/lib/utils';

interface GameRoundIndicatorProps {
  currentRound: number;
  totalRounds: number;
  className?: string;
}

export function GameRoundIndicator({
  currentRound,
  totalRounds,
  className,
}: GameRoundIndicatorProps) {
  return (
    <div className={cn('flex items-baseline gap-1 font-light text-foreground', className)}>
      <span className="text-2xl md:text-3xl xl:text-4xl font-serif">{currentRound}</span>
      <span className="text-sm md:text-base xl:text-lg text-muted-foreground">/ {totalRounds}</span>
    </div>
  );
}
