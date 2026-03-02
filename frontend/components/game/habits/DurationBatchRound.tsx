'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ScorePanel } from '@/components/game/shared/ScorePanel';
import { GameRoundIndicator } from '@/components/game/shared/GameRoundIndicator';
import { mockDistributionGraphs } from '@/mocks/data';
import type { DurationDistributionGraph } from '@/lib/api';
import { cn } from '@/lib/utils';
import { ArrowLeftRight } from 'lucide-react';

interface DurationBatchRoundProps {
  onComplete: (score: number) => void;
  currentScore: number;
  roundNumber: number;
  totalRounds: number;
  distributionGraphs?: DurationDistributionGraph[];
}

type RoundPhase = 'question' | 'reveal_selected' | 'reveal_morph' | 'reveal_final';

// ============================================================================
// Animated Value Hook — smoothly counts between numbers using rAF (no setState)
// ============================================================================
function useAnimatedValue(
  targetValue: number,
  format: 'int' | 'float',
  duration: number = 1500,
  enabled: boolean = true,
) {
  const ref = useRef<HTMLSpanElement>(null);
  const currentRef = useRef(targetValue);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled || !ref.current) {
      currentRef.current = targetValue;
      if (ref.current) {
        ref.current.textContent =
          format === 'int' ? String(Math.round(targetValue)) : targetValue.toFixed(1);
      }
      return;
    }

    const startValue = currentRef.current;
    const diff = targetValue - startValue;
    if (Math.abs(diff) < 0.01) return;

    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeInOut cubic
      const eased =
        progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      const current = startValue + diff * eased;
      currentRef.current = current;

      if (ref.current) {
        ref.current.textContent =
          format === 'int' ? String(Math.round(current)) : current.toFixed(1);
      }

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    };

    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [targetValue, duration, enabled, format]);

  // Set initial value
  useEffect(() => {
    if (ref.current) {
      ref.current.textContent =
        format === 'int' ? String(Math.round(targetValue)) : targetValue.toFixed(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return ref;
}

// ============================================================================
// Single Bar Component with internal animated values
// ============================================================================
interface AnimatedBarProps {
  label: string;
  watchCount: number;
  avgRating: number;
  maxCount: number;
  isMorphing: boolean;
  isFinal: boolean;
  index: number;
}

function AnimatedBar({
  label,
  watchCount,
  avgRating,
  maxCount,
  isMorphing,
  isFinal,
  index,
}: AnimatedBarProps) {
  const countRef = useAnimatedValue(watchCount, 'int', 2000, isMorphing || isFinal);
  const ratingRef = useAnimatedValue(avgRating, 'float', 2000, isMorphing || isFinal);

  // Power scale (^1.5) exaggerates differences so similar values look visually distinct
  const heightPercent = Math.max(Math.pow(watchCount / Math.max(maxCount, 1), 1.5) * 100, 5);

  const getBarColor = (rating: number) => {
    if (rating >= 4.0)
      return 'bg-gradient-to-t from-primary/70 to-primary/10 border-t-2 border-primary/50';
    if (rating >= 3.5)
      return 'bg-gradient-to-t from-accent/70 to-accent/10 border-t-2 border-accent/50';
    return 'bg-gradient-to-t from-muted-foreground/60 to-muted/10 border-t-2 border-muted-foreground/40';
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-end h-full gap-1 sm:gap-2 group z-10">
      {/* Labels */}
      <div className="flex flex-col items-center mb-1 shrink-0 text-center z-20">
        <span
          ref={countRef}
          className="text-xs sm:text-sm font-bold text-foreground leading-tight tabular-nums"
        />
        <span className="text-[9px] sm:text-[10px] uppercase font-bold text-muted-foreground/70 tracking-tight leading-none mb-1">
          movies
        </span>
        <span className="text-[10px] sm:text-[11px] font-bold text-accent flex items-center gap-0.5 tabular-nums">
          ★ <span ref={ratingRef} />
        </span>
      </div>

      {/* The Bar — height driven by framer-motion animate */}
      <motion.div
        animate={{ height: `${heightPercent}%` }}
        initial={{ height: '0%' }}
        transition={{
          duration: isMorphing ? 2 : 0.8,
          ease: isMorphing ? 'easeInOut' : 'easeOut',
          delay: isMorphing ? index * 0.15 : 0,
        }}
        className={cn(
          'w-[85%] sm:w-[80%] max-w-[4rem] rounded-t-md transition-colors duration-1000 mx-auto',
          getBarColor(avgRating),
        )}
      />

      {/* X-Axis Label */}
      <span className="text-[10px] sm:text-xs font-bold text-foreground/80 tracking-tight text-center h-6 flex items-center shrink-0 w-full justify-center">
        {label}
      </span>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================
export function DurationBatchRound({
  onComplete,
  currentScore,
  roundNumber,
  totalRounds,
  distributionGraphs,
}: DurationBatchRoundProps) {
  // Use real data if available, otherwise fall back to mocks
  const graphs =
    distributionGraphs && distributionGraphs.length > 0
      ? distributionGraphs
      : mockDistributionGraphs;

  const [phase, setPhase] = useState<RoundPhase>('question');
  const [selectedGraphId, setSelectedGraphId] = useState<string | null>(null);

  const [pointsEarned, setPointsEarned] = useState<number | null>(null);
  const [localTotalScore, setLocalTotalScore] = useState(currentScore);
  const [flyPosition, setFlyPosition] = useState<{ x: number; y: number } | undefined>();
  const [isCorrect, setIsCorrect] = useState(false);

  const handleSelectGraph = (graphId: string) => {
    if (phase !== 'question') return;
    setSelectedGraphId(graphId);
  };

  const handleSubmit = (event: React.MouseEvent) => {
    if (!selectedGraphId || phase !== 'question') return;

    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    setFlyPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });

    const isActual = graphs.find((g) => g.id === selectedGraphId)?.isActual ?? false;
    const earned = isActual ? 30 : 0;
    setIsCorrect(isActual);

    // Phase 1: Show selected graph alone
    setPhase('reveal_selected');

    // Phase 2: If wrong, morph bars to actual values; if correct, go straight to final
    setTimeout(
      () => {
        if (isActual) {
          setPhase('reveal_final');
          // Points fly when True Distribution appears
          setTimeout(() => {
            setPointsEarned(earned);
            setLocalTotalScore(currentScore + earned);
          }, 600);
        } else {
          setPhase('reveal_morph');
          // Phase 3: After morph completes (~2.5s), settle into final
          setTimeout(() => {
            setPhase('reveal_final');
          }, 3000);
        }
      },
      isActual ? 1800 : 2500,
    );
  };

  // Resolve data: which batches to render at each phase
  const selectedGraph = graphs.find((g) => g.id === selectedGraphId);
  const actualGraph = graphs.find((g) => g.isActual);

  // The "display batches" drive the bar chart — this is the key morphing mechanism
  const getDisplayBatches = useCallback(() => {
    if (phase === 'question' || !selectedGraph) return null; // Not rendering the single chart yet
    if (phase === 'reveal_selected') return selectedGraph.batches; // Show their pick
    if (phase === 'reveal_morph' || phase === 'reveal_final')
      return actualGraph?.batches ?? selectedGraph.batches; // Morph to actual
    return selectedGraph.batches;
  }, [phase, selectedGraph, actualGraph]);

  const displayBatches = getDisplayBatches();
  const isReveal = phase !== 'question';
  const isMorphing = phase === 'reveal_morph';
  const isFinal = phase === 'reveal_final';

  // Grid classes
  let gridContainerClasses = 'w-full gap-4 sm:gap-6 lg:gap-8 pb-4 md:pb-10 flex-1 min-h-0 ';
  if (!isReveal) {
    gridContainerClasses +=
      'flex overflow-x-auto snap-x snap-mandatory md:grid md:grid-cols-2 no-scrollbar items-center';
  } else {
    gridContainerClasses += 'flex flex-col md:grid md:grid-cols-1 max-w-3xl mx-auto justify-center';
  }

  // Resolve the tag text for the reveal chart
  const getTagContent = () => {
    if (phase === 'reveal_selected') {
      if (isCorrect) return { text: 'Your Pick ✓', color: 'bg-accent text-accent-foreground' };
      return { text: 'Your Pick', color: 'bg-primary/80 text-primary-foreground' };
    }
    // During morph: no tag — let the bars speak
    if (phase === 'reveal_morph') return null;
    if (phase === 'reveal_final') {
      return { text: 'True Distribution', color: 'bg-accent text-accent-foreground' };
    }
    return null;
  };

  return (
    <div className="w-full h-[100dvh] flex flex-col justify-between overflow-hidden relative font-sans">
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

      <div className="flex-1 w-full min-h-0">
        <div className="h-full flex flex-col items-center justify-center pt-2 pb-4 md:py-8 px-4 sm:px-6 md:px-8 max-w-6xl mx-auto w-full">
          <AnimatePresence mode="popLayout">
            {phase === 'question' && (
              <motion.div
                key="question-text"
                initial={{ opacity: 0, y: -20, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -20, height: 0, overflow: 'hidden', padding: 0 }}
                transition={{ duration: 0.4 }}
                className="text-center mb-6 md:mb-10 w-full shrink-0"
              >
                <h2 className="text-3xl md:text-5xl font-serif text-primary leading-tight">
                  Which distribution of movie durations looks like you?
                </h2>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="md:hidden flex items-center justify-center text-xs text-muted-foreground mt-4 animate-pulse"
                >
                  <ArrowLeftRight className="w-4 h-4 mr-2" />
                  Swipe to explore options
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ============================================================ */}
          {/* QUESTION PHASE: Multiple selectable graphs */}
          {/* ============================================================ */}
          {phase === 'question' && (
            <motion.div layout className={gridContainerClasses}>
              <AnimatePresence mode="popLayout">
                {graphs.map((graph, idx) => {
                  const isSelected = selectedGraphId === graph.id;
                  const maxCountInGraph = Math.max(...graph.batches.map((b) => b.watchCount));

                  return (
                    <motion.div
                      key={graph.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.5 } }}
                      transition={{ delay: idx * 0.1 }}
                      className={cn(
                        'relative bg-card rounded-2xl border transition-all duration-300 overflow-hidden flex flex-col',
                        'shrink-0 w-[85vw] md:w-auto h-[90%] md:h-[95%] snap-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 hover:-translate-y-1 hover:shadow-xl border-border/50',
                        isSelected && 'border-primary ring-2 ring-primary/20',
                      )}
                      onClick={() => handleSelectGraph(graph.id)}
                    >
                      <div className="p-4 sm:p-6 flex-1 flex flex-col justify-end mt-4">
                        <div className="flex flex-1 min-h-[10rem] sm:min-h-[12rem] items-end gap-2 sm:gap-4 justify-between relative px-2 mt-4 sm:mt-6">
                          {/* Y-Axis guide lines */}
                          <div className="absolute inset-x-2 inset-y-0 flex flex-col justify-between pointer-events-none opacity-20 z-0 py-2 pb-8">
                            <div className="w-full border-t border-dashed border-primary/50" />
                            <div className="w-full border-t border-dashed border-primary/50" />
                            <div className="w-full border-t border-dashed border-primary/50" />
                          </div>
                          {/* Baseline */}
                          <div className="absolute inset-x-2 bottom-6 border-b border-foreground/20 pointer-events-none z-0" />

                          {graph.batches.map((batch) => {
                            const heightPercent = Math.max(
                              Math.pow(batch.watchCount / maxCountInGraph, 1.5) * 100,
                              5,
                            );
                            const getBarColor = (rating: number) => {
                              if (rating >= 4.0)
                                return 'bg-gradient-to-t from-primary/70 to-primary/10 border-t-2 border-primary/50';
                              if (rating >= 3.5)
                                return 'bg-gradient-to-t from-accent/70 to-accent/10 border-t-2 border-accent/50';
                              return 'bg-gradient-to-t from-muted-foreground/60 to-muted/10 border-t-2 border-muted-foreground/40';
                            };

                            return (
                              <div
                                key={batch.id}
                                className="flex-1 flex flex-col items-center justify-end h-full gap-1 sm:gap-2 group z-10"
                              >
                                <div className="flex flex-col items-center mb-1 shrink-0 text-center z-20">
                                  <span className="text-xs sm:text-sm font-bold text-foreground leading-tight">
                                    {batch.watchCount}
                                  </span>
                                  <span className="text-[9px] sm:text-[10px] uppercase font-bold text-muted-foreground/70 tracking-tight leading-none mb-1">
                                    movies
                                  </span>
                                  <span className="text-[10px] sm:text-[11px] font-bold text-accent flex items-center gap-0.5">
                                    ★ {batch.avgRating.toFixed(1)}
                                  </span>
                                </div>
                                <motion.div
                                  initial={{ height: '0%' }}
                                  animate={{ height: `${heightPercent}%` }}
                                  transition={{ duration: 0.8, ease: 'easeOut' }}
                                  className={cn(
                                    'w-[85%] sm:w-[80%] max-w-[4rem] rounded-t-md mx-auto',
                                    getBarColor(batch.avgRating),
                                  )}
                                />
                                <span className="text-[10px] sm:text-xs font-bold text-foreground/80 tracking-tight text-center h-6 flex items-center shrink-0 w-full justify-center">
                                  {batch.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ============================================================ */}
          {/* REVEAL PHASES: Single persistent graph with morphing bars    */}
          {/* ============================================================ */}
          {isReveal && displayBatches && (
            <AnimatePresence mode="wait">
              <motion.div
                key="reveal-chart"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  type: 'spring',
                  stiffness: 60,
                  damping: 20,
                }}
                className={cn(
                  'w-full max-w-3xl mx-auto flex-1 flex flex-col relative bg-card rounded-2xl border overflow-hidden transition-all duration-1000',
                  phase === 'reveal_selected' &&
                    !isCorrect &&
                    'border-primary/50 ring-1 ring-primary/20',
                  phase === 'reveal_selected' &&
                    isCorrect &&
                    'border-accent ring-2 ring-accent/30 shadow-lg shadow-accent/10',
                  (phase === 'reveal_morph' || phase === 'reveal_final') &&
                    'border-accent ring-2 ring-accent border-2 shadow-xl shadow-accent/10',
                )}
              >
                {/* Tag badge */}
                {getTagContent() && (
                  <div className="absolute top-0 right-0 left-0 bg-transparent flex justify-center z-10 pointer-events-none">
                    <motion.div
                      key={getTagContent()!.text}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.8, delay: phase === 'reveal_final' ? 0.5 : 0 }}
                      className={cn(
                        'text-xs font-bold uppercase tracking-widest px-4 py-1 rounded-b-lg shadow-sm',
                        getTagContent()!.color,
                      )}
                    >
                      {getTagContent()!.text}
                    </motion.div>
                  </div>
                )}

                <div className="p-4 sm:p-6 flex-1 flex flex-col justify-end mt-4">
                  <div className="flex flex-1 min-h-[10rem] sm:min-h-[12rem] items-end gap-2 sm:gap-4 justify-between relative px-2 mt-4 sm:mt-6">
                    {/* Y-Axis guide lines */}
                    <div className="absolute inset-x-2 inset-y-0 flex flex-col justify-between pointer-events-none opacity-20 z-0 py-2 pb-8">
                      <div className="w-full border-t border-dashed border-primary/50" />
                      <div className="w-full border-t border-dashed border-primary/50" />
                      <div className="w-full border-t border-dashed border-primary/50" />
                    </div>
                    {/* Baseline */}
                    <div className="absolute inset-x-2 bottom-6 border-b border-foreground/20 pointer-events-none z-0" />

                    {/* THE 4 PERSISTENT BARS — same DOM elements, values morph */}
                    {displayBatches.map((batch, index) => {
                      const maxCount = Math.max(...displayBatches.map((b) => b.watchCount));
                      return (
                        <AnimatedBar
                          key={batch.id}
                          label={batch.label}
                          watchCount={batch.watchCount}
                          avgRating={batch.avgRating}
                          maxCount={maxCount}
                          isMorphing={isMorphing}
                          isFinal={isFinal}
                          index={index}
                        />
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Bottom Buttons — fixed-height container, always reserves space */}
      <div className="shrink-0 w-full flex justify-center items-center px-6 h-[5.5rem] md:h-[6.5rem] z-50">
        <AnimatePresence mode="wait">
          {phase === 'question' && selectedGraphId && (
            <motion.div
              key="submit-btn"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20, transition: { duration: 0.2 } }}
              className="w-full max-w-sm"
            >
              <Button
                size="lg"
                className="w-full py-6 text-lg rounded-2xl border-2 border-primary/20 hover:border-primary/50 transition-colors shadow-2xl"
                onClick={handleSubmit}
              >
                Submit
              </Button>
            </motion.div>
          )}

          {phase === 'reveal_final' && (
            <motion.div
              key="continue-btn"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="w-full max-w-sm"
            >
              <Button
                size="lg"
                className="w-full py-6 text-lg rounded-2xl shadow-xl"
                onClick={() => onComplete(pointsEarned || 0)}
              >
                Continue
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
