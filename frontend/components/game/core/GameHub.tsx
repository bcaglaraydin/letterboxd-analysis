'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Brain, Drama, Sparkles, Compass, Activity, Award, ArrowRight } from 'lucide-react';
import {
  useExperienceStore,
  selectScores,
  selectRatingGameStatus,
  selectGenreGameStatus,
  selectThemeGameStatus,
  selectTasteGameStatus,
  selectHabitsGameStatus,
  selectAllGamesCompleted,
} from '@/store/core/experienceStore';
import { GameBackground } from '@/components/game/shared/GameBackground';
import { GameLayout } from '@/components/game/shared/GameLayout';
import { RATING_GAME_CONFIG } from '@/components/game/rating/constants';
import { GENRE_RANKING_CONFIG } from '@/components/game/genre/ranking/constants';
import { GENRE_MATCHING_CONFIG } from '@/components/game/genre/genre-matching/constants';
import { GameHubCard } from './GameHubCard';

export const GameHub = () => {
  // Use granular selectors to prevent unnecessary re-renders
  const scores = useExperienceStore(selectScores);
  const ratingGameStatus = useExperienceStore(selectRatingGameStatus);
  const genreGameStatus = useExperienceStore(selectGenreGameStatus);
  const themeGameStatus = useExperienceStore(selectThemeGameStatus);
  const tasteGameStatus = useExperienceStore(selectTasteGameStatus);
  const habitsGameStatus = useExperienceStore(selectHabitsGameStatus);

  const startGenreGame = useExperienceStore((state) => state.startGenreGame);
  const startRatingGame = useExperienceStore((state) => state.startRatingGame);
  const startThemeExperience = useExperienceStore((state) => state.startThemeExperience);
  const startTastePositioning = useExperienceStore((state) => state.startTastePositioning);
  const startHabitsExperience = useExperienceStore((state) => state.startHabitsExperience);
  const startOutro = useExperienceStore((state) => state.startOutro);
  const allCompleted = useExperienceStore(selectAllGamesCompleted);

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
          <div className="flex-1 w-full overflow-y-auto overflow-x-hidden no-scrollbar">
            <div className="flex flex-col justify-start md:justify-center gap-6 md:gap-12 w-full max-w-6xl mx-auto items-center py-4 md:py-12 px-4">
              <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 md:gap-6"
              >
                {/* Rating Game Card */}
                {ratingGameStatus === 'COMPLETED' && (
                  <GameHubCard
                    title="Rating Intuition"
                    status={ratingGameStatus}
                    score={scores.rating}
                    maxScore={RATING_GAME_CONFIG.MAX_SCORE}
                    icon={<Brain className="w-5 h-5 md:w-6 md:h-6 fill-current" />}
                    onClick={undefined}
                  />
                )}

                {/* Genre Game Card */}
                {genreGameStatus === 'COMPLETED' && (
                  <GameHubCard
                    title="Genre Master"
                    status={genreGameStatus}
                    score={scores.genre}
                    maxScore={GENRE_RANKING_CONFIG.MAX_SCORE + GENRE_MATCHING_CONFIG.MAX_SCORE}
                    icon={<Drama className="w-5 h-5 md:w-6 md:h-6 fill-current" />}
                    onClick={undefined}
                  />
                )}

                {/* Theme Guessing Card */}
                {themeGameStatus === 'COMPLETED' && (
                  <GameHubCard
                    title="Theme Guessing"
                    status={themeGameStatus}
                    score={scores.theme}
                    maxScore={200}
                    icon={<Sparkles className="w-5 h-5 md:w-6 md:h-6 fill-current" />}
                    onClick={undefined}
                  />
                )}

                {/* Taste Positioning Card */}
                {tasteGameStatus === 'COMPLETED' && (
                  <GameHubCard
                    title="Taste Positioning"
                    status={tasteGameStatus}
                    score={scores.taste}
                    maxScore={100}
                    icon={<Compass className="w-5 h-5 md:w-6 md:h-6 fill-current" />}
                    onClick={undefined}
                  />
                )}

                {/* Viewing Habits Card */}
                {habitsGameStatus === 'COMPLETED' && (
                  <GameHubCard
                    title="Viewing Habits"
                    status={habitsGameStatus}
                    score={scores.habits}
                    maxScore={60}
                    icon={<Activity className="w-5 h-5 md:w-6 md:h-6 fill-current" />}
                    onClick={undefined}
                  />
                )}
              </motion.div>
            </div>
          </div>
        }
        bottom={
          <div className="w-full flex justify-center p-6 md:p-12 shrink-0">
            {allCompleted ? (
              <button
                onClick={startOutro}
                className="w-full max-w-sm h-14 rounded-full bg-primary text-primary-foreground font-bold tracking-widest uppercase shadow-xl hover:scale-[1.02] active:scale-95 transition-all text-sm md:text-base flex items-center justify-center gap-2 group"
              >
                <Award className="w-5 h-5 group-hover:scale-110 group-hover:rotate-3 transition-transform" />
                Reveal Cinematic Identity
              </button>
            ) : (
              <div className="w-full max-w-sm">
                {ratingGameStatus === 'UNLOCKED' && (
                  <button
                    onClick={startRatingGame}
                    className="w-full h-14 rounded-full bg-primary text-primary-foreground font-bold tracking-widest uppercase shadow-xl hover:scale-[1.02] active:scale-95 transition-all text-sm md:text-base flex items-center justify-center gap-2 group"
                  >
                    Continue
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                )}
                {genreGameStatus === 'UNLOCKED' && (
                  <button
                    onClick={startGenreGame}
                    className="w-full h-14 rounded-full bg-primary text-primary-foreground font-bold tracking-widest uppercase shadow-xl hover:scale-[1.02] active:scale-95 transition-all text-sm md:text-base flex items-center justify-center gap-2 group"
                  >
                    Continue
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                )}
                {themeGameStatus === 'UNLOCKED' && (
                  <button
                    onClick={startThemeExperience}
                    className="w-full h-14 rounded-full bg-primary text-primary-foreground font-bold tracking-widest uppercase shadow-xl hover:scale-[1.02] active:scale-95 transition-all text-sm md:text-base flex items-center justify-center gap-2 group"
                  >
                    Continue
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                )}
                {tasteGameStatus === 'UNLOCKED' && (
                  <button
                    onClick={startTastePositioning}
                    className="w-full h-14 rounded-full bg-primary text-primary-foreground font-bold tracking-widest uppercase shadow-xl hover:scale-[1.02] active:scale-95 transition-all text-sm md:text-base flex items-center justify-center gap-2 group"
                  >
                    Continue
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                )}
                {habitsGameStatus === 'UNLOCKED' && (
                  <button
                    onClick={startHabitsExperience}
                    className="w-full h-14 rounded-full bg-primary text-primary-foreground font-bold tracking-widest uppercase shadow-xl hover:scale-[1.02] active:scale-95 transition-all text-sm md:text-base flex items-center justify-center gap-2 group"
                  >
                    Continue
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                )}
              </div>
            )}
          </div>
        }
      />
    </GameBackground>
  );
};
