'use client';

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useExperienceStore } from '@/store/core/experienceStore';
import { RatingGame } from '../rating/RatingGame';
import { useRatingGameStore } from '@/store/rating/ratingStore';
import { useGenreRankingStore } from '@/store/genre/rankingStore';
import { GameHub } from './GameHub';
import { GenreRankingGame } from '../genre/ranking/GenreRankingGame';

export const ExperienceOrchestrator = () => {
  const {
    currentPhase,
    completeRatingGame,
    completeGenreGame,
    backgroundStatus,
    pollBackgroundStatus,
    setReady,
  } = useExperienceStore();

  const startRatingGame = useRatingGameStore((s) => s.startGame);
  const startGenreGame = useGenreRankingStore((s) => s.startGame);

  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    const check = async () => {
      const data = await pollBackgroundStatus();
      if (data?.status === 'ready') {
        // Hydrate Stores Explicitly
        if (data.ratingGame) {
          startRatingGame({
            movies: data.ratingGame.movies,
            userStats: data.userStats,
          });
        }
        if (data.genreGame) {
          startGenreGame({
            ...data.genreGame,
            previousScore: 0,
          });
        }
        setReady(); // Transition State
      }
    };

    if (backgroundStatus === 'processing') {
      interval = setInterval(check, 5000);
      // Run once immediately
      check();
    }
    return () => clearInterval(interval);
  }, [backgroundStatus, pollBackgroundStatus, setReady, startRatingGame, startGenreGame]);

  // Loading Screen
  if (backgroundStatus === 'processing') {
    return (
      <div className="w-full h-full min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center space-y-6">
        <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <div className="space-y-2">
          <h2 className="text-3xl font-serif font-bold text-foreground">
            Analyzing Your Cinema History
          </h2>
          <p className="text-muted-foreground">
            We are watching your movies... (This might take ~20s)
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-screen bg-background overflow-hidden relative">
      <AnimatePresence mode="wait">
        {currentPhase === 'rating-game' && (
          <motion.div
            key="rating-game"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-full"
          >
            <RatingGame onGameComplete={completeRatingGame} />
          </motion.div>
        )}

        {currentPhase === 'hub' && (
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

        {currentPhase === 'genre-game' && (
          <motion.div
            key="genre-game"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-full"
          >
            <GenreRankingGame onGameComplete={completeGenreGame} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
