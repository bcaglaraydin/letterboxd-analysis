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

  const ratingMovies = useRatingGameStore((s) => s.movies);
  const startRatingGame = useRatingGameStore((s) => s.startGame);
  const startGenreGame = useGenreRankingStore((s) => s.startGame);

  // Continue polling ONLY if we need additional data (genre game, full stats)
  // Skip if rating game already has movies (landing page already hydrated)
  React.useEffect(() => {
    let interval: NodeJS.Timeout;

    const check = async () => {
      const data = await pollBackgroundStatus();
      if (!data) return;

      // FULL READY - hydrate any missing data
      if (data.status === 'ready') {
        // Only hydrate rating game if not already loaded
        if (data.ratingGame && ratingMovies.length === 0) {
          startRatingGame({
            movies: data.ratingGame.movies,
            userStats: data.userStats || null,
          });
        }
        // Always try to hydrate genre game if available
        if (data.genreGame) {
          startGenreGame({
            ...data.genreGame,
            previousScore: 0,
          });
        }
        setReady(); // Stops polling, Transitions State
      }
    };

    // Only poll if:
    // 1. Status is partial_ready (waiting for full data)
    // 2. AND rating game movies already exist (landing page did its job)
    // This means we only poll for additional data, not for initial load
    if (backgroundStatus === 'partial_ready' && ratingMovies.length > 0) {
      interval = setInterval(check, 5000);
      // Run once immediately
      check();
    }

    return () => clearInterval(interval);
  }, [
    backgroundStatus,
    ratingMovies.length,
    pollBackgroundStatus,
    setReady,
    startRatingGame,
    startGenreGame,
  ]);

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
