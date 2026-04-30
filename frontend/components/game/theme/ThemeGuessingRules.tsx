'use client';

import React from 'react';
import { Search, Lightbulb, Trophy } from 'lucide-react';
import { RulesOverlay } from '@/components/game/shared/RulesOverlay';

export function ThemeGuessingRules() {
  return (
    <RulesOverlay title="How to Play">
      <p className="text-xs text-muted-foreground leading-relaxed">
        Identify the movie hidden behind these cinematic themes.
      </p>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-1.5">
            <Search className="w-3 h-3" />
            The Goal
          </h4>
          <p className="text-[11px] leading-relaxed">
            Type the name of the movie that matches the displayed themes. Don&apos;t worry about
            perfect spelling—we&apos;ll help you out.
          </p>
        </div>

        <div className="space-y-1.5">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-accent flex items-center gap-1.5">
            <Lightbulb className="w-3 h-3" />
            Hints
          </h4>
          <p className="text-[11px] leading-relaxed">
            Stuck? Hints unlock automatically over time (Year, Director, etc.), but using them
            reduces your potential score.
          </p>
        </div>

        <div className="space-y-1.5">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-1.5">
            <Trophy className="w-3 h-3" />
            Scoring
          </h4>
          <p className="text-[11px] leading-relaxed">
            Guess early for the full <strong className="text-primary">20 points</strong>. Each hint
            used reduces the reward.
          </p>
        </div>
      </div>

      <p className="text-[10px] text-center text-muted-foreground/60 italic pt-2 border-t border-border/10">
        Tip: Think about movies you&apos;ve rated that share these specific vibes.
      </p>
    </RulesOverlay>
  );
}
