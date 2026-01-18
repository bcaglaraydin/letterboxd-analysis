"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useExperienceStore } from "@/store/experienceStore";
import { RatingGame } from "./rating/RatingGame";
import { GameHub } from "./GameHub";
import { GenreRankingGame } from "./genre/ranking/GenreRankingGame";

export const ExperienceOrchestrator = () => {
  const { currentPhase, completeRatingGame, completeGenreGame } =
    useExperienceStore();

  return (
    <div className="w-full h-full min-h-screen bg-background overflow-hidden relative">
      <AnimatePresence mode="wait">
        {currentPhase === "rating-game" && (
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

        {currentPhase === "hub" && (
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

        {currentPhase === "genre-game" && (
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
