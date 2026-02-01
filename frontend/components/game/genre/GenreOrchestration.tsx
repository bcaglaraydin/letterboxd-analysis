'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GenreRankingGame } from './ranking/GenreRankingGame';
import { GenreMatchingGame } from './genre-matching/GenreMatchingGame';
import { PostGameScreen } from './PostGameScreen';

import { useGenreOrchestrationStore } from '@/store/genre/genreOrchestrationStore';

interface GenreOrchestrationProps {
  onGameComplete: (totalScore: number) => void;
}

export function GenreOrchestration({ onGameComplete }: GenreOrchestrationProps) {
  const { phase, setPhase, setRankingScore, setMatchingScore, rankingScore, matchingScore } =
    useGenreOrchestrationStore();

  const handleRankingComplete = (score: number) => {
    setRankingScore(score);
    setPhase('matching');
  };

  const handleMatchingComplete = (score: number) => {
    setMatchingScore(score);
    setPhase('post-game');
  };

  const handlePostGameComplete = () => {
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

        {phase === 'post-game' && (
          <motion.div
            key="post-game"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-full"
          >
            <PostGameScreen onComplete={handlePostGameComplete} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
