"use client";

import React, { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useGameStore } from "@/store/gameStore";
import { cn } from "@/lib/utils";
import {
  IntroStep,
  AveragesStep,
  HistogramStep,
  GuiltyPleasuresStep,
  SummaryStep,
} from "./steps";

export const PostGameScreen = () => {
  const { movies, userStats, resetGame } = useGameStore();
  // Step navigation and guilty pleasures state
  const [step, setStep] = useState(0);
  const [gpIndex, setGpIndex] = useState(0);
  const [cpIndex, setCpIndex] = useState(0);
  const [viewingControversial, setViewingControversial] = useState(false);

  // Safety check if stats aren't ready
  if (!userStats || movies.length === 0) return null;

  const nextStep = () => setStep((prev) => prev + 1);
  const reset = () => {
    setStep(0);
    setGpIndex(0);
    setCpIndex(0);
    setViewingControversial(false);
    resetGame();
  };

  // --- Logic Helpers ---
  const guiltyPleasures = userStats.guiltyPleasures || [];
  const controversialPicks = userStats.controversialPicks || [];

  const currentList = viewingControversial
    ? controversialPicks
    : guiltyPleasures;
  const currentIndex = viewingControversial ? cpIndex : gpIndex;
  const currentMovie = currentList[currentIndex];

  const handleShowAnother = () => {
    if (viewingControversial) {
      if (cpIndex < controversialPicks.length - 1)
        setCpIndex((prev) => prev + 1);
    } else {
      if (gpIndex < guiltyPleasures.length - 1) setGpIndex((prev) => prev + 1);
    }
  };

  const handleContinue = () => {
    if (!viewingControversial && controversialPicks.length > 0) {
      setViewingControversial(true);
    } else {
      nextStep();
    }
  };

  const hasMoreInCurrentList = currentIndex < currentList.length - 1;
  const isLastOfEverything = viewingControversial
    ? !hasMoreInCurrentList
    : !hasMoreInCurrentList && controversialPicks.length === 0;

  // Build steps array dynamically
  const hasGuiltyOrControversial =
    guiltyPleasures.length > 0 || controversialPicks.length > 0;

  const steps = [
    // Step 0: Intro
    <IntroStep key="intro" onNext={nextStep} />,

    // Step 1: Averages
    <AveragesStep key="averages" userStats={userStats} onNext={nextStep} />,

    // Step 2: Histogram
    <HistogramStep key="histogram" userStats={userStats} onNext={nextStep} />,

    // Step 3: Guilty Pleasures (conditionally included)
    hasGuiltyOrControversial ? (
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

    // Step 4: Summary
    <SummaryStep
      key="summary"
      movies={movies}
      userStats={userStats}
      onReset={reset}
    />,
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
              "w-2 h-2 rounded-full transition-all duration-300 shadow-sm",
              i === step ? "bg-primary w-6" : "bg-muted-foreground/30",
            )}
          />
        ))}
      </div>
    </div>
  );
};
