"use client";

import React from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

interface GenreIntroPhaseProps {
  onStart: () => void;
}

export const GenreIntroPhase: React.FC<GenreIntroPhaseProps> = ({
  onStart,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center min-h-[100dvh] w-full text-center p-6 space-y-8"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="space-y-4"
      >
        <h1 className="text-3xl md:text-5xl font-serif font-bold text-foreground">
          🎬 Genre Ranking
        </h1>
        <p className="text-muted-foreground text-lg md:text-xl max-w-md mx-auto">
          Rank your top 8 genres from most to least watched. How well do you
          know your taste?
        </p>
      </motion.div>

      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onStart}
        className="px-8 py-4 bg-primary text-primary-foreground font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all text-lg flex items-center gap-2"
      >
        Let&apos;s Go <ArrowRight className="w-5 h-5" />
      </motion.button>
    </motion.div>
  );
};
