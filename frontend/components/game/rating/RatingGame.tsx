"use client";

import React, { useState } from "react";
import { useRatingGameStore } from "@/store/rating/ratingStore";
import { GameBackground } from "@/components/game/shared/GameBackground";
import { GameLayout } from "@/components/game/shared/GameLayout";
import { ScorePanel } from "@/components/game/shared/ScorePanel";
import { GameRoundIndicator } from "@/components/game/shared/GameRoundIndicator";
import { MovieCard } from "@/components/game/rating/MovieCard";
import { StarRating } from "@/components/game/rating/StarRating";
import { FeedbackOverlay } from "@/components/game/rating/FeedbackOverlay";
import { PostGameScreen } from "@/components/game/rating/PostGameScreen";
import { Button } from "@/components/ui/button";

interface RatingGameProps {
  onGameComplete: (score: number) => void;
}

export function RatingGame({ onGameComplete }: RatingGameProps) {
  const {
    movies,
    currentMovieIndex,
    isGameOver,
    submitGuess,
    nextRound,
    score,
    roundScore,
    currentRound,
    totalRounds,
  } = useRatingGameStore();

  const [currentRating, setCurrentRating] = useState(5.0);
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
    setCurrentRating(5.0);
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
            <GameRoundIndicator
              currentRound={currentRound}
              totalRounds={totalRounds}
            />

            <ScorePanel
              score={score}
              pointsEarned={showFeedback && flyFromPosition ? roundScore : null}
              flyFromPosition={flyFromPosition}
              maxScore={totalRounds * 20}
              showMaxScore={true}
              label="Score"
              size="lg"
              position="static"
            />
          </div>
        }
        middle={
          <div className="w-full max-w-sm mx-auto flex flex-col flex-1 min-h-0 md:flex-none pb-2 md:pb-0 space-y-1 md:space-y-8 justify-center px-8 md:px-0">
            {currentMovie && (
              <div className="relative flex flex-col justify-center flex-1 min-h-0 md:flex-none mb-1 md:mb-6 md:h-auto">
                <MovieCard
                  key={currentMovie.movieId}
                  title={currentMovie.title}
                  year={parseInt(currentMovie.releaseYear) || 0}
                  director={currentMovie.director || "Unknown Director"}
                  posterUrl={currentMovie.poster || ""}
                  className="h-full md:h-auto"
                />
              </div>
            )}
          </div>
        }
        bottom={
          <div className="shrink-0 space-y-2 text-center z-10 md:space-y-6 w-full max-w-sm mx-auto pb-4">
            <h3 className="text-sm md:text-xl font-bold text-primary uppercase tracking-widest drop-shadow-sm">
              What did you rate this movie?
            </h3>

            <div className="flex justify-center">
              <StarRating
                value={currentRating}
                onChange={setCurrentRating}
                readOnly={showFeedback}
              />
            </div>

            <div className="inline-block">
              <Button
                onClick={handleSubmit}
                size="lg"
                className="w-auto px-12 min-w-[200px] py-3 md:py-4 h-auto rounded-xl text-sm font-medium tracking-widest uppercase shadow-lg hover:shadow-xl hover:-translate-y-0.5 transform duration-200"
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
