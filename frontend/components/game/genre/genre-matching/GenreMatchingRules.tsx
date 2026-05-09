'use client';

import React from 'react';
import { Info, AlertCircle } from 'lucide-react';
import { RulesOverlay } from '@/components/game/shared/RulesOverlay';

export function GenreMatchingRules() {
  return (
    <RulesOverlay title="How to Play">
      <p className="text-xs text-muted-foreground leading-relaxed">
        Match the film with its correct genres. You don&apos;t need to pick from every tier.
      </p>

      <div className="space-y-2">
        <h4 className="text-[10px] font-bold uppercase tracking-widest text-accent flex items-center gap-1.5">
          <Info className="w-3 h-3" />
          Tiers & Scoring
        </h4>
        <div className="grid grid-cols-1 gap-1.5">
          <div className="flex items-center justify-between text-[11px] bg-accent/5 p-2 rounded-lg border border-accent/20">
            <span className="font-medium text-accent">★★★ Niche</span>
            <span className="text-accent font-bold">High Risk / High Reward</span>
          </div>
          <div className="flex items-center justify-between text-[11px] bg-primary/5 p-2 rounded-lg border border-primary/20">
            <span className="font-medium text-primary">★★ Mid-Tier</span>
            <span className="text-primary font-bold">Moderate Stakes</span>
          </div>
          <div className="flex items-center justify-between text-[11px] bg-muted/20 p-2 rounded-lg border border-muted-foreground/20">
            <span className="font-medium text-muted-foreground">★ Popular</span>
            <span className="text-muted-foreground font-bold">Safer Choice</span>
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
              genre tier.
            </span>
          </li>
          <li className="flex items-start gap-2 text-[11px]">
            <div className="w-1 h-1 rounded-full bg-destructive mt-1.5 shrink-0" />
            <span>
              <strong className="text-destructive">Missed:</strong> You lose points for every
              correct genre you leave behind!
            </span>
          </li>
        </ul>
      </div>
    </RulesOverlay>
  );
}
