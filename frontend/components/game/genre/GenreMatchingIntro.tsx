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
        <div key="msg1" className="space-y-4">
          <p className="text-3xl md:text-5xl">
            Let&apos;s see how well you{' '}
            <span className="font-bold text-primary">know these films.</span>
          </p>
        </div>,
        <div key="msg2" className="space-y-4">
          <p className="text-xl md:text-3xl text-muted-foreground/80 font-sans">
            You&apos;ll match the movie with its correct genres.
          </p>
        </div>,
        <div key="msg3" className="space-y-4 max-w-2xl mx-auto">
          <p className="text-lg md:text-2xl font-sans text-muted-foreground">
            <span className="font-bold text-accent">Niche (★★★)</span> are high-risk, high-reward.
            <br />
            <span className="font-bold text-primary/80">Popular (★)</span> are safer but worth less.
          </p>
        </div>,
        <div key="msg4" className="space-y-4 max-w-3xl mx-auto">
          <p className="text-xl md:text-3xl font-medium bg-card/30 p-6 rounded-2xl border border-border/40 font-sans">
            <span className="text-red-400 font-bold">Don&apos;t miss the correct ones.</span>
            <br />
            <span className="text-muted-foreground text-lg md:text-xl mt-1 block">
              Every genre you leave behind will cost you points.
            </span>
          </p>
        </div>,
      ]}
      buttonText="Start"
      onComplete={onComplete}
    />
  );
}
