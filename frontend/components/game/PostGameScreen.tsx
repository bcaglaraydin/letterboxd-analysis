"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Star, Share2, RotateCcw, Heart, Trophy, ThumbsUp } from "lucide-react";
import { useGameStore } from "@/store/gameStore";
import { cn } from "@/lib/utils";

export const PostGameScreen = () => {
  const { movies, userStats, resetGame } = useGameStore();
  // 1. Guilty Pleasure & Controversial Picks State
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
  
  // Determine what we are currently showing
  // If we are in the "Guilty Pleasure" step (step 3), we decide content based on `viewingControversial`
  const currentList = viewingControversial ? controversialPicks : guiltyPleasures;
  const currentIndex = viewingControversial ? cpIndex : gpIndex;
  const currentMovie = currentList[currentIndex];
  
  // Handlers for "Next" logic within the step
  const handleShowAnother = () => {
    if (viewingControversial) {
      if (cpIndex < controversialPicks.length - 1) setCpIndex(prev => prev + 1);
    } else {
      if (gpIndex < guiltyPleasures.length - 1) setGpIndex(prev => prev + 1);
    }
  };

  const handleContinue = () => {
    // If we are viewing GPs and have CPs, switch to CPs
    if (!viewingControversial && controversialPicks.length > 0) {
      setViewingControversial(true);
    } else {
      // Otherwise go to next main step (Summary)
      nextStep();
    }
  };

  const hasMoreInCurrentList = currentIndex < currentList.length - 1;
  const isLastOfEverything = viewingControversial 
    ? !hasMoreInCurrentList 
    : !hasMoreInCurrentList && controversialPicks.length === 0;

  // 2. Histogram Data
  // We need to map the `ratingDistribution` (keys "0.5-1.0", etc.) to simple labels.
  // And normalize community distribution if needed.
  const histogramLabels = ["0.5", "1.0", "1.5", "2.0", "2.5", "3.0", "3.5", "4.0", "4.5", "5.0"];
  
  // Helper to safely get value from the distribution record
  const getDistValue = (dist: Record<string, number>, index: number) => {
    // Backend Keys: "0-0.5", "0.5-1", "1-1.5", ...
    // Index 0 (Label 0.5) -> "0-0.5"
    // Index 1 (Label 1.0) -> "0.5-1"
    const start = index * 0.5;
    const end = start + 0.5;
    
    // Format: Remove .0 if integer
    const formatNum = (n: number) => n % 1 === 0 ? n.toString() : n.toString();
    const key = `${formatNum(start)}-${formatNum(end)}`;
    
    return dist[key] || 0;
  };

  // --- Steps Components ---

  const steps = [
    // Step 0: Intro
    <div key="intro" className="flex flex-col items-center justify-center min-h-[100dvh] w-full text-center p-6 space-y-8 animate-in fade-in duration-700">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="space-y-4 max-w-md mx-auto"
      >
        <div className="text-xl text-primary font-serif italic">The results are in...</div>
        <h1 className="text-5xl md:text-7xl font-serif font-black tracking-tighter leading-tight">
          Your Movie<br />DNA
        </h1>
      </motion.div>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={nextStep}
        className="bg-primary text-primary-foreground px-8 py-4 rounded-full text-xl font-bold flex items-center gap-2 shadow-lg hover:shadow-primary/50 transition-shadow touch-manipulation"
      >
        Reveal <ArrowRight size={24} />
      </motion.button>
    </div>,

    // Step 1: Averages Comparison
    <div key="averages" className="flex flex-col items-center justify-center min-h-[100dvh] w-full text-center p-4 md:p-6 bg-gradient-to-br from-background to-secondary/20">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-4xl space-y-8 md:space-y-12 flex flex-col justify-center h-full"
      >
        <h2 className="text-2xl md:text-3xl font-medium text-muted-foreground uppercase tracking-widest">The Big Picture</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
          {/* User Stat */}
          <div className="space-y-2 md:space-y-4">
            <div className="text-xs md:text-sm font-bold text-primary uppercase tracking-widest">Your Average</div>
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="text-7xl md:text-9xl font-serif font-bold text-foreground"
            >
              {userStats.averageRating.toFixed(1)}
            </motion.div>
            <div className="flex justify-center gap-1 text-primary">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={20} className="md:w-8 md:h-8" fill={i < Math.round(userStats.averageRating) ? "currentColor" : "none"} />
              ))}
            </div>
          </div>

          {/* VS Divider (Mobile only) */}
          <div className="md:hidden text-xl font-black text-muted-foreground/50">- VS -</div>

          {/* Community Stat */}
          <div className="space-y-2 md:space-y-4 opacity-70">
            <div className="text-xs md:text-sm font-bold text-muted-foreground uppercase tracking-widest">Community Average</div>
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.4 }}
              className="text-6xl md:text-8xl font-serif font-bold text-muted-foreground"
            >
              {userStats.communityComparison.averageCommunityRating.toFixed(1)}
            </motion.div>
            <div className="flex justify-center gap-1 text-muted-foreground">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={16} className="md:w-6 md:h-6" fill={i < Math.round(userStats.communityComparison.averageCommunityRating) ? "currentColor" : "none"} />
              ))}
            </div>
          </div>
        </div>

        <p className="text-lg md:text-xl text-muted-foreground max-w-md mx-auto px-4">
          You are <span className="text-foreground font-bold">{userStats.averageRating > userStats.communityComparison.averageCommunityRating ? "more generous" : "tougher"}</span> than the rest of the world.
        </p>

        <div className="pt-4">
          <button onClick={nextStep} className="mx-auto bg-secondary hover:bg-secondary/80 text-secondary-foreground px-6 py-3 rounded-full flex items-center gap-2 transition-colors touch-manipulation">
            Next <ArrowRight size={16} />
          </button>
        </div>
      </motion.div>
    </div>,

    // Step 2: Distribution Histogram
    <div key="histogram" className="flex flex-col items-center justify-center min-h-[100dvh] w-full text-center p-4 md:p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full max-w-5xl space-y-6 md:space-y-8 flex flex-col h-full justify-center"
      >
        <div className="space-y-2 shrink-0">
          <h2 className="text-2xl md:text-4xl font-serif font-bold">Rating Distribution</h2>
          <div className="flex justify-center gap-6 text-xs md:text-sm font-medium">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary" /> You
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-muted-foreground/30" /> Community
            </div>
          </div>
        </div>

        {/* Chart Container - Responsive Height */}
        <div className="h-[40vh] md:h-80 flex items-end justify-between gap-1 md:gap-4 px-2 md:px-4 w-full">
          {histogramLabels.map((label, i) => {
             const userVal = getDistValue(userStats.ratingDistribution, i);
             const commVal = getDistValue(userStats.communityRatingDistribution, i);
             
             // Normalize for visualization: 
             // Find max value across both datasets to scale bars properly
             // We can do a rough scaling where max height = 100%
             // But for simplicity in this view, let's assume a max of ~5 for user (since 5 movies) 
             // and normalize community to match that scale roughly.
             // Or better: percentage of total.
             const userPercent = (userVal / userStats.totalMovies) * 100;
             // Community total is huge, so we just take the raw count? No, we need percentage.
             // We don't have total community votes count here easily, but let's assume the distribution values are counts.
             // Actually, backend sends raw counts. We need to normalize community to percentage.
             // Sum of community distribution values:
             const totalComm = Object.values(userStats.communityRatingDistribution).reduce((a, b) => a + b, 0) || 1;
             const commPercent = (commVal / totalComm) * 100;

             // Max height for scaling (e.g. 60% is top of chart)
             const scaleFactor = 1.5; // Multiplier to make bars taller

             return (
              <div key={label} className="flex-1 flex flex-col justify-end gap-1 h-full group relative">
                {/* Bars */}
                <div className="flex gap-[1px] md:gap-1 items-end h-full w-full justify-center">
                  <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.min(userPercent * scaleFactor, 100)}%` }} 
                    transition={{ delay: i * 0.05 }}
                    className="w-1/2 bg-primary rounded-t-[2px] md:rounded-t-sm opacity-90"
                  />
                  <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.min(commPercent * scaleFactor, 100)}%` }} 
                    transition={{ delay: i * 0.05 + 0.2 }}
                    className="w-1/2 bg-muted-foreground/30 rounded-t-[2px] md:rounded-t-sm"
                  />
                </div>
                
                {/* X Axis */}
                <div className="text-[9px] md:text-xs text-muted-foreground font-medium mt-1 md:mt-2">{label}</div>
              </div>
             );
          })}
        </div>

        <div className="shrink-0 pt-4">
          <button onClick={nextStep} className="mx-auto bg-secondary hover:bg-secondary/80 text-secondary-foreground px-6 py-3 rounded-full flex items-center gap-2 transition-colors touch-manipulation">
            Next <ArrowRight size={16} />
          </button>
        </div>
      </motion.div>
    </div>,

    // Step 3: Guilty Pleasures & Controversial Picks
    (guiltyPleasures.length > 0 || controversialPicks.length > 0) ? (
      <div key="guilty" className="flex flex-col items-center justify-center min-h-[100dvh] w-full text-center p-4 md:p-6 relative overflow-hidden">
        {/* Background Poster Blur */}
        <div 
          key={currentMovie?.poster} // Force re-render for animation
          className="absolute inset-0 opacity-20 bg-cover bg-center blur-xl scale-110 transition-transform duration-[20s] ease-linear animate-slow-zoom"
          style={{ backgroundImage: `url(${currentMovie?.poster || ""})` }}
        />
        <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px]" />

        <motion.div 
          key={currentMovie?.movieId || currentMovie?.title} // Animate transition between movies
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative z-10 max-w-4xl w-full grid md:grid-cols-2 gap-6 md:gap-12 items-center"
        >
          {/* Mobile: Poster First, then Text */}
          <div className="order-1 md:order-2 flex justify-center">
            <motion.div 
              whileHover={{ scale: 1.05, rotate: -2 }}
              className="relative rounded-xl overflow-hidden shadow-2xl shadow-black/50 border-4 border-white/10 w-32 md:w-72 aspect-[2/3]"
            >
              <img src={currentMovie?.poster || ""} alt={currentMovie?.title} className="w-full h-full object-cover" />
              <div className="absolute top-2 right-2 md:top-4 md:right-4 bg-primary text-primary-foreground font-bold rounded-full w-8 h-8 md:w-12 md:h-12 flex items-center justify-center shadow-lg border-2 border-white/20 text-sm md:text-lg">
                {currentMovie?.userRating}
              </div>
            </motion.div>
          </div>

          <div className="order-2 md:order-1 space-y-4 md:space-y-6 text-center md:text-left">
            {/* Transition Message: Show ONLY on the first Controversial Pick */}
            {viewingControversial && cpIndex === 0 && (
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-muted-foreground italic"
              >
                You also have some <span className="text-amber-400 font-bold">Controversial Picks</span> that you loved more than most...
              </motion.p>
            )}

            <div className={cn(
              "inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] md:text-sm font-bold uppercase tracking-widest shadow-lg",
              !viewingControversial 
                ? "bg-rose-600 text-white border border-rose-400" 
                : "bg-amber-600 text-white border border-amber-400"
            )}>
              <Heart size={14} className="fill-current" /> 
              {!viewingControversial ? "Guilty Pleasure" : "Controversial Pick"}
            </div>
            
            <h2 className="text-2xl md:text-5xl font-serif font-bold leading-none text-foreground">
              {!viewingControversial 
                ? "You loved it. They didn't."
                : "You saw something they missed."}
            </h2>
            
            <p className="text-sm md:text-lg text-muted-foreground">
              While the community gave <span className="font-bold text-foreground">{currentMovie?.title}</span> a {currentMovie?.communityRating}, you saw it differently.
            </p>
            
            <div className="grid grid-cols-2 gap-3 md:gap-4 pt-2">
              <div className="bg-card/80 backdrop-blur p-3 md:p-4 rounded-xl border border-border text-center shadow-sm">
                <div className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-widest mb-1">You</div>
                <div className="text-2xl md:text-4xl font-serif font-bold text-primary">{currentMovie?.userRating}</div>
              </div>
              <div className="bg-muted/50 backdrop-blur p-3 md:p-4 rounded-xl border border-white/5 text-center">
                <div className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-widest mb-1">Them</div>
                <div className="text-2xl md:text-4xl font-serif font-bold text-muted-foreground">{currentMovie?.communityRating}</div>
              </div>
            </div>
          </div>
        </motion.div>
        
        <div className="pt-6 md:pt-8 z-20 shrink-0 flex flex-col items-center gap-3">
          {/* "Show Another" / "That was all" - Only if list has multiple items */}
          {currentList.length > 1 && (
            hasMoreInCurrentList ? (
              <button 
                onClick={handleShowAnother}
                className="text-xs md:text-sm text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors"
              >
                Do you want to see another one?
              </button>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }}
                className="text-xs md:text-sm text-muted-foreground italic"
              >
                That was all!
              </motion.div>
            )
          )}

          {/* Continue Button - Goes to next phase OR summary */}
          <button 
            onClick={handleContinue} 
            className="bg-card/80 hover:bg-card backdrop-blur px-6 py-3 rounded-full flex items-center gap-2 transition-colors text-foreground border border-border shadow-lg touch-manipulation whitespace-nowrap animate-pulse hover:animate-none"
          >
            {isLastOfEverything ? "See Summary" : "Continue"} <ArrowRight size={16} />
          </button>
        </div>
      </div>
    ) : null,

    // Step 4: Summary
    <div key="summary" className="flex flex-col items-center justify-center min-h-[100dvh] p-4 py-12 md:py-20 w-full">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md bg-card border border-border rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 md:space-y-8 text-center relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary via-accent to-primary" />
        
        <div className="space-y-2">
          <h2 className="text-2xl md:text-3xl font-serif font-bold">Your Round Recap</h2>
          <p className="text-muted-foreground text-sm md:text-base">5 Movies • {userStats.averageRating.toFixed(1)} Avg</p>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {movies.map((m, i) => (
            <motion.div 
              key={m.movieId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="aspect-[2/3] rounded-md overflow-hidden relative group bg-muted"
            >
              <img src={m.poster || ""} alt={m.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="font-bold text-white text-sm">{m.userRating}</span>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="pt-6 border-t border-border flex flex-col gap-3">
          <button className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:brightness-110 transition-all touch-manipulation">
            <Share2 size={18} /> Share Results
          </button>
          <button onClick={reset} className="w-full bg-secondary text-secondary-foreground py-3 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-secondary/80 transition-all touch-manipulation">
            <RotateCcw size={18} /> Replay
          </button>
        </div>
      </motion.div>
    </div>
  ].filter(Boolean);

  return (
    <div className="w-full h-full min-h-[100dvh] bg-background text-foreground overflow-hidden fixed inset-0 z-50">
      <AnimatePresence mode="wait">
        {steps[step]}
      </AnimatePresence>
      
      {/* Progress Dots */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-50 pointer-events-none">
        {steps.map((_, i) => (
          <div 
            key={i}
            className={cn(
              "w-2 h-2 rounded-full transition-all duration-300 shadow-sm",
              i === step ? "bg-primary w-6" : "bg-muted-foreground/30"
            )}
          />
        ))}
      </div>
    </div>
  );
};
