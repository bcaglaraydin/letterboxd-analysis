"use client";

import React from "react";
import { motion } from "framer-motion";
import { Star, Film, Lock, ArrowRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useExperienceStore } from "@/store/experienceStore";
import { GameBackground } from "@/components/game/shared/GameBackground";
import { GameLayout } from "@/components/game/shared/GameLayout";

import { RATING_GAME_CONFIG } from "@/components/game/rating-game/constants";
import { GENRE_RANKING_CONFIG } from "@/components/game/genre-ranking/constants";

export const GameHub = () => {
  const {
    scores,
    startGenreGame,
    startRatingGame,
    unlockedGames,
    completedGames,
  } = useExperienceStore();
  const isGenreUnlocked = unlockedGames.includes("genre-game");
  const isRatingCompleted = completedGames.includes("rating-game");
  const isGenreCompleted = completedGames.includes("genre-game");
  const allGamesCompleted = isRatingCompleted && isGenreCompleted;

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
        top={
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4 mb-8"
          >
            <h1 className="text-4xl md:text-5xl font-serif font-bold tracking-tight">
              Your Journey
            </h1>
            <p className="text-muted-foreground text-lg">
              Unlock insights about your movie taste
            </p>
          </motion.div>
        }
        middle={
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full"
          >
            {/* Rating Game Card */}
            <motion.div variants={item} className="w-full">
              <div
                className={`bg-card/50 border border-border/50 rounded-3xl p-6 md:p-8 relative overflow-hidden group hover:border-primary/20 transition-colors ${
                  allGamesCompleted ? "cursor-pointer hover:bg-card/80" : ""
                }`}
                onClick={allGamesCompleted ? startRatingGame : undefined}
              >
                <div className="absolute top-0 right-0 p-4 opacity-50 group-hover:opacity-100 transition-opacity">
                  <Star className="w-12 h-12 text-primary/20" />
                </div>

                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <Star className="w-6 h-6 fill-current" />
                  </div>

                  <div>
                    <h3 className="text-xl font-bold">Rating Intuition</h3>
                    <p className="text-sm text-muted-foreground">
                      {allGamesCompleted ? "Click to Replay" : "Completed"}
                    </p>
                  </div>

                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-serif font-bold text-foreground">
                      {Math.round(scores.rating)}
                    </span>
                    <span className="text-sm text-muted-foreground mb-1.5 opacity-60">
                      / {RATING_GAME_CONFIG.MAX_SCORE}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Genre Ranking Game Card */}
            <motion.div variants={item} className="w-full h-full">
              <div
                className={`h-full bg-card border rounded-3xl p-6 md:p-8 relative overflow-hidden transition-all duration-300 ${
                  isGenreUnlocked
                    ? "border-accent/50 bg-gradient-to-br from-accent/5 to-transparent hover:shadow-lg hover:shadow-accent/5 hover:scale-[1.02] cursor-pointer"
                    : "border-border/30 opacity-60"
                }`}
                onClick={isGenreUnlocked ? startGenreGame : undefined}
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
                        ? "Genre Ranking"
                        : isGenreUnlocked
                          ? "Next Chapter"
                          : "Locked"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {isGenreCompleted
                        ? allGamesCompleted
                          ? "Click to Replay"
                          : "Completed"
                        : isGenreUnlocked
                          ? "Continue your journey"
                          : "Complete previous game to unlock"}
                    </p>
                  </div>

                  {isGenreCompleted ? (
                    <div className="flex items-end gap-1">
                      <span className="text-4xl font-serif font-bold text-foreground">
                        {Math.round(scores.genre)}
                      </span>
                      <span className="text-sm text-muted-foreground mb-1.5 opacity-60">
                        / {GENRE_RANKING_CONFIG.MAX_SCORE}
                      </span>
                    </div>
                  ) : isGenreUnlocked ? (
                    <Button
                      className="w-full h-12 rounded-xl text-base font-bold shadow-lg shadow-accent/20 hover:shadow-accent/30 transition-all group"
                      variant="default"
                    >
                      Continue
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
                    </Button>
                  ) : (
                    <div className="h-12 w-full rounded-xl bg-muted/20" />
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        }
        bottom={null}
      />
    </GameBackground>
  );
};
