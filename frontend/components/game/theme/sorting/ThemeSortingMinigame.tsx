'use client';

import React, { useState, useEffect } from 'react';
import { motion, useAnimation, PanInfo } from 'framer-motion';
import { useThemeStore } from '@/store/theme/themeStore';
import { GameLayout } from '@/components/game/shared/GameLayout';
import { GameRoundIndicator } from '@/components/game/shared/GameRoundIndicator';
import { ScorePanel } from '@/components/game/shared/ScorePanel';
import { Check, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SORTING_POINTS } from '@/store/theme/themeStore';
import { GAME_SECTION_TITLE_CLASS } from '@/components/game/shared/titleStyles';

export function ThemeSortingMinigame() {
  const {
    score,
    sortingRounds,
    currentSortingIndex,
    sortingScore,
    sortingLastPoints,
    handleThemeSwipe,
  } = useThemeStore();

  const [flyFromPosition, setFlyFromPosition] = useState<{ x: number; y: number } | undefined>();
  const [bgFlash, setBgFlash] = useState<'correct' | 'incorrect' | null>(null);
  const [visibleIndex, setVisibleIndex] = useState(currentSortingIndex);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const controls = useAnimation();

  useEffect(() => {
    if (!sortingRounds[visibleIndex]) return;

    controls.set({ x: 0, opacity: 0, scale: 0.9, y: 20 });
    controls.start({ scale: 1, opacity: 1, y: 0, transition: { duration: 0.3 } });
  }, [controls, visibleIndex, sortingRounds]);

  // Total cards left in the unswiped deck
  const cardsRemaining = Math.max(0, sortingRounds.length - visibleIndex);

  // The active card we're currently swiping
  const currentCard = sortingRounds[visibleIndex];

  // Extracted swipe logic for both drag and button clicks
  const triggerSwipe = async (isRightSwipe: boolean) => {
    if (!currentCard || isTransitioning) return;

    const guessType = isRightSwipe ? 'favorite' : 'least_favorite';
    const isCorrect = currentCard.type === guessType;
    const nextVisibleIndex = visibleIndex + 1;

    // Flash background instantly
    setBgFlash(isCorrect ? 'correct' : 'incorrect');
    setTimeout(() => setBgFlash(null), 600);
    setIsTransitioning(true);

    // Capture position for the ScorePanel flying animation BEFORE animating away
    setFlyFromPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });

    // Animate card off screen based on direction
    await controls.start({
      x: isRightSwipe ? window.innerWidth : -window.innerWidth,
      opacity: 0,
      transition: { duration: 0.3, ease: 'easeIn' },
    });

    handleThemeSwipe(guessType);
    setVisibleIndex(nextVisibleIndex);
    setIsTransitioning(false);
  };

  // Drag handlers
  const handleDragEnd = async (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const swipeThreshold = 50; // pixels to trigger swipe
    const velocityThreshold = 500; // velocity to trigger swipe

    const swipeOffset = info.offset.x;
    const swipeVelocity = info.velocity.x;

    if (Math.abs(swipeOffset) > swipeThreshold || Math.abs(swipeVelocity) > velocityThreshold) {
      const isRightSwipe = swipeOffset > 0;
      await triggerSwipe(isRightSwipe);
    } else {
      // Snap back to center
      controls.start({ x: 0, transition: { type: 'spring', stiffness: 300, damping: 20 } });
    }
  };

  if (!currentCard) return null; // Or rendering a transition out/loading

  return (
    <GameLayout
      centered
      className="p-4 md:p-8"
      top={
        <div className="flex justify-between items-start w-full relative z-[60]">
          <GameRoundIndicator
            major={2}
            majorTotal={2}
            minor={{
              current: currentSortingIndex + 1,
              total: sortingRounds.length,
              label: 'Theme',
            }}
          />
          <ScorePanel
            score={score + sortingScore}
            pointsEarned={sortingLastPoints}
            flyFromPosition={flyFromPosition}
            maxScore={200}
            showMaxScore={true}
            className="mb-0"
            size="lg"
            position="static"
            maxPositivePoint={SORTING_POINTS.CORRECT}
            maxNegativePoint={Math.abs(SORTING_POINTS.INCORRECT)}
            countSpeed={15}
            flyDuration={0.6}
            animationDelay={0}
          />
        </div>
      }
      middle={
        <div className="flex-1 w-full flex flex-col items-center justify-center relative overflow-hidden">
          {/* Full-screen Background Flash Overlays (Split to allow stable CSS fade-outs) */}
          <div
            className={cn(
              'fixed inset-0 pointer-events-none z-0 transition-opacity duration-700 ease-out',
              bgFlash === 'correct' ? 'opacity-100' : 'opacity-0',
            )}
            style={{
              background:
                'radial-gradient(circle at center, rgba(34, 197, 94, 0.2) 0%, rgba(34, 197, 94, 0.05) 50%, transparent 100%)',
            }}
          />
          <div
            className={cn(
              'fixed inset-0 pointer-events-none z-0 transition-opacity duration-700 ease-out',
              bgFlash === 'incorrect' ? 'opacity-100' : 'opacity-0',
            )}
            style={{
              background:
                'radial-gradient(circle at center, rgba(239, 68, 68, 0.2) 0%, rgba(239, 68, 68, 0.05) 50%, transparent 100%)',
            }}
          />

          <div className="text-center mb-8 sm:mb-12 z-10">
            <h2 className={`${GAME_SECTION_TITLE_CLASS} text-foreground`}>
              Which themes are your favorites?
            </h2>
          </div>

          <div className="relative w-full max-w-[320px] h-[400px] flex items-center justify-center">
            {/* Visual cues for direction (Desktop only) */}
            <div className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full pr-8 opacity-50 flex-col items-center text-destructive">
              <div className="w-12 h-12 rounded-full border-2 border-destructive flex items-center justify-center mb-2">
                <X className="w-6 h-6" />
              </div>
              <span className="text-sm uppercase tracking-widest font-bold">NO</span>
            </div>
            <div className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-full pl-8 opacity-50 flex-col items-center text-green-500">
              <div className="w-12 h-12 rounded-full border-2 border-green-500 flex items-center justify-center mb-2">
                <Check className="w-6 h-6" />
              </div>
              <span className="text-xs uppercase tracking-widest font-bold">Favorite</span>
            </div>

            {/* Background stack cards (decorative) */}
            {cardsRemaining > 1 && (
              <div className="absolute w-full h-full bg-card border border-border/50 rounded-2xl shadow-sm -z-10 mt-4 scale-[0.95]" />
            )}
            {cardsRemaining > 2 && (
              <div className="absolute w-full h-full bg-card/60 border border-border/30 rounded-2xl shadow-sm -z-20 mt-8 scale-[0.9]" />
            )}

            {/* Main Draggable Card */}
            <motion.div
              dragConstraints={{ left: 0, right: 0 }}
              onDragEnd={(e, info) => handleDragEnd(e, info)}
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={controls}
              className={cn(
                'absolute inset-0 bg-card border border-primary/20 rounded-2xl shadow-xl flex flex-col items-center justify-center p-8 text-center cursor-grab active:cursor-grabbing',
                'backdrop-blur-sm',
              )}
              whileTap={{ scale: 0.95, cursor: 'grabbing' }}
              drag={!isTransitioning ? 'x' : false}
              dragElastic={0.5}
            >
              <h3 className="text-2xl sm:text-3xl font-serif text-foreground leading-tight select-none pointer-events-none">
                {currentCard.theme}
              </h3>
            </motion.div>
          </div>

          {/* Mobile bottom swipe cues */}
          <div className="flex md:hidden w-full max-w-[320px] justify-between items-center px-4 mt-8 opacity-40 pointer-events-none select-none z-10 transition-opacity">
            <div className="flex items-center gap-1.5 text-destructive">
              <ChevronLeft className="w-5 h-5 flex-shrink-0" strokeWidth={3} />
              <span className="text-[10px] sm:text-xs uppercase tracking-widest font-bold">
                Not for you
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-green-500">
              <span className="text-[10px] sm:text-xs uppercase tracking-widest font-bold">
                Favorite
              </span>
              <ChevronRight className="w-5 h-5 flex-shrink-0" strokeWidth={3} />
            </div>
          </div>
        </div>
      }
    />
  );
}
