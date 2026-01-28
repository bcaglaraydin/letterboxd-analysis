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

  // Continue polling in background when processing or partial_ready
  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    const check = async () => {
      const data = await pollBackgroundStatus();

      // PROGRESSIVE LOADING
      if (data?.status === 'partial_ready') {
        if (data.ratingGame) {
          // Hydrate Rating Game on the fly
          startRatingGame({
            movies: data.ratingGame.movies,
            userStats: data.userStats || null,
          });
        }
      }

      // FULL READY
      if (data?.status === 'ready') {
        // Hydrate Stores Explicitly
        if (data.ratingGame) {
          startRatingGame({
            movies: data.ratingGame.movies,
            userStats: data.userStats || null,
          });
        }
        if (data.genreGame) {
          startGenreGame({
            ...data.genreGame,
            previousScore: 0,
          });
        }
        setReady(); // Stops polling, Transitions State
      }
    };

    if (backgroundStatus === 'processing' || backgroundStatus === 'partial_ready') {
      interval = setInterval(check, 5000);
      // Run once immediately
      check();
    }
    return () => clearInterval(interval);
  }, [backgroundStatus, pollBackgroundStatus, setReady, startRatingGame, startGenreGame]);

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
