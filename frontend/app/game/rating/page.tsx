"use client";

import React, { useEffect, useState } from "react";
import { useGameStore } from "@/store/gameStore";
import { GameBackground } from "@/components/game/GameBackground";
import { GameContainer } from "@/components/game/GameContainer";
import { MovieCard } from "@/components/game/MovieCard";
import { RatingSlider } from "@/components/game/RatingSlider";
import { StarRating } from "@/components/game/StarRating";
import { FeedbackOverlay } from "@/components/game/FeedbackOverlay";
import { cn } from "@/lib/utils";

import { ScoreDisplay } from "@/components/game/ScoreDisplay";
import { PostGameScreen } from "@/components/game/PostGameScreen";

export default function RatingGamePage() {
  const { movies, currentMovieIndex, isGameOver, submitGuess, nextRound } =
    useGameStore();

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

  if (movies.length === 0) {
    // Redirect to home if no movies (e.g. direct access)
    // For now, just show loading or return null
    return (
      <GameBackground>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-muted-foreground">Loading Game...</p>
        </div>
      </GameBackground>
    );
  }

  const currentMovie = movies[currentMovieIndex];

  if (isGameOver) {
    return (
      <GameBackground>
        <GameContainer>
          <PostGameScreen />
        </GameContainer>
      </GameBackground>
    );
  }

  return (
    <GameBackground className="h-[100dvh] overflow-hidden md:h-auto md:overflow-visible">
      <ScoreDisplay />

      <GameContainer className="h-[100dvh] md:h-auto md:min-h-screen overflow-hidden md:overflow-visible flex flex-col md:block pt-0 md:pt-24">
        {/* Header Spacer for ScoreDisplay - Mobile Only */}
        <div className="h-24 shrink-0 md:hidden" />

        {/* Main Game Area */}
        <div className="w-full max-w-sm mx-auto flex flex-col md:block flex-1 min-h-0 pb-4 md:pb-0 md:space-y-8">
          {currentMovie && (
            <div className="flex-1 min-h-0 relative flex flex-col justify-center mb-2 md:mb-6 md:h-auto md:block">
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

          <div className="shrink-0 space-y-2 text-center z-10 md:space-y-6">
            <h3 className="text-xs md:text-lg font-medium text-muted-foreground uppercase tracking-widest">
              What did you rate this movie?
            </h3>
            <div className="flex flex-col items-center gap-2">
              <span className="text-6xl font-light tracking-tighter text-foreground">
                {currentRating.toFixed(1)}
              </span>
            </div>

            <div className="flex justify-center">
              <StarRating value={currentRating} onChange={setCurrentRating} />
            </div>

            <button
              onClick={handleSubmit}
              className="w-full py-3 md:py-4 bg-primary hover:bg-primary/90 border border-transparent rounded-xl text-sm font-medium tracking-widest uppercase transition-colors text-primary-foreground shadow-lg hover:shadow-xl hover:-translate-y-0.5 transform duration-200"
            >
              Reveal Rating
            </button>
          </div>
        </div>
      </GameContainer>

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
