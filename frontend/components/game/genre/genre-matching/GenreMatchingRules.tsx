'use client';

import React from 'react';
import { Info, AlertCircle } from 'lucide-react';
import { RulesOverlay } from '@/components/game/shared/RulesOverlay';

export function GenreMatchingRules() {
  return (
    <RulesOverlay title="How to Play">
      <p className="text-xs text-muted-foreground leading-relaxed">
        Select the genres that best describe the movie. Accuracy and rarity determine your score.
      </p>

      <div className="space-y-2">
        <h4 className="text-[10px] font-bold uppercase tracking-widest text-accent flex items-center gap-1.5">
          <Info className="w-3 h-3" />
          Tier Rewards
        </h4>
        <div className="grid grid-cols-1 gap-1.5">
          <div className="flex items-center justify-between text-[11px] bg-primary/5 p-2 rounded-lg border border-primary/10">
            <span className="font-medium">★★★ Niche</span>
            <span className="text-primary font-bold">High Reward</span>
          </div>
          <div className="flex items-center justify-between text-[11px] bg-primary/5 p-2 rounded-lg border border-primary/10">
            <span className="font-medium">★★ Mid-Tier</span>
            <span className="text-primary font-bold">Moderate</span>
          </div>
          <div className="flex items-center justify-between text-[11px] bg-primary/5 p-2 rounded-lg border border-primary/10">
            <span className="font-medium">★ Popular</span>
            <span className="text-primary font-bold">Safe Point</span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-[10px] font-bold uppercase tracking-widest text-destructive flex items-center gap-1.5">
          <AlertCircle className="w-3 h-3" />
          Penalties
        </h4>
        <ul className="space-y-1.5">
          <li className="flex items-start gap-2 text-[11px]">
            <div className="w-1 h-1 rounded-full bg-destructive mt-1.5 shrink-0" />
            <span>
              <strong className="text-destructive">Incorrect:</strong> Deducts points based on the
              genre&apos;s tier.
            </span>
          </li>
          <li className="flex items-start gap-2 text-[11px]">
            <div className="w-1 h-1 rounded-full bg-destructive mt-1.5 shrink-0" />
            <span>
              <strong className="text-destructive">Missed:</strong> -1 point for every correct genre
              you missed.
            </span>
          </li>
        </ul>
      </div>

      <p className="text-[10px] text-center text-muted-foreground/60 italic pt-2 border-t border-border/10">
        Tip: Rarity matters. Finding niche genres yields the highest score!
      </p>
    </RulesOverlay>
  );
}
