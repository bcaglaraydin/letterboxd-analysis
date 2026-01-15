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
      className="w-full h-full flex flex-col"
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
        className="text-[10px] md:text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1 md:mb-2 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.8 }}
      >
        Actual Order
      </motion.div>

      {/* Actual ranking slots */}
      <div className="flex-1 flex flex-col gap-1 md:gap-3">
        {actualRanking.map((genreId, index) => {
          const genre = getGenre(genreId);
          if (!genre) return null;

          const isRevealed = revealedActualIds.has(genreId);
          const userIndex = userRanking.indexOf(genreId);
          const actualIndex = index;
          const isCorrect = userIndex === actualIndex;
          const hasJustLanded = landedItemId === genreId;

          return (
            <div
              key={`actual-slot-${index}`}
              className="relative flex-1"
              // No motion prop here for the container to avoid conflicts
            >
               {/* Slot Placeholder */}
               <div className="w-full h-full absolute inset-0 z-0">
                  <RankingItem
                    genre={genre}
                    index={index}
                    variant="actual-slot"
                    maxScore={GENRE_RANKING_CONFIG.MAX_SCORE}
                    itemCount={itemCount}
                  />
               </div>

              {/* Filled Item - Flies from User Position */}
              <AnimatePresence>
                {isRevealed && (
                  <FlyingRankingItem
                    key={`flying-${genreId}`}
                    genreId={genreId}
                    index={index}
                    genre={genre}
                    isCorrect={isCorrect}
                    score={calculateItemScore(userIndex, actualIndex)}
                    hasJustLanded={hasJustLanded}
                    onScorePosition={onScorePosition}
                    maxScore={GENRE_RANKING_CONFIG.MAX_SCORE}
                    itemCount={itemCount}
                  />
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

// Sub-component to handle the "Fly from source" logic
const FlyingRankingItem = ({
  genreId,
  index,
  genre,
  isCorrect,
  score,
  hasJustLanded,
  onScorePosition,
  maxScore,
  itemCount,
}: {
  genreId: string;
  index: number;
  genre: Genre;
  isCorrect: boolean;
  score: number;
  hasJustLanded: boolean;
  onScorePosition: ActualRankingColumnProps["onScorePosition"];
  maxScore: number;
  itemCount: number;
}) => {
  const [startPos, setStartPos] = React.useState<{ x: number; y: number } | null>(null);
  const elementRef = React.useRef<HTMLDivElement>(null);

  React.useLayoutEffect(() => {
    // 1. Find the source element (User Ranking Item)
    const sourceEl = document.getElementById(`user-item-${genreId}`);
    
    // 2. Find the destination element (Our own container)
    const destEl = elementRef.current;

    if (sourceEl && destEl) {
      const sourceRect = sourceEl.getBoundingClientRect();
      const destRect = destEl.getBoundingClientRect();

      // Calculate delta
      const deltaX = sourceRect.left - destRect.left;
      const deltaY = sourceRect.top - destRect.top;

      setStartPos({ x: deltaX, y: deltaY });
    } else {
      // Fallback if measurement fails
      setStartPos({ x: -200, y: 0 });
    }
  }, [genreId]);

  // Don't render until we have a start position to prevent jumping
  if (!startPos) return <div ref={elementRef} className="opacity-0 w-full h-full" />;

  return (
    <motion.div
      ref={elementRef}
      initial={{ x: startPos.x, y: startPos.y, opacity: 1, scale: 1 }} // Start at source, full size
      animate={{ x: 0, y: 0, opacity: 1, scale: 1 }} // Fly to 0,0 (destination)
      transition={{
        type: "spring",
        damping: 24,
        stiffness: 120, // Slightly faster/snappier flight
        mass: 0.8,
        duration: 1.2,
      }}
      className="absolute inset-0 z-20"
    >
      <RankingItem
        genre={genre}
        index={index}
        variant="actual-filled"
        isRevealed={true}
        isCorrect={isCorrect}
        score={score}
        hasJustLanded={hasJustLanded}
        onScorePosition={(pos, s) => onScorePosition(genreId, pos, s)}
        maxScore={maxScore}
        itemCount={itemCount}
      />
    </motion.div>
  );
};
