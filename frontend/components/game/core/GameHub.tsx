'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Star, Film, Play, Lightbulb } from 'lucide-react';
import {
  useExperienceStore,
  selectScores,
  selectRatingGameStatus,
  selectGenreGameStatus,
  selectThemeGameStatus,
} from '@/store/core/experienceStore';
import { GameBackground } from '@/components/game/shared/GameBackground';
import { GameLayout } from '@/components/game/shared/GameLayout';
import { RATING_GAME_CONFIG } from '@/components/game/rating/constants';
import { GENRE_RANKING_CONFIG } from '@/components/game/genre/ranking/constants';
import { GameHubCard } from './GameHubCard';

export const GameHub = () => {
  // Use granular selectors to prevent unnecessary re-renders
  const scores = useExperienceStore(selectScores);
  const ratingGameStatus = useExperienceStore(selectRatingGameStatus);
  const genreGameStatus = useExperienceStore(selectGenreGameStatus);
  const themeGameStatus = useExperienceStore(selectThemeGameStatus);

  const startGenreGame = useExperienceStore((state) => state.startGenreGame);
  const startRatingGame = useExperienceStore((state) => state.startRatingGame);
  const startThemeExperience = useExperienceStore((state) => state.startThemeExperience);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3,
      },
    },
  };

  return (
    <GameBackground className="bg-background">
      <GameLayout
        className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12"
        top={null}
        middle={
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full"
          >
            {/* Rating Game Card */}
            <GameHubCard
              title="Rating Intuition"
              status={ratingGameStatus}
              score={scores.rating}
              maxScore={RATING_GAME_CONFIG.MAX_SCORE}
              icon={<Star className="w-6 h-6 fill-current" />}
              onClick={startRatingGame}
              actionLabel="Start Game"
              onHoverBorderColor="focus-visible:ring-primary"
            />

            {/* Genre Ranking Game Card */}
            <GameHubCard
              title="Genre Ranking"
              status={genreGameStatus}
              score={scores.genre}
              maxScore={GENRE_RANKING_CONFIG.MAX_SCORE}
              icon={
                genreGameStatus === 'UNLOCKED' ? (
                  <Play className="w-6 h-6 fill-current" />
                ) : (
                  <Film className="w-6 h-6" />
                )
              }
              onClick={startGenreGame}
              actionLabel="Next Chapter"
              onHoverBorderColor="focus-visible:ring-accent"
              gradientColor="from-accent/5"
            />

            {/* Theme Guessing Card */}
            <GameHubCard
              title="Theme Guessing"
              status={themeGameStatus}
              score={scores.theme}
              maxScore={100} // Assuming 100 for now, logic might vary
              icon={
                themeGameStatus === 'UNLOCKED' ? (
                  <Play className="w-6 h-6 fill-current" />
                ) : (
                  <Lightbulb className="w-6 h-6" />
                )
              }
              onClick={startThemeExperience}
              actionLabel="Next Chapter"
              onHoverBorderColor="focus-visible:ring-accent"
              gradientColor="from-accent/5"
            />
          </motion.div>
        }
        bottom={null}
      />
    </GameBackground>
  );
};
