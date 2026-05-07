'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ScorePanel } from '@/components/game/shared/ScorePanel';
import { GameRoundIndicator } from '@/components/game/shared/GameRoundIndicator';
import { ChevronDown } from 'lucide-react';
import Image from 'next/image';
import type { ActorMockData } from '@/mocks/data';
import { ActorResultAccordion } from './ActorResultAccordion';
import { cn } from '@/lib/utils';

interface FavoriteActorRoundProps {
  onComplete: (score: number) => void;
  currentScore: number;
  roundNumber: number;
  totalRounds: number;
  topActors: ActorMockData[];
  actorWaitlist: ActorMockData[];
}

type RoundPhase = 'question' | 'feedback' | 'reveal';

export function FavoriteActorRound({
  onComplete,
  currentScore,
  roundNumber,
  totalRounds,
  topActors,
  actorWaitlist,
}: FavoriteActorRoundProps) {
  const [phase, setPhase] = useState<RoundPhase>('question');
  const [selectedActorId, setSelectedActorId] = useState<string | null>(null);
  const [showActualFavorite, setShowActualFavorite] = useState(false);

  // Score tracking
  const [pointsEarned, setPointsEarned] = useState<number | null>(null);
  const [localTotalScore, setLocalTotalScore] = useState(currentScore);
  const [flyPosition, setFlyPosition] = useState<{ x: number; y: number } | undefined>();
  // Scroll tracking state resets automatically when phase changes due to key on container
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(false);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      setHasScrolled(scrollTop > 8);
      setIsAtBottom(scrollTop + clientHeight >= scrollHeight - 20);
    }
  };

  const handleSelectActor = (actorId: string, event: React.MouseEvent) => {
    setSelectedActorId(actorId);

    // Store click position for standard fly animation if needed, though we might start from center
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    setFlyPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });

    const isActual = topActors[0].id === actorId;
    const earned = isActual ? 30 : 0; // Points only if correct

    setPhase('feedback');
    setShowActualFavorite(true);

    if (isActual) {
      setPointsEarned(earned);
      setLocalTotalScore(currentScore + earned);
    }
  };

  const actualFavoriteId = topActors[0].id;

  return (
    <div className="w-full h-[100dvh] flex flex-col justify-between overflow-hidden relative font-sans">
      {/* Header with Round Indicator and Score */}
      <div className="w-full max-w-7xl mx-auto flex justify-between items-start p-4 md:p-8 relative z-[60] shrink-0">
        <GameRoundIndicator major={roundNumber} majorTotal={totalRounds} />
        <ScorePanel
          score={localTotalScore}
          pointsEarned={pointsEarned}
          flyFromPosition={flyPosition}
          maxScore={100}
          size="lg"
          position="static"
          showMaxScore={true}
        />
      </div>

      <AnimatePresence mode="wait">
        {(phase === 'question' || phase === 'feedback') && (
          <motion.div
            key="question"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex-1 flex flex-col items-center justify-center p-4 md:p-6 max-w-2xl mx-auto w-full min-h-0"
          >
            <h2 className="text-3xl md:text-5xl font-serif text-center text-primary leading-tight shrink-0 mb-4 sm:mb-6 md:mb-12">
              Which actor have you watched the most?
            </h2>
            <div className="w-full flex items-center justify-center">
              <div className="w-full grid grid-cols-4 gap-3 sm:gap-4 md:gap-6 justify-center items-center max-w-lg md:max-w-4xl mx-auto px-1 sm:px-0">
                {actorWaitlist.map((actor, idx) => {
                  const isSelected = selectedActorId === actor.id;
                  const isActual = actualFavoriteId === actor.id;
                  const isFeedback = phase === 'feedback';

                  // Deterministic subtle rotation for "photos on a desk" feel
                  const rotations = [-2.2, 1.5, -1.0, 2.8, -1.8, 0.8, -2.5, 1.2];
                  const cardRotation = rotations[idx % rotations.length];

                  // Determine border/bg color during feedback
                  let feedbackClasses = '';
                  let feedbackBorderColor = 'border-transparent';
                  if (isFeedback) {
                    if (isSelected && !isActual) {
                      feedbackBorderColor = 'border-destructive/60 border-2';
                      feedbackClasses = 'bg-destructive/5 z-10';
                    }

                    if (showActualFavorite) {
                      if (isActual) {
                        feedbackBorderColor = 'border-primary border-[3px]';
                        feedbackClasses = 'bg-primary/10 ring-4 ring-primary/10 z-20';
                      } else if (isSelected) {
                        feedbackBorderColor = 'border-destructive/40 border-2';
                        feedbackClasses = 'bg-destructive/5 opacity-60 grayscale-[40%]';
                      } else {
                        feedbackBorderColor = 'border-border/20';
                        feedbackClasses = 'opacity-30 grayscale';
                      }
                    } else if (isFeedback && !isSelected) {
                      feedbackBorderColor = 'border-border/20';
                      feedbackClasses = 'opacity-50 grayscale transition-all duration-1000';
                    }
                  }

                  return (
                    <motion.div
                      key={actor.id}
                      initial={{ opacity: 0, scale: 0.9, rotate: cardRotation * 2 }}
                      animate={{
                        opacity: 1,
                        scale: isFeedback && showActualFavorite && isActual ? 1.04 : 1,
                        rotate: isFeedback ? 0 : cardRotation,
                      }}
                      whileHover={
                        !isFeedback
                          ? {
                              scale: 1.06,
                              rotate: 0,
                              y: -4,
                              transition: { type: 'spring', stiffness: 400, damping: 20 },
                            }
                          : {}
                      }
                      whileTap={!isFeedback ? { scale: 0.97 } : {}}
                      transition={{
                        delay: idx * 0.07,
                        type: 'spring',
                        stiffness: 300,
                        damping: 22,
                      }}
                      onClick={(e) => !isFeedback && handleSelectActor(actor.id, e)}
                      className={cn(
                        'cursor-pointer relative flex flex-col items-center overflow-hidden rounded-lg bg-card transition-all duration-500 w-full min-w-[75px] max-w-[140px] md:max-w-[180px] mx-auto',
                        'shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)]',
                        feedbackBorderColor || 'border border-primary/10',
                        feedbackClasses,
                      )}
                    >
                      {/* Photo area with vintage vignette */}
                      <div className="w-full aspect-[3/4] relative bg-muted shrink-0 overflow-hidden">
                        {actor.photoUrl ? (
                          <>
                            <Image
                              src={actor.photoUrl}
                              alt={actor.name}
                              fill
                              className="object-cover"
                              sizes="(max-width: 768px) 50vw, 25vw"
                            />
                            {/* Warm vignette overlay — analog photo feel */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-black/10 pointer-events-none" />
                            <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(0,0,0,0.15)] pointer-events-none rounded-t-lg" />
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                            No Photo
                          </div>
                        )}
                      </div>
                      {/* Name area — Polaroid-style wider bottom */}
                      <div className="w-full p-2 sm:p-2.5 lg:py-4 text-center bg-card flex items-center justify-center flex-1 border-t border-primary/5">
                        <span className="text-[9px] sm:text-xs md:text-base font-serif font-semibold leading-tight line-clamp-2 text-foreground/85 tracking-tight">
                          {actor.name}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Continue Button for Feedback phase */}
            {phase === 'feedback' && showActualFavorite && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.6, type: 'spring', stiffness: 400, damping: 25 }}
                className="absolute bottom-6 left-0 right-0 flex justify-center w-full px-4 sm:px-6 z-50 pointer-events-none"
              >
                <div className="w-full max-w-sm pointer-events-auto">
                  <Button
                    className="w-full h-12 md:h-14 px-8 md:px-12 rounded-xl text-base md:text-lg font-bold tracking-widest uppercase shadow-lg hover:shadow-xl hover:-translate-y-0.5 md:hover:-translate-y-1 transform duration-200"
                    onClick={() => setPhase('reveal')}
                  >
                    See Top 8
                  </Button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {phase === 'reveal' && (
          <motion.div
            key="reveal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex flex-col pt-6 md:pt-8 pb-4 px-3 sm:px-6 md:px-8 max-w-4xl xl:max-w-5xl mx-auto w-full h-full overflow-hidden"
          >
            {/* Fixed Header */}
            <div className="text-center mb-3 md:mb-6 shrink-0">
              <h2 className="text-2xl md:text-3xl font-serif text-primary">Your Top 8 Actors</h2>
              <p className="text-muted-foreground mt-1 md:mt-2 text-sm md:text-base">
                Based on your watch history
              </p>
            </div>

            {/* Scrollable list — hidden scrollbar, fade hint at bottom */}
            <div className="flex-1 min-h-0 relative w-full">
              <div
                key={phase}
                ref={scrollRef}
                onScroll={handleScroll}
                className="h-full flex flex-col gap-2 md:gap-3 w-full pb-8 overflow-y-auto no-scrollbar"
              >
                {topActors.map((actor, index) => {
                  const isSelected = selectedActorId === actor.id;

                  return (
                    <ActorResultAccordion
                      key={actor.id}
                      actor={actor}
                      index={index}
                      isSelected={isSelected}
                      delay={index * 0.1}
                    />
                  );
                })}
              </div>

              {/* Scroll Hint Component — inspired by Taste Gap */}
              <motion.div
                initial={false}
                animate={
                  hasScrolled || isAtBottom
                    ? { opacity: 0, y: 8, scale: 0.96 }
                    : { opacity: 1, y: 0, scale: 1 }
                }
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="absolute bottom-10 left-1/2 z-20 -translate-x-1/2 pointer-events-none"
              >
                <div className="flex flex-col items-center gap-2">
                  <motion.div
                    animate={{ y: [0, 3, 0] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                    className="h-1.5 w-12 rounded-full bg-foreground/18 shadow-[0_1px_4px_rgba(45,45,45,0.08)]"
                  />
                  <motion.div
                    animate={{ y: [0, 4, 0] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                    className="inline-flex items-center gap-2.5 rounded-full border border-foreground/14 bg-background/96 px-4 py-2 text-[10px] md:text-xs font-bold uppercase tracking-[0.24em] text-foreground/75 shadow-[0_10px_28px_rgba(45,45,45,0.12)] backdrop-blur-md"
                  >
                    <span>Scroll</span>
                    <ChevronDown className="h-4 w-4 md:h-4.5 md:w-4.5" strokeWidth={2.4} />
                  </motion.div>
                </div>
              </motion.div>

              {/* Bottom fade gradient to hint scrollability */}
              <div
                className={cn(
                  'absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent pointer-events-none z-10 transition-opacity duration-500',
                  isAtBottom ? 'opacity-0' : 'opacity-100',
                )}
              />
            </div>

            {/* Fixed Bottom Button */}
            <div className="shrink-0 w-full flex justify-center pt-4 md:pt-6 pb-2 md:pb-6 relative z-10 bg-background/80 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
                className="w-full max-w-sm"
              >
                <Button
                  className="w-full h-12 md:h-14 px-8 md:px-12 rounded-xl text-base md:text-lg font-bold tracking-widest uppercase shadow-lg hover:shadow-xl hover:-translate-y-0.5 md:hover:-translate-y-1 transform duration-200"
                  onClick={() => onComplete(pointsEarned || 0)}
                >
                  Continue
                </Button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
