'use client';

import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useRatingGameStore } from '@/store/rating/ratingStore';
import { cn } from '@/lib/utils';
import { IntroStep, AveragesStep, HistogramStep, GuiltyPleasuresStep } from './steps';

import { useExperienceStore } from '@/store/core/experienceStore';
import { useGenreRankingStore } from '@/store/genre/rankingStore';
import { Loader2 } from 'lucide-react';

interface PostGameScreenProps {
  onComplete: () => void;
}

export const PostGameScreen: React.FC<PostGameScreenProps> = ({ onComplete }) => {
  const { userStats, setUserStats } = useRatingGameStore(); // Added setUserStats
  const { backgroundStatus, fetchFullStats } = useExperienceStore();
  const startGenreGame = useGenreRankingStore((s) => s.startGame);

  // Step navigation and guilty pleasures state
  const [step, setStep] = useState(0);
  const [gpIndex, setGpIndex] = useState(0);
  const [cpIndex, setCpIndex] = useState(0);
  const [viewingControversial, setViewingControversial] = useState(false);

  // Fetch Logic
  React.useEffect(() => {
    if (backgroundStatus === 'ready' && !userStats) {
      fetchFullStats().then((data) => {
        if (data.userStats) setUserStats(data.userStats);
        if (data.genreGame) startGenreGame({ ...data.genreGame, previousScore: 0 });
      });
    }
  }, [backgroundStatus, userStats, fetchFullStats, setUserStats, startGenreGame]);

  // Auto-switch to controversial if no guilty pleasures
  React.useEffect(() => {
    if (userStats) {
      const gpLen = userStats.guiltyPleasures?.length || 0;
      const cpLen = userStats.controversialPicks?.length || 0;
      if (gpLen === 0 && cpLen > 0) {
        setViewingControversial(true);
      }
    }
  }, [userStats]);

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

  // Safety check if stats aren't ready (Redundant but keeps Typescript happy for derived vars)
  // Actually, safe access is better.
  const guiltyPleasures = userStats?.guiltyPleasures || [];
  const controversialPicks = userStats?.controversialPicks || [];

  const currentList = viewingControversial ? controversialPicks : guiltyPleasures;
  const currentIndex = viewingControversial ? cpIndex : gpIndex;
  const currentMovie = currentList[currentIndex];

  const handleShowAnother = () => {
    if (viewingControversial) {
      if (cpIndex < controversialPicks.length - 1) setCpIndex((prev) => prev + 1);
    } else {
      if (gpIndex < guiltyPleasures.length - 1) setGpIndex((prev) => prev + 1);
    }
  };

  const handleContinue = () => {
    if (!viewingControversial && controversialPicks.length > 0) {
      setViewingControversial(true);
    } else {
      // If we were viewing guilty pleasures or controversial picks and are done, complete the flow.
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

  const hasMoreInCurrentList = currentIndex < currentList.length - 1;
  const isLastOfEverything = viewingControversial
    ? !hasMoreInCurrentList
    : !hasMoreInCurrentList && controversialPicks.length === 0;

  // Build steps array dynamically
  const steps = [
    // Step 0: Intro
    <IntroStep key="intro" onNext={handleStepCompletion} />,

    // Step 1: Averages
    <AveragesStep key="averages" userStats={userStats} onNext={handleStepCompletion} />,

    // Step 2: Histogram
    <HistogramStep
      key="histogram"
      userStats={userStats}
      onNext={
        guiltyPleasures.length > 0 || controversialPicks.length > 0
          ? handleStepCompletion
          : onComplete
      }
    />,

    // Step 3: Guilty Pleasures (conditionally included)
    guiltyPleasures.length > 0 || controversialPicks.length > 0 ? (
      <GuiltyPleasuresStep
        key="guilty"
        currentMovie={currentMovie}
        viewingControversial={viewingControversial}
        cpIndex={cpIndex}
        hasMoreInCurrentList={hasMoreInCurrentList}
        isLastOfEverything={isLastOfEverything}
        currentListLength={currentList.length}
        onShowAnother={handleShowAnother}
        onContinue={handleContinue}
      />
    ) : null,
  ].filter(Boolean);

  return (
    <div className="w-full h-full min-h-[100dvh] bg-background text-foreground overflow-hidden fixed inset-0 z-50">
      <AnimatePresence mode="wait">{steps[step]}</AnimatePresence>

      {/* Progress Dots */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-50 pointer-events-none">
        {steps.map((_, i) => (
          <div
            key={i}
            className={cn(
              'w-2 h-2 rounded-full transition-all duration-300 shadow-sm',
              i === step ? 'bg-primary w-6' : 'bg-muted-foreground/30',
            )}
          />
        ))}
      </div>
    </div>
  );
};
