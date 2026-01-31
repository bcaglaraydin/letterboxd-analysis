'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GenreRankingGame } from './ranking/GenreRankingGame';
import { GenreMatchingGame } from './genre-matching/GenreMatchingGame';

interface GenreOrchestrationProps {
  onGameComplete: (totalScore: number) => void;
}

type Phase = 'ranking' | 'matching';

export function GenreOrchestration({ onGameComplete }: GenreOrchestrationProps) {
  const [phase, setPhase] = useState<Phase>('ranking');
  const [rankingScore, setRankingScore] = useState(0);

  const handleRankingComplete = (score: number) => {
    setRankingScore(score);
    setPhase('matching');
  };

  const handleMatchingComplete = (matchingScore: number) => {
    // Combine scores or handle as needed.
    // Assuming the "Genre Score" in hub is the sum, or we might need to change how score is calculated.
    // For now, let's sum them.
    onGameComplete(rankingScore + matchingScore);
  };

  return (
    <div className="w-full h-full">
      <AnimatePresence mode="wait">
        {phase === 'ranking' && (
          <motion.div
            key="ranking"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full h-full"
          >
            <GenreRankingGame onGameComplete={handleRankingComplete} />
          </motion.div>
        )}

        {phase === 'matching' && (
          <motion.div
            key="matching"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="w-full h-full"
          >
            <GenreMatchingGame onGameComplete={handleMatchingComplete} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
