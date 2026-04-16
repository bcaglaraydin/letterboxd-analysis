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
          <div className="flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden">
            <div className="flex min-h-full flex-col justify-start md:justify-center gap-6 md:gap-12 w-full max-w-6xl mx-auto items-center py-4 md:py-0">
              <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="grid w-full max-w-[calc(100vw-2rem)] sm:max-w-3xl grid-cols-1 gap-3 sm:grid-cols-2 md:gap-6"
              >
                {/* Rating Game Card */}
                {ratingGameStatus === 'COMPLETED' && (
                  <GameHubCard
                    title="Rating Intuition"
                    status={ratingGameStatus}
                    score={scores.rating}
                    maxScore={RATING_GAME_CONFIG.MAX_SCORE}
                    icon={<Star className="w-5 h-5 md:w-6 md:h-6 fill-current" />}
                    onClick={startRatingGame}
                  />
                )}

                {/* Genre Ranking Game Card */}
                {genreGameStatus === 'COMPLETED' && (
                  <GameHubCard
                    title="Genre Ranking"
                    status={genreGameStatus}
                    score={scores.genre}
                    maxScore={GENRE_RANKING_CONFIG.MAX_SCORE}
                    icon={<Film className="w-5 h-5 md:w-6 md:h-6 fill-current" />}
                    onClick={startGenreGame}
                  />
                )}

                {/* Theme Guessing Card */}
                {themeGameStatus === 'COMPLETED' && (
                  <GameHubCard
                    title="Theme Guessing"
                    status={themeGameStatus}
                    score={scores.theme}
                    maxScore={100}
                    icon={<Lightbulb className="w-5 h-5 md:w-6 md:h-6 fill-current" />}
                    onClick={startThemeExperience}
                  />
                )}

                {/* Viewing Habits Card */}
                {habitsGameStatus === 'COMPLETED' && (
                  <GameHubCard
                    title="Viewing Habits"
                    status={habitsGameStatus}
                    score={scores.habits}
                    maxScore={40}
                    icon={<Film className="w-5 h-5 md:w-6 md:h-6 fill-current" />}
                    onClick={startHabitsExperience}
                  />
                )}
              </motion.div>

              {/* Render UNLOCKED game as a bottom button */}
              <div className="w-full flex justify-center">
                {ratingGameStatus === 'UNLOCKED' && (
                  <button
                    onClick={startRatingGame}
                    className="w-full max-w-sm h-14 rounded-full bg-primary text-primary-foreground font-bold tracking-widest uppercase shadow-xl hover:scale-[1.02] active:scale-95 transition-all text-sm md:text-base flex items-center justify-center gap-2"
                  >
                    Continue
                  </button>
                )}
                {genreGameStatus === 'UNLOCKED' && (
                  <button
                    onClick={startGenreGame}
                    className="w-full max-w-sm h-14 rounded-full bg-primary text-primary-foreground font-bold tracking-widest uppercase shadow-xl hover:scale-[1.02] active:scale-95 transition-all text-sm md:text-base flex items-center justify-center gap-2"
                  >
                    Continue
                  </button>
                )}
                {themeGameStatus === 'UNLOCKED' && (
                  <button
                    onClick={startThemeExperience}
                    className="w-full max-w-sm h-14 rounded-full bg-primary text-primary-foreground font-bold tracking-widest uppercase shadow-xl hover:scale-[1.02] active:scale-95 transition-all text-sm md:text-base flex items-center justify-center gap-2"
                  >
                    Continue
                  </button>
                )}
                {habitsGameStatus === 'UNLOCKED' && (
                  <button
                    onClick={startHabitsExperience}
                    className="w-full max-w-sm h-14 rounded-full bg-primary text-primary-foreground font-bold tracking-widest uppercase shadow-xl hover:scale-[1.02] active:scale-95 transition-all text-sm md:text-base flex items-center justify-center gap-2"
                  >
                    Continue
                  </button>
                )}
              </div>
            </div>
          </div>
        }
        bottom={null}
      />
    </GameBackground>
  );
};
