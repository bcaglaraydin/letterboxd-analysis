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
            {/* Rating Game Card - Always visible (or check unlocked status if needed, but usually entry point) */}
            {ratingGameStatus !== 'LOCKED' && (
              <GameHubCard
                title="Rating Intuition"
                status={ratingGameStatus}
                score={scores.rating}
                maxScore={RATING_GAME_CONFIG.MAX_SCORE}
                icon={<Star className="w-6 h-6 fill-current" />}
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
                  className="w-full h-full min-h-[200px] rounded-3xl border border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 transition-all duration-300 flex flex-col items-center justify-center gap-4 group"
                >
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300">
                    <Play className="w-8 h-8 fill-current ml-1" />
                  </div>
                  <span className="text-xl font-bold text-primary">Continue</span>
                </button>
              </div>
            ) : genreGameStatus === 'COMPLETED' ? (
              <GameHubCard
                title="Genre Ranking"
                status={genreGameStatus}
                score={scores.genre}
                maxScore={GENRE_RANKING_CONFIG.MAX_SCORE}
                icon={<Film className="w-6 h-6" />}
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
                  className="w-full h-full min-h-[200px] rounded-3xl border border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 transition-all duration-300 flex flex-col items-center justify-center gap-4 group"
                >
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300">
                    <Play className="w-8 h-8 fill-current ml-1" />
                  </div>
                  <span className="text-xl font-bold text-primary">Continue</span>
                </button>
              </div>
            ) : themeGameStatus === 'COMPLETED' ? (
              <GameHubCard
                title="Theme Guessing"
                status={themeGameStatus}
                score={scores.theme}
                maxScore={100}
                icon={<Lightbulb className="w-6 h-6" />}
                onClick={startThemeExperience}
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
