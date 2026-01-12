"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/store/gameStore";
import { GameBackground } from "@/components/game/GameBackground";
import { GameContainer } from "@/components/game/GameContainer";
import { MovieCard } from "@/components/game/MovieCard";
import { StarRating } from "@/components/game/StarRating";
import { FeedbackOverlay } from "@/components/game/FeedbackOverlay";

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
        <GameContainer>
          <PostGameScreen />
        </GameContainer>
      </GameBackground>
    );
  }

  return (
    <GameBackground className="h-[100dvh] !min-h-0 overflow-hidden md:h-auto md:min-h-screen md:overflow-visible">
      <ScoreDisplay />

      <GameContainer className="h-full md:h-auto md:min-h-screen overflow-hidden md:overflow-visible flex flex-col md:block pt-0 md:pt-24">
        {/* Header Spacer for ScoreDisplay - Mobile Only */}
        <div className="h-16 shrink-0 md:hidden" />

        {/* Main Game Area */}
        <div className="w-full max-w-sm mx-auto flex flex-col md:block flex-1 min-h-0 pb-2 md:pb-0 space-y-1 md:space-y-8">
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

          <div className="shrink-0 space-y-2 text-center z-10 md:space-y-6">
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
