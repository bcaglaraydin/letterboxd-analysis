"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { type Genre } from "@/store/genreGameStore";
import { RankingItem } from "./RankingItem";
import { GENRE_RANKING_CONFIG } from "./constants";

interface ActualRankingColumnProps {
  genres: Genre[];
  actualRanking: string[];
  userRanking: string[];
  revealedActualIds: Set<string>;
  landedItemId: string | null;
  itemCount: number;
  calculateItemScore: (userIndex: number, actualIndex: number) => number;
  onScorePosition: (
    genreId: string,
    position: { top: string; right: string },
    score: number,
  ) => void;
}

export const ActualRankingColumn: React.FC<ActualRankingColumnProps> = ({
  genres,
  actualRanking,
  userRanking,
  revealedActualIds,
  landedItemId,
  itemCount,
  calculateItemScore,
  onScorePosition,
}) => {
  const getGenre = (id: string) => genres.find((g) => g.id === id);

  return (
    <motion.div
      layout
      className="max-w-md w-full mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{
        type: "tween",
        duration: 1.5,
        delay: 0.3,
      }}
    >
      {/* Column Header */}
      <motion.div
        className="text-[10px] md:text-xs text-muted-foreground font-bold uppercase tracking-wider mb-2 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.8 }}
      >
        Actual Order
      </motion.div>

      {/* Actual ranking slots */}
      <div className="h-full flex flex-col gap-1.5 md:gap-3">
        {actualRanking.map((genreId, index) => {
          const genre = getGenre(genreId);
          if (!genre) return null;

          const isRevealed = revealedActualIds.has(genreId);
          const userIndex = userRanking.indexOf(genreId);
          const actualIndex = index;
          const isCorrect = userIndex === actualIndex;
          const hasJustLanded = landedItemId === genreId;

          return (
            <motion.div
              key={`actual-slot-${index}`}
              className="relative"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                duration: 0.8,
                delay: index * 0.15,
                ease: "easeOut",
              }}
            >
              {/* Empty Slot */}
              <RankingItem
                genre={genre}
                index={index}
                variant="actual-slot"
                maxScore={GENRE_RANKING_CONFIG.MAX_SCORE}
                itemCount={itemCount}
              />

              {/* Filled Item - Slides in from left */}
              <AnimatePresence>
                {isRevealed && (
                  <motion.div
                    initial={{ opacity: 0, x: -300, scale: 0.85 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    transition={{
                      type: "spring",
                      damping: 20,
                      stiffness: 100,
                      duration: 1.5,
                    }}
                    className="absolute inset-0"
                  >
                    <RankingItem
                      genre={genre}
                      index={index}
                      variant="actual-filled"
                      isRevealed={true}
                      isCorrect={isCorrect}
                      score={calculateItemScore(userIndex, actualIndex)}
                      hasJustLanded={hasJustLanded}
                      onScorePosition={(pos, score) =>
                        onScorePosition(genre.id, pos, score)
                      }
                      maxScore={GENRE_RANKING_CONFIG.MAX_SCORE}
                      itemCount={itemCount}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};
