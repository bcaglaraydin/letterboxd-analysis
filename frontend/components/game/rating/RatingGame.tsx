'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useRatingGameStore } from '@/store/rating/ratingStore';
import { GameBackground } from '@/components/game/shared/GameBackground';
import { GameLayout } from '@/components/game/shared/GameLayout';
import { ScorePanel } from '@/components/game/shared/ScorePanel';
import { GameRoundIndicator } from '@/components/game/shared/GameRoundIndicator';
import { MovieCard } from '@/components/game/shared/MovieCard';
import { FeedbackOverlay } from '@/components/game/rating/FeedbackOverlay';
import { PostGameScreen } from '@/components/game/rating/PostGameScreen';
import { RatingInteractionPanel } from '@/components/game/rating/RatingInteractionPanel';
import { getScoreFeedback } from './constants';
import { GAME_TEXT } from '@/lib/content';

interface RatingGameProps {
  onGameComplete: (score: number) => void;
}

export function RatingGame({ onGameComplete }: RatingGameProps) {
  // Select specific values to avoid unnecessary re-renders and satisfy linter dep checks
  const movies = useRatingGameStore((s) => s.movies);
  const currentMovieIndex = useRatingGameStore((s) => s.currentMovieIndex);
  const isGameOver = useRatingGameStore((s) => s.isGameOver);
  const submitGuess = useRatingGameStore((s) => s.submitGuess);
  const nextRound = useRatingGameStore((s) => s.nextRound);
  const score = useRatingGameStore((s) => s.score);
  const roundScore = useRatingGameStore((s) => s.roundScore);
  const currentRound = useRatingGameStore((s) => s.currentRound);
  const totalRounds = useRatingGameStore((s) => s.totalRounds);
  const resetGame = useRatingGameStore((s) => s.resetGame);
  const historyLength = useRatingGameStore((s) => s.history.length);

  // Safeguard: If we somehow mount with isGameOver=true but no history, it's a bug/stale state.
  // This prevents the "PostGameScreen -> Analyzing..." flicker on fresh load.
  useEffect(() => {
    if (isGameOver && historyLength === 0) {
      console.warn('RatingGame mounted in invalid Game Over state (no history). Resetting.');
      resetGame();
    }
  }, [isGameOver, historyLength, resetGame]);

  const router = useRouter();

  useEffect(() => {
    if (movies.length === 0) {
      router.push('/');
    }
  }, [movies.length, router]);

  const [showIntro, setShowIntro] = useState(true);
  const [currentRating, setCurrentRating] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [flyFromPosition, setFlyFromPosition] = useState<{
    x: number;
    y: number;
  }>();

  const handleSubmit = () => {
    submitGuess(currentRating);
    setShowFeedback(true);
  };

  const handleNext = () => {
    setShowFeedback(false);
    setCurrentRating(0);
    setFlyFromPosition(undefined);
    nextRound();
  };

  if (movies.length === 0) return null;

  const currentMovie = movies[currentMovieIndex];

  // Hardcoded Curtain Animation
  const curtainAnimation = {
    exit: {
      y: '-100%',
      opacity: 0,
      transition: { duration: 0.8, ease: [0.32, 0, 0.67, 0] as [number, number, number, number] }, // Smooth easing up
    },
    enter: {
      initial: { y: '100%' },
      animate: {
        y: 0,
        transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }, // Smooth easing out
      },
    },
  };

  if (isGameOver) {
    return (
      <GameBackground>
        <GameLayout
          className="w-full max-w-7xl mx-auto"
          middle={<PostGameScreen score={score} onComplete={() => onGameComplete(score)} />}
        />
      </GameBackground>
    );
  }

  return (
    <GameBackground className="h-[100dvh] overflow-hidden md:h-auto md:min-h-screen md:overflow-visible">
      <div className="w-full flex-1 flex flex-col relative">
        <AnimatePresence mode="wait">
          {showIntro ? (
            <motion.div
              key="intro"
              className="z-50 flex flex-col items-center justify-center flex-1 w-full overflow-y-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={curtainAnimation.exit}
            >
              <div className="max-w-2xl mx-auto space-y-8 my-auto pt-10 pb-10 px-8">
                <div className="space-y-6">
                  <p className="text-xl md:text-3xl font-serif text-primary leading-relaxed">
                    {GAME_TEXT.RATING_GAME.INTRO.PART_1}
                  </p>
                  <p className="text-xl md:text-3xl font-serif text-primary leading-relaxed">
                    {GAME_TEXT.RATING_GAME.INTRO.PART_2_PREFIX}{' '}
                    <span className={`font-bold text-3xl ml-1 ${getScoreFeedback(75).color}`}>
                      75
                    </span>
                    <span className="font-bold text-3xl mr-1">/100</span> or higher, we&rsquo;ll{' '}
                    unlock a deeper analysis of your rating behavior.
                  </p>
                </div>

                <div className="pt-4 w-full flex justify-center">
                  <button
                    onClick={() => setShowIntro(false)}
                    className="px-12 py-6 text-lg font-bold tracking-widest uppercase rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transform duration-200 bg-primary text-primary-foreground"
                  >
                    I understand
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="game-board"
              className="w-full h-full"
              initial={curtainAnimation.enter.initial}
              animate={curtainAnimation.enter.animate}
            >
              <GameLayout
                className="w-full max-w-7xl mx-auto"
                top={
                  <div className="flex justify-between items-start p-4 md:p-8 w-full relative z-[60]">
                    <GameRoundIndicator major={currentRound} majorTotal={totalRounds} />

                    <ScorePanel
                      score={score}
                      pointsEarned={showFeedback && flyFromPosition ? roundScore : null}
                      flyFromPosition={flyFromPosition}
                      maxScore={totalRounds * 20}
                      showMaxScore={true}
                      label="Score"
                      size="lg"
                      position="static"
                      maxPositivePoint={20}
                      maxNegativePoint={0}
                      flyingPointsClassName={
                        showFeedback ? getScoreFeedback(roundScore).color : undefined
                      }
                    />
                  </div>
                }
                middle={
                  <div className="w-full max-w-4xl mx-auto flex flex-col flex-1 min-h-0 md:flex-none pb-2 md:pb-0 space-y-1 md:space-y-8 justify-center px-8 md:px-0">
                    {currentMovie && (
                      <div className="relative flex flex-col justify-center flex-1 min-h-0 md:flex-none mb-1 md:mb-6 md:h-auto w-full max-w-sm mx-auto">
                        <MovieCard
                          key={currentMovie.movieId}
                          title={currentMovie.title}
                          year={parseInt(currentMovie.releaseYear) || 0}
                          director={currentMovie.director || 'Unknown Director'}
                          posterUrl={currentMovie.poster || ''}
                          className="h-full md:h-auto"
                        />
                      </div>
                    )}

                    {/* Desktop: Interaction Section Grouped with Card */}
                    <div className="hidden md:block w-full mt-4">
                      <RatingInteractionPanel
                        currentRating={currentRating}
                        setCurrentRating={setCurrentRating}
                        showFeedback={showFeedback}
                        onSubmit={handleSubmit}
                        className="max-w-xl mx-auto space-y-6 lg:space-y-8"
                      />
                    </div>
                  </div>
                }
                bottom={
                  /* Mobile: Interaction Section Pinned to Bottom */
                  <div className="md:hidden w-full max-w-sm mx-auto pb-6">
                    <RatingInteractionPanel
                      currentRating={currentRating}
                      setCurrentRating={setCurrentRating}
                      showFeedback={showFeedback}
                      onSubmit={handleSubmit}
                      className="space-y-3 z-10"
                    />
                  </div>
                }
              />
              {showFeedback && currentMovie && (
                <FeedbackOverlay
                  userRating={currentRating}
                  actualRating={currentMovie.userRating}
                  onContinue={handleNext}
                  onScorePosition={setFlyFromPosition}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </GameBackground>
  );
}
