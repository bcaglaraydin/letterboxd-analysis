'use client';

import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTasteStore } from '@/store/taste/tasteStore';
import { TasteGuessStep1 } from './TasteGuessStep1';
import { TasteGuessStep2 } from './TasteGuessStep2';
import { TasteReveal } from './TasteReveal';
import { MOCK_TASTE_MOVIES } from '@/mocks/data';

interface TastePositioningOrchestrationProps {
  onGameComplete: (score: number) => void;
}

export const TastePositioningOrchestration: React.FC<TastePositioningOrchestrationProps> = ({
  onGameComplete,
}) => {
  const { step, movies, setMovies, resetTasteGame } = useTasteStore();

  useEffect(() => {
    // Initializing with mock data if movies are empty
    if (movies.length === 0) {
      setMovies(MOCK_TASTE_MOVIES);
    }

    // Reset game state when entering OR if we need to clean up
    // Actually, we usually want it to preserve state if the user navigates back and forth in the hub
    // But for a fresh start:
    // resetTasteGame();
  }, [movies.length, setMovies]);

  return (
    <div className="w-full h-full relative overflow-hidden bg-background">
      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-full"
          >
            <TasteGuessStep1 />
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step-2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full h-full"
          >
            <TasteGuessStep2 />
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step-3"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-full"
          >
            <TasteReveal />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
