'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeftRight, Clock3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScorePanel } from '@/components/game/shared/ScorePanel';
import { GameRoundIndicator } from '@/components/game/shared/GameRoundIndicator';
import { mockDistributionGraphs } from '@/mocks/data';
import type { DurationDistributionGraph } from '@/lib/api';
import { cn } from '@/lib/utils';

interface DurationBatchRoundProps {
  onComplete: (score: number) => void;
  currentScore: number;
  roundNumber: number;
  totalRounds: number;
  distributionGraphs?: DurationDistributionGraph[];
}

type RoundPhase = 'question' | 'reveal_selected' | 'reveal_morph' | 'reveal_final';

function buildYAxisTicks(maxCount: number) {
  const safeMax = Math.max(maxCount, 1);
  return [safeMax, Math.max(Math.round(safeMax / 2), 1), 0];
}

function getBarColor(rating: number) {
  if (rating >= 4.0) {
    return 'bg-gradient-to-t from-primary/75 to-primary/10 border-t-2 border-primary/55';
  }

  if (rating >= 3.5) {
    return 'bg-gradient-to-t from-accent/75 to-accent/10 border-t-2 border-accent/55';
  }

  return 'bg-gradient-to-t from-muted-foreground/60 to-muted/10 border-t-2 border-muted-foreground/40';
}

function ChartGuides({ maxCount }: { maxCount: number }) {
  const ticks = buildYAxisTicks(maxCount);

  return (
    <>
      <div className="absolute left-0 top-3 bottom-8 w-8 sm:w-10 flex flex-col justify-between pointer-events-none z-10">
        {ticks.map((tick) => (
          <span
            key={tick}
            className="text-[9px] sm:text-[10px] font-medium tabular-nums text-muted-foreground/70"
          >
            {tick}
          </span>
        ))}
      </div>
      <div className="absolute left-8 sm:left-10 right-2 top-3 bottom-6 flex flex-col justify-between pointer-events-none opacity-25 z-0">
        <div className="w-full border-t border-dashed border-primary/45" />
        <div className="w-full border-t border-dashed border-primary/45" />
        <div className="w-full border-t border-dashed border-primary/45" />
      </div>
      <div className="absolute left-8 sm:left-10 right-2 bottom-6 border-b border-foreground/20 pointer-events-none z-0" />
    </>
  );
}

function ChartFrame({
  maxCount,
  children,
  className,
}: {
  maxCount: number;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex-1 h-full flex flex-col justify-end', className)}>
      <div className="relative h-full min-h-[10rem] sm:min-h-[12rem] flex items-end justify-between gap-2 sm:gap-4 rounded-xl bg-background/35 pl-8 pr-2 pt-3 sm:pl-10">
        <ChartGuides maxCount={maxCount} />
        {children}
      </div>
    </div>
  );
}

function RatingBadge({
  value,
  animatedRef,
}: {
  value?: number;
  animatedRef?: React.RefObject<HTMLSpanElement | null>;
}) {
  return (
    <span className="text-[10px] sm:text-[11px] font-bold text-accent flex items-center gap-0.5 tabular-nums">
      <span aria-hidden="true">&#9733;</span>
      {animatedRef ? <span ref={animatedRef} /> : value?.toFixed(1)}
    </span>
  );
}

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

  useEffect(() => {
    if (ref.current) {
      ref.current.textContent =
        format === 'int' ? String(Math.round(targetValue)) : targetValue.toFixed(1);
    }
  }, [format, targetValue]);

  return ref;
}

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
  const heightPercent = Math.max(Math.pow(watchCount / Math.max(maxCount, 1), 1.5) * 80, 5); // Capped at 80% for headroom

  return (
    <div className="flex-1 h-full min-h-0 flex flex-col items-center justify-end gap-1 sm:gap-2 group z-10 self-end">
      <div className="flex flex-col items-center mb-1 shrink-0 text-center z-20">
        <span
          ref={countRef}
          className="text-xs sm:text-sm font-bold text-foreground leading-tight tabular-nums"
        />
        <span className="text-[9px] sm:text-[10px] uppercase font-bold text-muted-foreground/70 tracking-tight leading-none mb-1">
          movies
        </span>
        <RatingBadge animatedRef={ratingRef} />
      </div>

      <motion.div
        animate={{ height: `${heightPercent}%` }}
        initial={false}
        transition={{
          duration: isMorphing ? 2 : 0.8,
          ease: isMorphing ? 'easeInOut' : 'easeOut',
          delay: isMorphing ? index * 0.15 : 0,
        }}
        className={cn(
          'w-[85%] sm:w-[80%] max-w-[4rem] rounded-t-xl transition-colors duration-1000 mx-auto shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]',
          getBarColor(avgRating),
        )}
      />

      <span className="text-[10px] sm:text-xs font-bold text-foreground/80 tracking-tight text-center h-6 flex items-center shrink-0 w-full justify-center">
        <span className="inline-flex items-center gap-1">
          <Clock3 className="h-3 w-3 text-muted-foreground/65" strokeWidth={2} />
          <span>{label}</span>
        </span>
      </span>
    </div>
  );
}

export function DurationBatchRound({
  onComplete,
  currentScore,
  roundNumber,
  totalRounds,
  distributionGraphs,
}: DurationBatchRoundProps) {
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
    setPhase('reveal_selected');

    setTimeout(
      () => {
        if (isActual) {
          setPhase('reveal_final');
          setTimeout(() => {
            setPointsEarned(earned);
            setLocalTotalScore(currentScore + earned);
          }, 600);
        } else {
          setPhase('reveal_morph');
          setTimeout(() => {
            setPhase('reveal_final');
          }, 3000);
        }
      },
      isActual ? 1800 : 2500,
    );
  };

  const selectedGraph = graphs.find((g) => g.id === selectedGraphId);
  const actualGraph = graphs.find((g) => g.isActual);

  const getDisplayBatches = useCallback(() => {
    if (phase === 'question' || !selectedGraph) return null;
    if (phase === 'reveal_selected') return selectedGraph.batches;
    if (phase === 'reveal_morph' || phase === 'reveal_final') {
      return actualGraph?.batches ?? selectedGraph.batches;
    }
    return selectedGraph.batches;
  }, [phase, selectedGraph, actualGraph]);

  const displayBatches = getDisplayBatches();
  const revealBatches =
    selectedGraph && displayBatches
      ? selectedGraph.batches.map((selectedBatch, index) => ({
          key: `reveal-bar-${index}`,
          label: displayBatches[index]?.label ?? selectedBatch.label,
          watchCount: displayBatches[index]?.watchCount ?? selectedBatch.watchCount,
          avgRating: displayBatches[index]?.avgRating ?? selectedBatch.avgRating,
        }))
      : null;
  const isReveal = phase !== 'question';
  const isMorphing = phase === 'reveal_morph';
  const isFinal = phase === 'reveal_final';

  let gridContainerClasses = 'w-full gap-4 sm:gap-6 lg:gap-8 pb-4 md:pb-10 flex-1 min-h-0 ';
  if (!isReveal) {
    gridContainerClasses +=
      'flex overflow-x-auto snap-x snap-mandatory md:grid md:grid-cols-2 no-scrollbar items-center';
  } else {
    gridContainerClasses += 'flex flex-col md:grid md:grid-cols-1 max-w-3xl mx-auto justify-center';
  }

  const getTagContent = () => {
    if (phase === 'reveal_selected') {
      if (isCorrect) {
        return { text: 'Your Pick', color: 'bg-accent text-accent-foreground' };
      }

      return { text: 'Your Pick', color: 'bg-primary/80 text-primary-foreground' };
    }

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
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-[11px] sm:text-xs">
                  <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/80 px-3 py-1.5 text-muted-foreground">
                    <span className="h-2.5 w-2.5 rounded-full bg-primary/80" />
                    High rated
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/80 px-3 py-1.5 text-muted-foreground">
                    <span className="h-2.5 w-2.5 rounded-full bg-accent/80" />
                    Mid rated
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/80 px-3 py-1.5 text-muted-foreground">
                    <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/55" />
                    Lower rated
                  </span>
                </div>
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
                        'shrink-0 w-[85vw] md:w-auto h-[90%] md:h-[95%] snap-center cursor-pointer hover:border-primary/50 hover:bg-primary/[0.04] hover:-translate-y-1 hover:shadow-xl border-border/50',
                        isSelected && 'border-primary ring-2 ring-primary/20',
                      )}
                      onClick={() => handleSelectGraph(graph.id)}
                    >
                      <div className="p-4 sm:p-6 flex-1 h-full">
                        <ChartFrame maxCount={maxCountInGraph}>
                          {graph.batches.map((batch) => {
                            const heightPercent = Math.max(
                              Math.pow(batch.watchCount / maxCountInGraph, 1.5) * 100,
                              5,
                            );

                            return (
                              <div
                                key={batch.id}
                                className="flex-1 h-full min-h-0 flex flex-col items-center justify-end gap-1 sm:gap-2 group z-10 self-end"
                              >
                                <div className="flex flex-col items-center mb-1 shrink-0 text-center z-20">
                                  <span className="text-xs sm:text-sm font-bold text-foreground leading-tight tabular-nums">
                                    {batch.watchCount}
                                  </span>
                                  <span className="text-[9px] sm:text-[10px] uppercase font-bold text-muted-foreground/70 tracking-tight leading-none mb-1">
                                    movies
                                  </span>
                                  <RatingBadge value={batch.avgRating} />
                                </div>

                                <motion.div
                                  initial={{ height: '0%' }}
                                  animate={{ height: `${heightPercent}%` }}
                                  transition={{ duration: 0.8, ease: 'easeOut' }}
                                  className={cn(
                                    'w-[85%] sm:w-[80%] max-w-[4rem] rounded-t-xl mx-auto shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]',
                                    getBarColor(batch.avgRating),
                                  )}
                                />

                                <span className="text-[10px] sm:text-xs font-bold text-foreground/80 tracking-tight text-center h-6 flex items-center shrink-0 w-full justify-center">
                                  <span className="inline-flex items-center gap-1">
                                    <Clock3
                                      className="h-3 w-3 text-muted-foreground/65"
                                      strokeWidth={2}
                                    />
                                    <span>{batch.label}</span>
                                  </span>
                                </span>
                              </div>
                            );
                          })}
                        </ChartFrame>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          )}

          {isReveal && revealBatches && (
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

                <div className="p-4 sm:p-6 flex-1 h-full flex flex-col justify-end mt-4">
                  <ChartFrame maxCount={Math.max(...revealBatches.map((b) => b.watchCount))}>
                    {revealBatches.map((batch, index) => {
                      const maxCount = Math.max(...revealBatches.map((b) => b.watchCount));

                      return (
                        <AnimatedBar
                          key={batch.key}
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
                  </ChartFrame>
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>

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
                className="w-full h-12 md:h-14 px-8 md:px-12 rounded-xl text-base md:text-lg font-bold tracking-widest uppercase shadow-lg hover:shadow-xl hover:-translate-y-0.5 md:hover:-translate-y-1 transform duration-200"
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
                className="w-full h-12 md:h-14 px-8 md:px-12 rounded-xl text-base md:text-lg font-bold tracking-widest uppercase shadow-lg hover:shadow-xl hover:-translate-y-0.5 md:hover:-translate-y-1 transform duration-200"
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
