'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GenreRankingGame } from './ranking/GenreRankingGame';
import { GenreMatchingGame } from './genre-matching/GenreMatchingGame';
import { PostGameScreen } from './PostGameScreen';
import { GenreIntroDialogue } from './GenreIntroDialogue';
import { GenreMatchingIntro } from './GenreMatchingIntro';

import { useGenreOrchestrationStore } from '@/store/genre/genreOrchestrationStore';
import { useUserStore } from '@/store/core/userStore';

interface GenreOrchestrationProps {
  onGameComplete: (totalScore: number) => void;
}

export function GenreOrchestration({ onGameComplete }: GenreOrchestrationProps) {
  const { phase, setPhase, setRankingScore, setMatchingScore, rankingScore, matchingScore } =
    useGenreOrchestrationStore();
  const { setReady, setProcessing, username } = useUserStore();

  const handleHubIntroComplete = () => {
    setPhase('ranking');
  };

  const handleRankingComplete = (score: number) => {
    setRankingScore(score);
    setPhase('matching-intro');
  };

  const handleMatchingIntroComplete = () => {
    setPhase('matching');
  };

  const handleMatchingComplete = (score: number) => {
    setMatchingScore(score);
    setPhase('post-game');
    // Ensure we have a valid state for PostGameScreen logic
    if (!username) setProcessing('mock-user');
    setReady();
  };

  const handlePostGameComplete = () => {
    // matchingScore already includes rankingScore (baseScore was passed in)
    onGameComplete(matchingScore);
  };

  return (
    <div className="w-full h-full">
      <AnimatePresence mode="wait">
        {phase === 'hub-intro' && (
          <motion.div
            key="hub-intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full h-full"
          >
            <GenreIntroDialogue onComplete={handleHubIntroComplete} />
          </motion.div>
        )}

        {phase === 'ranking' && (
          <motion.div
            key="ranking"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full h-full"
          >
            <GenreRankingGame onGameComplete={handleRankingComplete} />
          </motion.div>
        )}

        {phase === 'matching-intro' && (
          <motion.div
            key="matching-intro"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full h-full"
          >
            <GenreMatchingIntro onComplete={handleMatchingIntroComplete} baseScore={rankingScore} />
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
            <GenreMatchingGame onGameComplete={handleMatchingComplete} baseScore={rankingScore} />
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
