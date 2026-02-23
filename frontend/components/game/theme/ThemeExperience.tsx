'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useThemeStore } from '@/store/theme/themeStore';
import { ThemeGuessingRound } from './ThemeGuessingRound';
import { ThemeSortingMinigame } from './sorting/ThemeSortingMinigame';
import { ThemeResultsScreen } from './results/ThemeResultsScreen';
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

  if (phase === 'sorting') {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="sorting"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="w-full h-full"
        >
          <ThemeSortingMinigame />
        </motion.div>
      </AnimatePresence>
    );
  }

  if (phase === 'results') {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="results"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="w-full h-full"
        >
          {/* Note: The final results screen should just show the total score now. We can repurpose ThemeResultsScreen or create a simple new one. Let's pass the total combined score. */}
          <ThemeResultsScreen
            onComplete={() => onComplete(score + useThemeStore.getState().sortingScore)}
          />
        </motion.div>
      </AnimatePresence>
    );
  }

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
