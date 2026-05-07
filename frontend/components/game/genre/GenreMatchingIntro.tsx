'use client';

import React from 'react';
import { GameDialogue } from '@/components/game/shared/GameDialogue';
import { ScorePanel } from '@/components/game/shared/ScorePanel'; // Assuming ScorePanel needs to be imported
import { GENRE_RANKING_CONFIG } from '@/components/game/genre/ranking/constants';
import { GENRE_MATCHING_CONFIG } from '@/components/game/genre/genre-matching/constants';

interface GenreMatchingIntroProps {
  onComplete: () => void;
  baseScore?: number;
}

export function GenreMatchingIntro({ onComplete, baseScore = 0 }: GenreMatchingIntroProps) {
  return (
    <GameDialogue
      top={
        <div className="flex justify-end items-start p-4 md:p-8 w-full relative z-[60]">
          <ScorePanel
            score={baseScore} // Start from what they got in ranking
            maxScore={GENRE_RANKING_CONFIG.MAX_SCORE + GENRE_MATCHING_CONFIG.MAX_SCORE} // Global max score for entire Genre game
            showMaxScore={true}
            size="md"
            label="Score"
            className="mb-0"
          />
        </div>
      }
      messages={[
        <p key="msg1">Next game!</p>,
        <p key="msg2">
          I want you to{' '}
          <span className="font-bold">correctly guess the genres of the movie shown.</span>
        </p>,
        <p key="msg3">
          Some genres are more <span className="font-bold">niche</span> and correctly guessing them
          earns you <span className="font-bold text-green-500">more points.</span>
        </p>,
        <p key="msg4">
          Missing a genre or guessing wrong genres will give you a slight{' '}
          <span className="font-bold text-red-500">negative penalty</span>
        </p>,
      ]}
      buttonText="I got this"
      onComplete={onComplete}
    />
  );
}
