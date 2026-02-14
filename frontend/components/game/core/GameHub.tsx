'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Star, Film, Lock, ArrowRight, Play, Lightbulb } from 'lucide-react';
import {
  useExperienceStore,
  selectScores,
  selectIsGenreUnlocked,
  selectIsGenreCompleted,
  selectIsThemeUnlocked,
  selectIsThemeCompleted,
  selectAllGamesCompleted,
} from '@/store/core/experienceStore';
import { GameBackground } from '@/components/game/shared/GameBackground';
import { GameLayout } from '@/components/game/shared/GameLayout';
import { RATING_GAME_CONFIG } from '@/components/game/rating/constants';
import { GENRE_RANKING_CONFIG } from '@/components/game/genre/ranking/constants';
import { getScoreColor } from '@/lib/scoreUtils';

export const GameHub = () => {
  // Use granular selectors to prevent unnecessary re-renders
  const scores = useExperienceStore(selectScores);
  const isGenreUnlocked = useExperienceStore(selectIsGenreUnlocked);
  const isGenreCompleted = useExperienceStore(selectIsGenreCompleted);
  const isThemeUnlocked = useExperienceStore(selectIsThemeUnlocked);
  const isThemeCompleted = useExperienceStore(selectIsThemeCompleted);
  const allGamesCompleted = useExperienceStore(selectAllGamesCompleted);
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

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 },
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
            <motion.div variants={item} className="w-full">
              <button
                className={`w-full text-left bg-card/50 border border-border/50 rounded-3xl p-6 md:p-8 relative overflow-hidden group hover:border-primary/20 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
                  allGamesCompleted ? 'cursor-pointer hover:bg-card/80' : 'cursor-default'
                }`}
                onClick={allGamesCompleted ? startRatingGame : undefined}
                disabled={!allGamesCompleted}
                aria-label={
                  allGamesCompleted
                    ? 'Replay Rating Intuition Game'
                    : 'Rating Intuition Game Completed'
                }
              >
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <Star className="w-6 h-6 fill-current" />
                  </div>

                  <div>
                    <h3 className="text-xl font-bold">Rating Intuition</h3>
                  </div>

                  <div className="flex items-end gap-1">
                    <span
                      className="text-4xl font-serif font-bold transition-colors"
                      style={getScoreColor((scores.rating / RATING_GAME_CONFIG.MAX_SCORE) * 100)}
                    >
                      {Math.round(scores.rating)}
                    </span>
                    <span className="text-sm text-muted-foreground mb-1.5 opacity-60">
                      / {RATING_GAME_CONFIG.MAX_SCORE}
                    </span>
                  </div>
                </div>
              </button>
            </motion.div>

            {/* Genre Ranking Game Card */}
            <motion.div variants={item} className="w-full h-full">
              <button
                className={`w-full text-left h-full bg-card border rounded-3xl p-6 md:p-8 relative overflow-hidden transition-all duration-300 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none ${
                  isGenreUnlocked
                    ? 'border-accent/50 bg-gradient-to-br from-accent/5 to-transparent hover:shadow-lg hover:shadow-accent/5 hover:scale-[1.02] cursor-pointer'
                    : 'border-border/30 opacity-60 cursor-not-allowed'
                }`}
                onClick={isGenreUnlocked ? startGenreGame : undefined}
                disabled={!isGenreUnlocked}
              >
                {!isGenreUnlocked && (
                  <div className="absolute inset-0 bg-background/50 backdrop-blur-[2px] z-10 flex items-center justify-center">
                    <Lock className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}

                <div className="space-y-4 h-full flex flex-col">
                  <div className="flex justify-between items-start">
                    <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
                      {isGenreUnlocked && !isGenreCompleted ? (
                        <Play className="w-6 h-6 fill-current" />
                      ) : isGenreCompleted ? (
                        <Film className="w-6 h-6" />
                      ) : (
                        <Lock className="w-6 h-6" />
                      )}
                    </div>
                  </div>

                  <div className="flex-1">
                    <h3 className="text-xl font-bold">
                      {isGenreCompleted
                        ? 'Genre Ranking'
                        : isGenreUnlocked
                          ? 'Next Chapter'
                          : 'Locked'}
                    </h3>
                  </div>

                  {isGenreCompleted ? (
                    <div className="flex items-end gap-1">
                      <span
                        className="text-4xl font-serif font-bold transition-colors"
                        style={getScoreColor((scores.genre / GENRE_RANKING_CONFIG.MAX_SCORE) * 100)}
                      >
                        {Math.round(scores.genre)}
                      </span>
                      <span className="text-sm text-muted-foreground mb-1.5 opacity-60">
                        / {GENRE_RANKING_CONFIG.MAX_SCORE}
                      </span>
                    </div>
                  ) : isGenreUnlocked ? (
                    <div className="w-full h-12 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center text-base font-bold shadow-lg shadow-accent/20 transition-all group">
                      Continue
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  ) : (
                    <div className="h-12 w-full rounded-xl bg-muted/20" />
                  )}
                </div>
              </button>
            </motion.div>

            {/* Theme Guessing Card */}
            <motion.div variants={item} className="w-full h-full">
              <button
                className={`w-full text-left h-full bg-card border rounded-3xl p-6 md:p-8 relative overflow-hidden transition-all duration-300 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none ${
                  isThemeUnlocked
                    ? 'border-accent/50 bg-gradient-to-br from-accent/5 to-transparent hover:shadow-lg hover:shadow-accent/5 hover:scale-[1.02] cursor-pointer'
                    : 'border-border/30 opacity-60 cursor-not-allowed'
                }`}
                onClick={isThemeUnlocked ? startThemeExperience : undefined}
                disabled={!isThemeUnlocked}
              >
                {!isThemeUnlocked && (
                  <div className="absolute inset-0 bg-background/50 backdrop-blur-[2px] z-10 flex items-center justify-center">
                    <Lock className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}

                <div className="space-y-4 h-full flex flex-col">
                  <div className="flex justify-between items-start">
                    <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
                      {isThemeUnlocked && !isThemeCompleted ? (
                        <Play className="w-6 h-6 fill-current" />
                      ) : isThemeCompleted ? (
                        <Lightbulb className="w-6 h-6" />
                      ) : (
                        <Lock className="w-6 h-6" />
                      )}
                    </div>
                  </div>

                  <div className="flex-1">
                    <h3 className="text-xl font-bold">
                      {isThemeCompleted
                        ? 'Theme Guessing'
                        : isThemeUnlocked
                          ? 'Next Chapter'
                          : 'Locked'}
                    </h3>
                  </div>

                  {isThemeCompleted ? (
                    <div className="flex items-end gap-1">
                      <span className="text-sm text-muted-foreground">Completed</span>
                    </div>
                  ) : isThemeUnlocked ? (
                    <div className="w-full h-12 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center text-base font-bold shadow-lg shadow-accent/20 transition-all group">
                      Continue
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  ) : (
                    <div className="h-12 w-full rounded-xl bg-muted/20" />
                  )}
                </div>
              </button>
            </motion.div>
          </motion.div>
        }
        bottom={null}
      />
    </GameBackground>
  );
};
