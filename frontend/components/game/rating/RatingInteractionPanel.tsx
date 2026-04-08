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
          data-testid="reveal-rating-button"
          className="w-full md:w-auto h-12 md:h-14 px-8 md:px-12 rounded-xl text-base md:text-lg font-bold tracking-widest uppercase shadow-lg md:shadow-xl hover:shadow-xl md:hover:shadow-2xl hover:-translate-y-0.5 md:hover:-translate-y-1 transform duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {GAME_TEXT.RATING_GAME.INTERACTION.BUTTON_REVEAL}
        </Button>
      </div>
    </div>
  );
}
