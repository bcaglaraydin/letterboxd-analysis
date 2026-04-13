'use client';

import React from 'react';
import { Reorder } from 'framer-motion';
import { type Genre } from '@/store/genre/rankingStore';
import { RankingItem } from './RankingItem';

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
      className="flex flex-col justify-center gap-1.5 md:gap-3 w-full"
    >
      {/* Removed AnimatePresence wrapper to prevent items from disappearing during reordering/drag. Reorder.Group handles its own enter/exit logic anyway. */}
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
            className="touch-none w-full"
          >
            <div className="w-full">
              <RankingItem
                genre={genre}
                index={index}
                variant="draggable"
                isDragging={isDragging === genreId}
                showDragHandle
              />
            </div>
          </Reorder.Item>
        );
      })}
    </Reorder.Group>
  );
};
