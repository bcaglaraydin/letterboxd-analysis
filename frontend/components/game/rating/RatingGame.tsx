'use client';

import React, { useState } from 'react';
import { useRatingGameStore } from '@/store/rating/ratingStore';
import { GameBackground } from '@/components/game/shared/GameBackground';
import { GameLayout } from '@/components/game/shared/GameLayout';
import { ScorePanel } from '@/components/game/shared/ScorePanel';
import { GameRoundIndicator } from '@/components/game/shared/GameRoundIndicator';
import { MovieCard } from '@/components/game/shared/MovieCard';
import { StarRating } from '@/components/game/rating/StarRating';
import { FeedbackOverlay } from '@/components/game/rating/FeedbackOverlay';
import { PostGameScreen } from '@/components/game/rating/PostGameScreen';
import { Button } from '@/components/ui/button';
import { getScoreFeedback } from './constants';

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
  React.useEffect(() => {
    if (isGameOver && historyLength === 0) {
      console.warn('RatingGame mounted in invalid Game Over state (no history). Resetting.');
      resetGame();
    }
  }, [isGameOver, historyLength, resetGame]);

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

  // If connected to a backend, movies would verify here, but
  // orchestration handles loading state usually.

  const currentMovie = movies[currentMovieIndex];

  if (isGameOver) {
    return (
      <GameBackground>
        <GameLayout
          className="w-full max-w-7xl mx-auto"
          middle={<PostGameScreen onComplete={() => onGameComplete(score)} />}
        />
      </GameBackground>
    );
  }

  return (
    <GameBackground className="h-[100dvh] !min-h-0 overflow-hidden md:h-auto md:min-h-screen md:overflow-visible">
      <GameLayout
        className="h-[100dvh] !min-h-0 overflow-hidden md:h-auto md:min-h-screen md:overflow-visible w-full max-w-7xl mx-auto"
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
              flyingPointsClassName={showFeedback ? getScoreFeedback(roundScore).color : undefined}
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
              <div className="shrink-0 space-y-6 lg:space-y-8 text-center w-full max-w-xl mx-auto">
                <h3 className="text-lg lg:text-2xl font-bold text-primary uppercase tracking-widest drop-shadow-sm px-4 whitespace-nowrap">
                  What did you rate this movie?
                </h3>

                <div className="flex justify-center py-2">
                  <StarRating
                    value={currentRating}
                    onChange={setCurrentRating}
                    readOnly={showFeedback}
                    starSize="w-12 h-12 lg:w-16 lg:h-16"
                  />
                </div>

                <div className="w-full flex justify-center pt-4">
                  <Button
                    onClick={handleSubmit}
                    disabled={currentRating === 0}
                    size="lg"
                    className="w-auto px-16 min-w-[240px] py-6 h-auto rounded-2xl text-lg font-bold tracking-widest uppercase shadow-xl hover:shadow-2xl hover:-translate-y-1 transform duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Reveal Rating
                  </Button>
                </div>
              </div>
            </div>
          </div>
        }
        bottom={
          /* Mobile: Interaction Section Pinned to Bottom */
          <div className="md:hidden shrink-0 space-y-3 text-center z-10 w-full max-w-sm mx-auto pb-6">
            <h3 className="text-base font-bold text-primary uppercase tracking-widest drop-shadow-sm px-4">
              What did you rate this movie?
            </h3>

            <div className="flex justify-center py-1">
              <StarRating
                value={currentRating}
                onChange={setCurrentRating}
                readOnly={showFeedback}
              />
            </div>

            <div className="w-full flex justify-center px-4">
              <Button
                onClick={handleSubmit}
                disabled={currentRating === 0}
                size="lg"
                className="w-full max-w-xs py-3 h-auto rounded-xl text-sm font-medium tracking-widest uppercase shadow-lg hover:shadow-xl hover:-translate-y-0.5 transform duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reveal Rating
              </Button>
            </div>
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
    </GameBackground>
  );
}
