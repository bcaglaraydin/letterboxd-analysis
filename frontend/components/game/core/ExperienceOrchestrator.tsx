'use client';

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useExperienceStore } from '@/store/core/experienceStore';
import { RatingGame } from '../rating/RatingGame';
import { GameHub } from './GameHub';
import { GenreOrchestration } from '@/components/game/genre/GenreOrchestration';
import { ThemeExperience } from '@/components/game/theme/ThemeExperience';
import { TastePositioningOrchestration } from '@/components/game/taste/TastePositioningOrchestration';
import { ViewingHabitsOrchestration } from '@/components/game/habits/ViewingHabitsOrchestration';
import { JourneyRecap } from '@/components/game/recap/JourneyRecap';
import { useUserStore } from '@/store/core/userStore';
import { Loader2 } from 'lucide-react';
import { GAME_PHASES } from '@/lib/gameTypes';
import { DebugControls } from '../../debug/DebugControls';

export const ExperienceOrchestrator = () => {
  const currentPhase = useExperienceStore((s) => s.currentPhase);
  const completeRatingGame = useExperienceStore((s) => s.completeRatingGame);
  const completeGenreGame = useExperienceStore((s) => s.completeGenreGame);
  const completeThemeExperience = useExperienceStore((s) => s.completeThemeExperience);
  const backgroundStatus = useUserStore((s) => s.backgroundStatus);

  const completeRatingGameHandler = (score: number) => {
    completeRatingGame(score);
  };

  const completeGenreGameHandler = (score: number) => {
    completeGenreGame(score);
  };

  const completeThemeHandler = (score: number) => {
    completeThemeExperience(score);
  };

  const completeHabitsHandler = (score: number) => {
    useExperienceStore.getState().completeHabitsExperience(score);
  };

  return (
    <div className="w-full h-[100dvh] overflow-hidden relative bg-background">
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
            {backgroundStatus !== 'ready' ? (
              <div className="w-full h-[100dvh] flex flex-col items-center justify-center space-y-4">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <p className="text-xl font-serif text-primary">
                  Analyzing the rest of your movies...
                </p>
              </div>
            ) : (
              <GameHub />
            )}
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

        {currentPhase === GAME_PHASES.THEME && (
          <motion.div
            key="theme-guessing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-full"
          >
            <ThemeExperience onComplete={completeThemeHandler} />
          </motion.div>
        )}

        {currentPhase === GAME_PHASES.TASTE_POSITIONING && (
          <motion.div
            key="taste-positioning"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-full"
          >
            <TastePositioningOrchestration />
          </motion.div>
        )}

        {currentPhase === GAME_PHASES.HABITS && (
          <motion.div
            key="viewing-habits"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-full"
          >
            <ViewingHabitsOrchestration onGameComplete={completeHabitsHandler} />
          </motion.div>
        )}

        {currentPhase === GAME_PHASES.RECAP && (
          <motion.div
            key="journey-recap"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-full relative z-[100]"
          >
            <JourneyRecap />
          </motion.div>
        )}
      </AnimatePresence>
      <DebugControls />
    </div>
  );
};
