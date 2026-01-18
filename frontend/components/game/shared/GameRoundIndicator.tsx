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
      <span className="text-2xl font-serif">{currentRound}</span>
      <span className="text-sm text-muted-foreground">/ {totalRounds}</span>
    </div>
  );
}
