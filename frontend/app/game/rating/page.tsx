"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/store/gameStore";
import { GameBackground } from "@/components/game/shared/GameBackground";
import { GameLayout } from "@/components/game/shared/GameLayout";
import { ScorePanel } from "@/components/game/shared/ScorePanel";
import { MovieCard } from "@/components/game/rating-game/MovieCard";
import { StarRating } from "@/components/game/rating-game/StarRating";
import { FeedbackOverlay } from "@/components/game/rating-game/FeedbackOverlay";
import { PostGameScreen } from "@/components/game/rating-game/PostGameScreen";

export default function RatingGamePage() {
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
  } = useGameStore();

  const [currentRating, setCurrentRating] = useState(5.0);
  const [showFeedback, setShowFeedback] = useState(false);

  const handleSubmit = () => {
    submitGuess(currentRating);
    setShowFeedback(true);
  };

  const handleNext = () => {
    setShowFeedback(false);
    setCurrentRating(5.0); // Reset slider
    nextRound();
  };

  const router = useRouter();

  useEffect(() => {
    if (movies.length === 0) {
      router.push("/");
    }
  }, [movies, router]);

  if (movies.length === 0) {
    return null; // Don't render anything while redirecting
  }

  const currentMovie = movies[currentMovieIndex];

  if (isGameOver) {
    return (
      <GameBackground>
        <GameLayout
          className="w-full max-w-7xl mx-auto"
          middle={<PostGameScreen />}
        />
      </GameBackground>
    );
  }

  return (
    <GameBackground className="h-[100dvh] !min-h-0 overflow-hidden md:h-auto md:min-h-screen md:overflow-visible">
      <GameLayout
        className="h-[100dvh] !min-h-0 overflow-hidden md:h-auto md:min-h-screen md:overflow-visible w-full max-w-7xl mx-auto"
        top={
          <div className="flex justify-between items-start p-4 md:p-8 w-full">
            {/* Round Indicator */}
            <div className="flex items-baseline gap-1 font-light text-foreground">
              <span className="text-2xl font-serif">{currentRound}</span>
              <span className="text-sm text-muted-foreground">
                / {totalRounds}
              </span>
            </div>

            {/* ScorePanel */}
            <ScorePanel
              score={score}
              pointsEarned={showFeedback ? roundScore : null}
              maxScore={totalRounds * 20}
              showMaxScore={true}
              label="Score"
              size="lg"
              position="static"
            />
          </div>
        }
        middle={
          <div className="w-full max-w-sm mx-auto flex flex-col md:block flex-1 min-h-0 pb-2 md:pb-0 space-y-1 md:space-y-8 justify-center">
            {currentMovie && (
              <div className="flex-1 min-h-0 relative flex flex-col justify-center mb-1 md:mb-6 md:h-auto md:block">
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
            {/* Rating Number Removed for Space */}

            <div className="flex justify-center">
              <StarRating
                value={currentRating}
                onChange={setCurrentRating}
                readOnly={showFeedback}
              />
            </div>

            <button
              onClick={handleSubmit}
              className="w-auto px-12 min-w-[200px] py-3 md:py-4 bg-primary hover:bg-primary/90 border border-transparent rounded-xl text-sm font-medium tracking-widest uppercase transition-colors text-primary-foreground shadow-lg hover:shadow-xl hover:-translate-y-0.5 transform duration-200"
            >
              Reveal Rating
            </button>
          </div>
        }
      />

      {/* Feedback Overlay */}
      {showFeedback && currentMovie && (
        <FeedbackOverlay
          userRating={currentRating}
          actualRating={currentMovie.userRating}
          onContinue={handleNext}
        />
      )}
    </GameBackground>
  );
}
