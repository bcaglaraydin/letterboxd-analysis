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
        <div key="msg1" className="space-y-4 md:space-y-6">
          <p className="text-3xl md:text-5xl">
            Can you <span className="font-bold text-primary">guess the exact genres</span> of the
            movie shown?
          </p>
          <p className="text-xl md:text-3xl text-muted-foreground/80 font-sans">
            You don&apos;t need to pick a genre from every tier. Just select the ones that belong to
            the film!
          </p>
        </div>,
        <div
          key="msg2"
          className="space-y-5 text-lg md:text-2xl border-l-4 border-primary/20 pl-6 md:pl-8 py-2 my-6 md:my-10 font-sans text-left mx-auto max-w-2xl"
        >
          <p className="flex flex-col gap-1.5">
            <span className="font-bold text-accent tracking-widest text-xl md:text-3xl">
              ★★★ Niche
            </span>
            <span className="text-muted-foreground">
              High reward if correct, high penalty if wrong.
            </span>
          </p>
          <p className="flex flex-col gap-1.5">
            <span className="font-bold text-primary tracking-widest text-xl md:text-3xl">
              ★★ Mid
            </span>
            <span className="text-muted-foreground">Moderate reward and penalty.</span>
          </p>
          <p className="flex flex-col gap-1.5">
            <span className="font-bold text-muted-foreground tracking-widest text-xl md:text-3xl">
              ★ Popular
            </span>
            <span className="text-muted-foreground">Low reward, low penalty. Safest bet.</span>
          </p>
        </div>,
        <div
          key="msg3"
          className="text-xl md:text-3xl font-medium bg-card/40 p-5 md:p-8 rounded-2xl border border-border/40 shadow-sm mx-auto max-w-3xl font-sans text-center"
        >
          <span className="text-muted-foreground leading-snug">
            Missing a correct genre will also{' '}
            <span className="text-red-400 font-semibold">cost you points</span>. Choose carefully!
          </span>
        </div>,
      ]}
      buttonText="I got this"
      onComplete={onComplete}
    />
  );
}
