"use client";

import React from "react";
import { motion } from "framer-motion";
import { genreToColor } from "@/store/genreGameStore";
import { cn } from "@/lib/utils";

interface GenreCardProps {
  genre: { id: string; name: string };
  position: number;
  isDragging?: boolean;
  isCorrect?: boolean | null; // null = not revealed yet
  className?: string;
}

export const GenreCard = ({
  genre,
  position,
  isDragging = false,
  isCorrect = null,
  className,
}: GenreCardProps) => {
  const color = genreToColor(genre.name);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{
        opacity: 1,
        scale: isDragging ? 1.05 : 1,
        y: 0,
        rotate: isDragging ? 2 : 0,
      }}
      exit={{ opacity: 0, scale: 0.8, y: -20 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={cn(
        "relative flex items-center gap-4 p-4 rounded-xl cursor-grab active:cursor-grabbing",
        "border-2 transition-colors duration-200",
        "shadow-md hover:shadow-lg",
        isDragging && "shadow-xl z-50",
        isCorrect === true && "border-green-500 bg-green-500/10",
        isCorrect === false && "border-red-400 bg-red-400/10",
        isCorrect === null && "border-border bg-card",
        className,
      )}
      style={{
        borderLeftColor: isCorrect === null ? color : undefined,
        borderLeftWidth: isCorrect === null ? "4px" : undefined,
      }}
    >
      {/* Position Badge */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
        style={{
          backgroundColor: isCorrect === null ? color : undefined,
          color: isCorrect === null ? "white" : undefined,
        }}
      >
        {isCorrect === true && "✓"}
        {isCorrect === false && "✗"}
        {isCorrect === null && position}
      </div>

      {/* Genre Name */}
      <span className="font-serif text-lg font-semibold text-foreground flex-1">
        {genre.name}
      </span>

      {/* Drag Handle Indicator */}
      <div className="flex flex-col gap-0.5 opacity-40">
        <div className="w-4 h-0.5 bg-muted-foreground rounded" />
        <div className="w-4 h-0.5 bg-muted-foreground rounded" />
        <div className="w-4 h-0.5 bg-muted-foreground rounded" />
      </div>
    </motion.div>
  );
};
