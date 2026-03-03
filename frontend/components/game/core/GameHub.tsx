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
            {genreGameStatus === 'UNLOCKED' ? (
              <div className="w-full h-full flex items-center justify-center">
                <button
                  onClick={startGenreGame}
                  className="w-full h-full aspect-square md:aspect-auto min-h-[140px] md:min-h-[200px] rounded-3xl border border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 transition-all duration-300 flex flex-col items-center justify-center gap-2 md:gap-4 p-2 group"
                >
                  <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300">
                    <Play className="w-6 h-6 md:w-8 md:h-8 fill-current ml-0.5 md:ml-1" />
                  </div>
                  <span className="text-sm md:text-xl font-bold text-primary text-center">
                    Continue
                  </span>
                </button>
              </div>
            ) : genreGameStatus === 'COMPLETED' ? (
              <GameHubCard
                title="Genre Ranking"
                status={genreGameStatus}
                score={scores.genre}
                maxScore={GENRE_RANKING_CONFIG.MAX_SCORE}
                icon={<Film className="w-5 h-5 md:w-6 md:h-6" />}
                onClick={startGenreGame}
                actionLabel="Continue"
                onHoverBorderColor="focus-visible:ring-accent"
                gradientColor="from-accent/5"
              />
            ) : null}

            {/* Theme Guessing Card */}
            {themeGameStatus === 'UNLOCKED' ? (
              <div className="w-full h-full flex items-center justify-center">
                <button
                  onClick={startThemeExperience}
                  className="w-full h-full aspect-square md:aspect-auto min-h-[140px] md:min-h-[200px] rounded-3xl border border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 transition-all duration-300 flex flex-col items-center justify-center gap-2 md:gap-4 p-2 group"
                >
                  <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300">
                    <Play className="w-6 h-6 md:w-8 md:h-8 fill-current ml-0.5 md:ml-1" />
                  </div>
                  <span className="text-sm md:text-xl font-bold text-primary text-center">
                    Continue
                  </span>
                </button>
              </div>
            ) : themeGameStatus === 'COMPLETED' ? (
              <GameHubCard
                title="Theme Guessing"
                status={themeGameStatus}
                score={scores.theme}
                maxScore={100}
                icon={<Lightbulb className="w-5 h-5 md:w-6 md:h-6" />}
                onClick={startThemeExperience}
                actionLabel="Continue"
                onHoverBorderColor="focus-visible:ring-accent"
                gradientColor="from-accent/5"
              />
            ) : null}

            {/* Viewing Habits Card */}
            {habitsGameStatus === 'UNLOCKED' ? (
              <div className="w-full h-full flex items-center justify-center">
                <button
                  onClick={startHabitsExperience}
                  className="w-full h-full aspect-square md:aspect-auto min-h-[140px] md:min-h-[200px] rounded-3xl border border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 transition-all duration-300 flex flex-col items-center justify-center gap-2 md:gap-4 p-2 group"
                >
                  <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300">
                    <Play className="w-6 h-6 md:w-8 md:h-8 fill-current ml-0.5 md:ml-1" />
                  </div>
                  <span className="text-sm md:text-xl font-bold text-primary text-center">
                    Continue
                  </span>
                </button>
              </div>
            ) : habitsGameStatus === 'COMPLETED' ? (
              <GameHubCard
                title="Viewing Habits"
                status={habitsGameStatus}
                score={scores.habits}
                maxScore={40} // 2 rounds * 20 points
                icon={<Film className="w-5 h-5 md:w-6 md:h-6" />}
                onClick={startHabitsExperience}
                actionLabel="Continue"
                onHoverBorderColor="focus-visible:ring-accent"
                gradientColor="from-accent/5"
              />
            ) : null}
          </motion.div>
        }
        bottom={null}
      />
    </GameBackground>
  );
};
