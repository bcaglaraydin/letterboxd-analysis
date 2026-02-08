import React from 'react';
import { Button } from '@/components/ui/button';
import { StarRating } from '@/components/game/rating/StarRating';
import { GAME_TEXT } from '@/lib/content';
import { cn } from '@/lib/utils'; // Assuming cn utility exists, usually in shadcn/ui setups

interface RatingInteractionPanelProps {
  currentRating: number;
  setCurrentRating: (rating: number) => void;
  showFeedback: boolean;
  onSubmit: () => void;
  className?: string;
}

export function RatingInteractionPanel({
  currentRating,
  setCurrentRating,
  showFeedback,
  onSubmit,
  className,
}: RatingInteractionPanelProps) {
  return (
    <div className={cn('shrink-0 text-center w-full', className)}>
      <h3 className="text-base md:text-lg lg:text-2xl font-bold text-primary uppercase tracking-widest drop-shadow-sm px-4 whitespace-nowrap">
        {GAME_TEXT.RATING_GAME.INTERACTION.PROMPT}
      </h3>

      <div className="flex justify-center py-1 md:py-2">
        <StarRating
          value={currentRating}
          onChange={setCurrentRating}
          readOnly={showFeedback}
          starSize="w-14 h-14 md:w-12 md:h-12 lg:w-16 lg:h-16"
        />
      </div>

      <div className="w-full flex justify-center px-4 md:pt-4">
        <Button
          onClick={onSubmit}
          disabled={currentRating === 0}
          size="lg"
          className="w-full max-w-xs md:w-auto md:px-16 md:min-w-[240px] py-3 md:py-6 h-auto rounded-xl md:rounded-2xl text-sm md:text-lg font-medium md:font-bold tracking-widest uppercase shadow-lg md:shadow-xl hover:shadow-xl md:hover:shadow-2xl hover:-translate-y-0.5 md:hover:-translate-y-1 transform duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {GAME_TEXT.RATING_GAME.INTERACTION.BUTTON_REVEAL}
        </Button>
      </div>
    </div>
  );
}
