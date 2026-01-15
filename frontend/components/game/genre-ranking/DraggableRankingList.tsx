"use client";

import React from "react";
import { motion, Reorder, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { genreToColor, type Genre } from "@/store/genreGameStore";

interface DraggableRankingListProps {
  genres: Genre[];
  userRanking: string[];
  onReorder: (newRanking: string[]) => void;
  isDragging: string | null;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
}

export const DraggableRankingList: React.FC<DraggableRankingListProps> = ({
  genres,
  userRanking,
  onReorder,
  isDragging,
  onDragStart,
  onDragEnd,
}) => {
  const getGenre = (id: string) => genres.find((g) => g.id === id);

  return (
    <Reorder.Group
      axis="y"
      values={userRanking}
      onReorder={onReorder}
      className="h-full flex flex-col gap-1.5 md:gap-3"
    >
      <AnimatePresence>
        {userRanking.map((genreId, index) => {
          const genre = getGenre(genreId);
          if (!genre) return null;
          const color = genreToColor(genre.name);

          return (
            <Reorder.Item
              key={genreId}
              value={genreId}
              onDragStart={() => onDragStart(genreId)}
              onDragEnd={onDragEnd}
              whileDrag={{ scale: 1.02, zIndex: 50 }}
              className="touch-none flex-1 md:flex-none"
            >
              <motion.div
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                className={cn(
                  "relative flex items-center gap-2 md:gap-4 p-1.5 md:p-4 rounded-md md:rounded-xl cursor-grab active:cursor-grabbing h-full md:h-auto",
                  "border-2 border-border bg-card",
                  "shadow-sm hover:shadow-md md:shadow-md md:hover:shadow-lg transition-shadow",
                  isDragging === genreId && "shadow-lg md:shadow-xl",
                )}
                style={{
                  borderLeftColor: color,
                  borderLeftWidth: "3px",
                }}
              >
                <motion.div
                  layout="position"
                  className="w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm font-bold shrink-0 text-white"
                  style={{ backgroundColor: color }}
                >
                  {index + 1}
                </motion.div>
                <motion.span
                  layout="position"
                  className={cn(
                    "font-serif font-semibold text-foreground flex-1 min-w-0 leading-tight",
                    genre.name.length > 10 ? "text-xs md:text-lg" : "text-sm md:text-lg",
                  )}
                >
                  {genre.name}
                </motion.span>
                <div className="flex flex-col gap-0.5 opacity-40">
                  <div className="w-3 md:w-4 h-0.5 bg-muted-foreground rounded" />
                  <div className="w-3 md:w-4 h-0.5 bg-muted-foreground rounded" />
                  <div className="w-3 md:w-4 h-0.5 bg-muted-foreground rounded" />
                </div>
              </motion.div>
            </Reorder.Item>
          );
        })}
      </AnimatePresence>
    </Reorder.Group>
  );
};
