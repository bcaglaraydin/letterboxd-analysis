'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useThemeStore } from '@/store/theme/themeStore';
import { ThemeGuessingRound } from './ThemeGuessingRound';
import { GameRoundIndicator } from '@/components/game/shared/GameRoundIndicator';
import { ScorePanel } from '@/components/game/shared/ScorePanel';

interface ThemeExperienceProps {
  onComplete: (score: number) => void;
}

export function ThemeExperience({ onComplete }: ThemeExperienceProps) {
  const { currentRoundIndex, nextRound, resetThemeExperience, score, roundScore, phase, rounds } =
    useThemeStore();
  const currentRound = rounds[currentRoundIndex];
  const [flyFromPosition, setFlyFromPosition] = useState<{ x: number; y: number }>();

  console.log('[ThemeExperience] Render', {
    roundsLength: rounds.length,
    currentRoundIndex,
    currentRound,
  });

  const handleRoundComplete = () => {
    setFlyFromPosition(undefined); // Reset for next round
    const result = nextRound();
    if (result === 'complete') {
      const finalScore = useThemeStore.getState().score;
      resetThemeExperience();
      onComplete(finalScore);
    }
  };

  if (!currentRound) return null;

  return (
    <div className="w-full h-full">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentRound.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="w-full h-full"
        >
          <ThemeGuessingRound
            round={currentRound}
            roundIndex={currentRoundIndex}
            totalRounds={rounds.length}
            onRoundComplete={handleRoundComplete}
            roundIndicator={
              <GameRoundIndicator major={currentRoundIndex + 1} majorTotal={rounds.length} />
            }
            scorePanel={
              <ScorePanel
                score={score}
                pointsEarned={phase === 'revealed' && flyFromPosition ? roundScore : null}
                flyFromPosition={flyFromPosition}
                maxScore={rounds.length * 20}
                showMaxScore
                label="Score"
                size="sm"
                position="static"
                maxPositivePoint={20}
                maxNegativePoint={0}
              />
            }
            onScorePosition={setFlyFromPosition}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
