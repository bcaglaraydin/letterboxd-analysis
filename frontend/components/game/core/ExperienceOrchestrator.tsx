'use client';

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useExperienceStore } from '@/store/core/experienceStore';
import { RatingGame } from '../rating/RatingGame';
import { GameHub } from './GameHub';
import { GenreOrchestration } from '@/components/game/genre/GenreOrchestration';
import { useGameInitialization } from '@/hooks/useGameInitialization';
import { GAME_PHASES } from '@/lib/gameTypes';

export const ExperienceOrchestrator = () => {
  const { currentPhase, completeRatingGame, completeGenreGame } = useExperienceStore();

  const completeRatingGameHandler = (score: number) => {
    completeRatingGame(score);
  };

  const completeGenreGameHandler = (score: number) => {
    completeGenreGame(score);
  };

  // Background polling for additional game data
  useGameInitialization({ backgroundMode: true });

  return (
    <div className="w-full h-full min-h-screen bg-background overflow-hidden relative">
      <AnimatePresence mode="wait">
        {currentPhase === GAME_PHASES.RATING && (
          <motion.div
            key="rating-game"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-full"
          >
            <RatingGame onGameComplete={completeRatingGameHandler} />
          </motion.div>
        )}

        {currentPhase === GAME_PHASES.HUB && (
          <motion.div
            key="hub"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-full"
          >
            <GameHub />
          </motion.div>
        )}

        {currentPhase === GAME_PHASES.GENRE && (
          <motion.div
            key="genre-game"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-full"
          >
            <GenreOrchestration onGameComplete={completeGenreGameHandler} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
