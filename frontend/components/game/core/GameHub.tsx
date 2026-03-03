'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Star, Film, Lightbulb } from 'lucide-react';
import {
  useExperienceStore,
  selectScores,
  selectRatingGameStatus,
  selectGenreGameStatus,
  selectThemeGameStatus,
  selectHabitsGameStatus,
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
  const habitsGameStatus = useExperienceStore(selectHabitsGameStatus);

  const startGenreGame = useExperienceStore((state) => state.startGenreGame);
  const startRatingGame = useExperienceStore((state) => state.startRatingGame);
  const startThemeExperience = useExperienceStore((state) => state.startThemeExperience);
  const startHabitsExperience = useExperienceStore((state) => state.startHabitsExperience);

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
        className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-12"
        top={null}
        middle={
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 w-full max-w-6xl mx-auto"
          >
            {/* Rating Game Card - Always visible (or check unlocked status if needed, but usually entry point) */}
            {ratingGameStatus !== 'LOCKED' && (
              <GameHubCard
                title="Rating Intuition"
                status={ratingGameStatus}
                score={scores.rating}
                maxScore={RATING_GAME_CONFIG.MAX_SCORE}
                icon={<Star className="w-5 h-5 md:w-6 md:h-6 fill-current" />}
                onClick={startRatingGame}
                actionLabel="Continue"
                onHoverBorderColor="focus-visible:ring-primary"
              />
            )}

            {/* Genre Ranking Game Card */}
            {genreGameStatus !== 'LOCKED' && (
              <GameHubCard
                title="Genre Ranking"
                status={genreGameStatus}
                score={scores.genre}
                maxScore={GENRE_RANKING_CONFIG.MAX_SCORE}
                icon={<Film className="w-5 h-5 md:w-6 md:h-6 fill-current" />}
                onClick={startGenreGame}
                actionLabel="Continue"
                onHoverBorderColor={
                  genreGameStatus === 'UNLOCKED'
                    ? 'focus-visible:ring-primary'
                    : 'focus-visible:ring-accent'
                }
                gradientColor={genreGameStatus === 'UNLOCKED' ? 'from-primary/5' : 'from-accent/5'}
              />
            )}

            {/* Theme Guessing Card */}
            {themeGameStatus !== 'LOCKED' && (
              <GameHubCard
                title="Theme Guessing"
                status={themeGameStatus}
                score={scores.theme}
                maxScore={100}
                icon={<Lightbulb className="w-5 h-5 md:w-6 md:h-6 fill-current" />}
                onClick={startThemeExperience}
                actionLabel="Continue"
                onHoverBorderColor={
                  themeGameStatus === 'UNLOCKED'
                    ? 'focus-visible:ring-primary'
                    : 'focus-visible:ring-accent'
                }
                gradientColor={themeGameStatus === 'UNLOCKED' ? 'from-primary/5' : 'from-accent/5'}
              />
            )}

            {/* Viewing Habits Card */}
            {habitsGameStatus !== 'LOCKED' && (
              <GameHubCard
                title="Viewing Habits"
                status={habitsGameStatus}
                score={scores.habits}
                maxScore={40} // 2 rounds * 20 points
                icon={<Film className="w-5 h-5 md:w-6 md:h-6 fill-current" />}
                onClick={startHabitsExperience}
                actionLabel="Continue"
                onHoverBorderColor={
                  habitsGameStatus === 'UNLOCKED'
                    ? 'focus-visible:ring-primary'
                    : 'focus-visible:ring-accent'
                }
                gradientColor={habitsGameStatus === 'UNLOCKED' ? 'from-primary/5' : 'from-accent/5'}
              />
            )}
          </motion.div>
        }
        bottom={null}
      />
    </GameBackground>
  );
};
