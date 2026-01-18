"use client";

import React from "react";
import { motion, Reorder, AnimatePresence } from "framer-motion";
import { type Genre } from "@/store/genre/rankingStore";
import { RankingItem } from "./RankingItem";

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
                className="h-full md:h-auto"
              >
                <RankingItem
                  genre={genre}
                  index={index}
                  variant="draggable"
                  isDragging={isDragging === genreId}
                  showDragHandle
                />
              </motion.div>
            </Reorder.Item>
          );
        })}
      </AnimatePresence>
    </Reorder.Group>
  );
};
