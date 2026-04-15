'use client';

import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useRatingGameStore } from '@/store/rating/ratingStore';

import { IntroStep, AveragesStep, HistogramStep, GuiltyPleasuresStep } from './steps';

import { useUserStore } from '@/store/core/userStore';
import { useGenreRankingStore } from '@/store/genre/rankingStore';
import { Loader2 } from 'lucide-react';

interface PostGameScreenProps {
  score: number;
  onComplete: () => void;
}

export const PostGameScreen: React.FC<PostGameScreenProps> = ({ score, onComplete }) => {
  const { userStats, setUserStats } = useRatingGameStore(); // Added setUserStats
  const { backgroundStatus, fetchFullStats } = useUserStore();
  const startGenreGame = useGenreRankingStore((s) => s.startGame);

  // Step navigation and deviations state
  const [step, setStep] = useState(0);
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);
  const [movieIndex, setMovieIndex] = useState(0);

  // Derived state for deviations
  const DEVIATION_CATEGORIES = [
    'guiltyPleasures',
    'controversialPicks',
    'hotTakes',
    'skepticPicks',
  ] as const;
  const activeCategories = userStats
    ? DEVIATION_CATEGORIES.filter((cat) => userStats[cat] && userStats[cat].length > 0)
    : [];

  // Fetch Logic
  React.useEffect(() => {
    if (backgroundStatus === 'ready' && !userStats) {
      fetchFullStats().then((data) => {
        if (data.userStats) setUserStats(data.userStats);
        if (data.genreGame) startGenreGame({ ...data.genreGame, previousScore: 0 });
      });
    }
  }, [backgroundStatus, userStats, fetchFullStats, setUserStats, startGenreGame]);

  // Loading Gate
  if (!userStats) {
    return (
      <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
          <Loader2 className="w-16 h-16 text-primary animate-spin relative z-10" />
        </div>
        <h2 className="text-3xl font-serif text-primary mb-2">Analyzing your cinema history...</h2>
        <p className="text-muted-foreground text-lg max-w-md">
          We&apos;re crunching the numbers on your ratings, directors, and genres. Usually takes
          about 20-30 seconds.
        </p>
      </div>
    );
  }

  const currentCategoryKey = activeCategories[activeCategoryIndex];
  const currentList = userStats && currentCategoryKey ? userStats[currentCategoryKey] : [];
  const currentMovie = currentList[movieIndex];

  const handleShowAnother = () => {
    if (movieIndex < currentList.length - 1) {
      setMovieIndex((prev) => prev + 1);
    }
  };

  const handleContinue = () => {
    if (activeCategoryIndex < activeCategories.length - 1) {
      setActiveCategoryIndex((prev) => prev + 1);
      setMovieIndex(0);
    } else {
      onComplete();
    }
  };

  // Custom nextStep for steps other than GuiltyPleasures to check for completion if no GP/CP exist
  const handleStepCompletion = () => {
    if (step < steps.length - 1) {
      setStep((prev) => prev + 1);
    } else {
      onComplete();
    }
  };

  const hasMoreInCurrentList = movieIndex < currentList.length - 1;
  const isLastOfEverything =
    !hasMoreInCurrentList && activeCategoryIndex === activeCategories.length - 1;

  // Build steps array dynamically
  const steps = [
    // Step 0: Intro
    <IntroStep key="intro" score={score} onNext={handleStepCompletion} />,

    // Step 1: Averages
    <AveragesStep key="averages" userStats={userStats} onNext={handleStepCompletion} />,

    // Step 2: Histogram
    <HistogramStep
      key="histogram"
      userStats={userStats}
      onNext={activeCategories.length > 0 ? handleStepCompletion : onComplete}
    />,

    // Step 3: Deviations (conditionally included)
    activeCategories.length > 0 ? (
      <GuiltyPleasuresStep
        key="deviations"
        currentMovie={currentMovie}
        categoryKey={currentCategoryKey}
        movieIndex={movieIndex}
        hasMoreInCurrentList={hasMoreInCurrentList}
        isLastOfEverything={isLastOfEverything}
        currentListLength={currentList.length}
        onShowAnother={handleShowAnother}
        onContinue={handleContinue}
      />
    ) : null,
  ].filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 h-full min-h-[100dvh] w-full overflow-y-auto overflow-x-hidden bg-background text-foreground">
      <AnimatePresence mode="wait">{steps[step]}</AnimatePresence>
    </div>
  );
};
