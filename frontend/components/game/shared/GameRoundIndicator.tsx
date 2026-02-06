import React from 'react';
import { cn } from '@/lib/utils';

interface GameRoundIndicatorProps {
  major: number;
  majorTotal: number;
  minor?: {
    current: number;
    total: number;
    label?: string;
  };
  className?: string;
}

export function GameRoundIndicator({
  major,
  majorTotal,
  minor,
  className,
}: GameRoundIndicatorProps) {
  return (
    <div className={cn('flex items-baseline gap-3 select-none', className)}>
      {/* Major Round */}
      <div className="flex items-baseline gap-1.5">
        <span className="text-xs md:text-base font-bold text-muted-foreground uppercase tracking-widest">
          Round
        </span>
        <span className="text-2xl md:text-4xl font-serif font-bold text-foreground leading-none">
          {major}
        </span>
        <span className="text-base md:text-xl font-serif text-muted-foreground/60">
          /{majorTotal}
        </span>
      </div>

      {/* Minor Round (if exists) - Horizontal Bullet Style */}
      {minor && (
        <div className="flex items-baseline gap-2 pl-1 border-l-2 border-border/40 ml-1">
          <div className="flex items-baseline gap-1.5 pl-2">
            {minor.label && (
              <span className="text-[10px] md:text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                {minor.label}
              </span>
            )}
            <span className="text-lg md:text-2xl font-serif font-bold text-foreground/90 leading-none">
              {minor.current}
            </span>
            <span className="text-xs md:text-base font-serif text-muted-foreground/60">
              /{minor.total}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
