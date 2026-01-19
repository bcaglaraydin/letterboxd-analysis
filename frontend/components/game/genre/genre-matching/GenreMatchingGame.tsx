'use client';

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { Lock, ArrowRight, RotateCcw, Sparkles, X } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { GameLayout } from '@/components/game/shared/GameLayout';
import { GameRoundIndicator } from '@/components/game/shared/GameRoundIndicator';
import { ScorePanel } from '@/components/game/shared/ScorePanel';
import { Button } from '@/components/ui/button';

import { MOCK_FILMS, MOCK_GENRES, FILMS_PER_GAME, ANIMATION_TIMING } from './constants';
import { Genre, GenreTier, GamePhase, TIER_POINTS, TIER_INFO, ChipDisplayState } from './types';
import { GenreChipAnimated } from './GenreChipAnimated';

/**
 * GenreMatchingGame - Redesigned with Flying Animation Mechanics
 * Layout: Available genres LEFT, Movie card + collected zone RIGHT
 * Mobile: Stacked with genres first, then movie
 */
export function GenreMatchingGame() {
  // Game state
  const [currentFilmIndex, setCurrentFilmIndex] = useState(0);
  const [collectedGenreIds, setCollectedGenreIds] = useState<Set<string>>(new Set());
  const [phase, setPhase] = useState<GamePhase>('selecting');
  const [evaluatedGenres, setEvaluatedGenres] = useState<
    Map<string, 'correct' | 'incorrect' | 'missed'>
  >(new Map());
  const [totalScore, setTotalScore] = useState(0);
  const [lastPointsEarned, setLastPointsEarned] = useState<number | null>(null);

  const [heldIncorrectIds, setHeldIncorrectIds] = useState<Set<string>>(new Set());
  const [flyFromPosition, setFlyFromPosition] = useState<{ x: number; y: number } | undefined>();

  // Ref for reveal timeout
  const revealTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Map to store refs for each genre chip element (for flying animation positioning)
  const chipRefsMap = useRef<Map<string, HTMLButtonElement>>(new Map());

  const currentFilm = MOCK_FILMS[currentFilmIndex];
  const correctGenreIds = useMemo(
    () => new Set(currentFilm.correctGenreIds),
    [currentFilm.correctGenreIds],
  );

  // Group genres by tier
  const genresByTier = useMemo(() => {
    return MOCK_GENRES.reduce(
      (acc, genre) => {
        acc[genre.tier].push(genre);
        return acc;
      },
      { niche: [], 'mid-tier': [], popular: [] } as Record<GenreTier, Genre[]>,
    );
  }, []);

  // Get chip display state
  const getChipState = useCallback(
    (genreId: string): ChipDisplayState => {
      if (evaluatedGenres.has(genreId)) {
        return evaluatedGenres.get(genreId)!;
      }
      if (collectedGenreIds.has(genreId)) {
        return 'selected';
      }
      return 'default';
    },
    [evaluatedGenres, collectedGenreIds],
  );

  // Check if chip should be in collected zone
  const isInCollectedZone = useCallback(
    (genreId: string): boolean => {
      // Keep if explicitly held (delaying return of incorrect items)
      if (heldIncorrectIds.has(genreId)) return true;

      const state = getChipState(genreId);
      // In collected zone if: selected, correct, or missed (during showing-missed/complete)
      if (state === 'selected' || state === 'correct' || state === 'missed') {
        return true;
      }
      return false;
    },
    [getChipState, heldIncorrectIds],
  );

  // Toggle genre selection (only during selecting phase)
  const handleGenreClick = useCallback(
    (genreId: string) => {
      if (phase !== 'selecting') return;

      setCollectedGenreIds((prev) => {
        const next = new Set(prev);
        if (next.has(genreId)) {
          next.delete(genreId);
        } else {
          next.add(genreId);
        }
        return next;
      });
    },
    [phase],
  );

  // Reveal function using recursive setTimeout - not using useCallback to avoid self-reference
  const revealNext = (queue: string[], index: number) => {
    if (index >= queue.length) {
      setPhase('complete');
      return;
    }

    const genreId = queue[index];
    const isCorrect = correctGenreIds.has(genreId);
    const wasSelected = collectedGenreIds.has(genreId);
    const genre = MOCK_GENRES.find((g) => g.id === genreId);

    // Determine result
    let result: 'correct' | 'incorrect' | 'missed';
    if (wasSelected && isCorrect) {
      result = 'correct';
    } else if (wasSelected && !isCorrect) {
      result = 'incorrect';
    } else {
      result = 'missed';
      // Switch to showing-missed phase when we start revealing missed genres
      const selectedCount = collectedGenreIds.size;
      if (index === selectedCount) {
        setPhase('showing-missed');
      }
    }

    // Calculate points
    let points = 0;
    if (genre) {
      if (result === 'correct') {
        points = TIER_POINTS[genre.tier].correct;
      } else if (result === 'incorrect') {
        points = TIER_POINTS[genre.tier].incorrect;
      }
    }

    // Handle flow based on result
    if (result === 'incorrect') {
      // 1. Hold it (prevents immediate flyback)
      setHeldIncorrectIds((prev) => new Set(prev).add(genreId));
      // 2. Mark evaluated (turns Red immediately)
      setEvaluatedGenres((prev) => new Map(prev).set(genreId, result));

      // 3. Report chip position for flying animation
      const chipEl = chipRefsMap.current.get(genreId);
      if (chipEl) {
        const rect = chipEl.getBoundingClientRect();
        setFlyFromPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
      }

      // 4. Update points (allow negative total)
      if (points !== 0) {
        setTotalScore((prev) => prev + points);
        setLastPointsEarned(points);
      }

      // 4. Wait for user to see Red, then release
      revealTimeoutRef.current = setTimeout(() => {
        setHeldIncorrectIds((prev) => {
          const next = new Set(prev);
          next.delete(genreId);
          return next;
        });

        // 5. Wait for flyback animation, then next
        setTimeout(() => {
          revealNext(queue, index + 1);
        }, ANIMATION_TIMING.FLY_ANIMATION_MS);
      }, ANIMATION_TIMING.INCORRECT_HOLD_MS);
    } else {
      // Correct or Missed
      setEvaluatedGenres((prev) => new Map(prev).set(genreId, result));

      // Report chip position for flying animation (for correct selections)
      const chipEl = chipRefsMap.current.get(genreId);
      if (chipEl) {
        const rect = chipEl.getBoundingClientRect();
        setFlyFromPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
      }

      // Update points (allow negative total)
      if (points !== 0) {
        setTotalScore((prev) => prev + points);
        setLastPointsEarned(points);
      }

      // Continue to next after standard delay
      revealTimeoutRef.current = setTimeout(() => {
        revealNext(queue, index + 1);
      }, ANIMATION_TIMING.REVEAL_STEP_MS);
    }
  };

  // Lock selections and start reveal
  const handleLock = useCallback(() => {
    setPhase('locked');

    // Build reveal queue: selected genres first, then missed correct ones
    const selectedList = MOCK_GENRES.filter((g) => collectedGenreIds.has(g.id)).map((g) => g.id);
    const missedList = MOCK_GENRES.filter(
      (g) => correctGenreIds.has(g.id) && !collectedGenreIds.has(g.id),
    ).map((g) => g.id);

    const queue = [...selectedList, ...missedList];

    // Start reveal after brief pause
    setTimeout(() => {
      setPhase('revealing');
      revealNext(queue, 0);
    }, ANIMATION_TIMING.REVEAL_DELAY_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectedGenreIds, correctGenreIds]);

  // Reset round state
  const resetRoundState = useCallback(() => {
    if (revealTimeoutRef.current) {
      clearTimeout(revealTimeoutRef.current);
    }
    setCollectedGenreIds(new Set());
    setPhase('selecting');
    setEvaluatedGenres(new Map());
    setLastPointsEarned(null);
    setFlyFromPosition(undefined);
  }, []);

  // Move to next film
  const handleNext = useCallback(() => {
    if (currentFilmIndex < FILMS_PER_GAME - 1) {
      setCurrentFilmIndex((prev) => prev + 1);
      resetRoundState();
    }
  }, [currentFilmIndex, resetRoundState]);

  // Reset entire game
  const handleReset = useCallback(() => {
    setCurrentFilmIndex(0);
    setTotalScore(0);
    resetRoundState();
  }, [resetRoundState]);

  const isGameComplete = currentFilmIndex === FILMS_PER_GAME - 1 && phase === 'complete';
  const canLock = phase === 'selecting' && collectedGenreIds.size > 0;

  // Get collected genres for display
  const collectedGenres = useMemo(() => {
    return MOCK_GENRES.filter((g) => isInCollectedZone(g.id));
  }, [isInCollectedZone]);

  // Get tier genres (not in collected zone)
  const getTierGenres = useCallback(
    (tier: GenreTier) => {
      return genresByTier[tier].filter((g) => !isInCollectedZone(g.id));
    },
    [genresByTier, isInCollectedZone],
  );

  // Render tier section
  const renderTierSection = (tier: GenreTier) => {
    const genres = getTierGenres(tier);
    const info = TIER_INFO[tier];

    if (genres.length === 0 && phase !== 'selecting') {
      return null;
    }

    return (
      <motion.div key={tier} className="space-y-1 md:space-y-1 lg:space-y-2" layout>
        <div className="flex items-center gap-1 text-[10px] md:text-[10px] lg:text-xs text-muted-foreground">
          <span
            className={cn(
              'font-bold tracking-wider',
              tier === 'niche' && 'text-accent',
              tier === 'mid-tier' && 'text-primary',
              tier === 'popular' && 'text-muted-foreground',
            )}
          >
            {info.stars} {info.label}
          </span>
          <span className="text-[8px] md:text-[9px] lg:text-[10px] opacity-60">
            (+{TIER_POINTS[tier].correct}/{TIER_POINTS[tier].incorrect})
          </span>
        </div>
        <div className="flex flex-wrap gap-1 md:gap-1 lg:gap-1.5 min-h-[28px] md:min-h-[28px] lg:min-h-[40px]">
          <AnimatePresence mode="popLayout">
            {genres.map((genre) => (
              <GenreChipAnimated
                key={genre.id}
                genre={genre}
                state={getChipState(genre.id)}
                isDisabled={phase !== 'selecting'}
                onClick={() => handleGenreClick(genre.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      </motion.div>
    );
  };

  // Calculate specific points for this card to drive animation
  const maxCardPoints = useMemo(() => {
    return Array.from(correctGenreIds).reduce((sum, id) => {
      const genre = MOCK_GENRES.find((g) => g.id === id);
      return sum + (genre ? TIER_POINTS[genre.tier].correct : 0);
    }, 0);
  }, [correctGenreIds]);

  const currentCardPoints = useMemo(() => {
    let score = 0;
    evaluatedGenres.forEach((result, id) => {
      const genre = MOCK_GENRES.find((g) => g.id === id);
      if (genre) {
        if (result === 'correct') score += TIER_POINTS[genre.tier].correct;
        else if (result === 'incorrect') score += TIER_POINTS[genre.tier].incorrect;
      }
    });
    return Math.max(0, score);
  }, [evaluatedGenres]);

  const getDynamicStyle = () => {
    if (phase === 'selecting') return {};

    const ratio = maxCardPoints > 0 ? currentCardPoints / maxCardPoints : 0;
    const hue = Math.round(Math.min(120, Math.max(0, ratio * 120)));

    return {
      backgroundColor: `hsla(${hue}, 70%, 50%, 0.1)`,
      borderColor: `hsla(${hue}, 70%, 40%, 0.3)`,
    };
  };

  return (
    <LayoutGroup>
      <GameLayout
        centered
        className="p-1 md:p-4"
        top={
          <div className="flex items-center justify-between w-full px-2 py-1">
            <GameRoundIndicator currentRound={currentFilmIndex + 1} totalRounds={FILMS_PER_GAME} />
            <ScorePanel
              score={totalScore}
              pointsEarned={lastPointsEarned}
              flyFromPosition={flyFromPosition}
              size="lg"
              label="Score"
              maxScore={120}
              pointsPerAction={15}
              flyDuration={1.0}
            />
          </div>
        }
        middle={
          <div className="flex flex-col gap-1 md:gap-3 w-full max-w-5xl mx-auto flex-1 min-h-0 justify-center">
            {/* MOBILE: Vertical stack (poster→selections→genres) | DESKTOP: Side-by-side */}
            <div className="flex flex-col md:flex-row items-stretch gap-1 md:gap-4 lg:gap-6 min-h-0 md:flex-1">
              {/* POSTER: Fixed size on mobile, flex on desktop */}
              <div className="order-1 md:order-2 shrink-0 md:flex-1 flex items-center justify-center">
                <div className="w-[55%] md:w-[65%] lg:w-[70%] max-w-[400px]">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentFilm.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <div className="relative w-full aspect-[2/3] rounded-xl lg:rounded-2xl overflow-hidden shadow-xl lg:shadow-2xl shadow-black/30">
                        <Image
                          src={currentFilm.posterUrl}
                          alt={`Poster for ${currentFilm.title}`}
                          fill
                          className="object-contain"
                        />
                      </div>
                      <div className="text-center mt-1 md:mt-2 lg:mt-3">
                        <h2 className="text-[11px] md:text-lg lg:text-xl font-bold text-foreground leading-tight font-serif truncate">
                          {currentFilm.title}
                        </h2>
                        <div className="text-[9px] md:text-sm lg:text-base text-muted-foreground">
                          {currentFilm.year} • {currentFilm.director}
                        </div>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              {/* SELECTIONS: Mobile second - fixed size */}
              <motion.div
                className={cn(
                  'order-2 md:hidden w-full rounded-lg border border-dashed p-1 transition-colors duration-300 shrink-0',
                  phase === 'selecting' &&
                    (collectedGenres.length > 0
                      ? 'border-primary/50 bg-primary/5'
                      : 'border-muted-foreground/30 bg-muted/10'),
                )}
                style={getDynamicStyle()}
              >
                <div className="text-[9px] text-muted-foreground mb-0.5 flex items-center gap-1">
                  <Sparkles className="w-2 h-2" />
                  <span>Your Selections</span>
                </div>
                <div className="flex flex-wrap gap-0.5 min-h-[18px]">
                  <AnimatePresence mode="popLayout">
                    {collectedGenres.map((genre) => (
                      <GenreChipAnimated
                        key={genre.id}
                        genre={genre}
                        state={getChipState(genre.id)}
                        isDisabled={phase !== 'selecting'}
                        onClick={() => handleGenreClick(genre.id)}
                        chipRef={(el) => {
                          if (el) {
                            // Defer check until after layout to get accurate dimensions
                            requestAnimationFrame(() => {
                              const rect = el.getBoundingClientRect();
                              if (rect.width > 0 && rect.height > 0) {
                                chipRefsMap.current.set(genre.id, el);
                              }
                            });
                          } else {
                            chipRefsMap.current.delete(genre.id);
                          }
                        }}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </motion.div>

              {/* GENRES: Takes remaining space on mobile, scrolls if needed */}
              <div className="order-3 md:order-1 w-full md:w-[38%] lg:w-[32%] md:shrink-0 bg-card/30 rounded-lg p-1 md:p-3 lg:p-4 border border-border/20 overflow-y-auto no-scrollbar flex flex-col justify-center flex-1 md:flex-initial min-h-0">
                <motion.div className="space-y-1 md:space-y-2 lg:space-y-3" layout>
                  {renderTierSection('niche')}
                  {renderTierSection('mid-tier')}
                  {renderTierSection('popular')}
                </motion.div>
              </div>
            </div>

            {/* DESKTOP ONLY: Selections bar at bottom */}
            <motion.div
              className={cn(
                'hidden md:block w-full rounded-lg border border-dashed p-2 lg:p-3 transition-colors duration-300 shrink-0',
                phase === 'selecting' &&
                  (collectedGenres.length > 0
                    ? 'border-primary/50 bg-primary/5'
                    : 'border-muted-foreground/30 bg-muted/10'),
              )}
              style={getDynamicStyle()}
            >
              <div className="text-[10px] lg:text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3 lg:w-4 lg:h-4" />
                <span>Your Selections</span>
              </div>
              <div className="flex flex-wrap gap-1 lg:gap-1.5 min-h-[28px] lg:min-h-[40px]">
                <AnimatePresence mode="popLayout">
                  {collectedGenres.map((genre) => (
                    <GenreChipAnimated
                      key={genre.id}
                      genre={genre}
                      state={getChipState(genre.id)}
                      isDisabled={phase !== 'selecting'}
                      onClick={() => handleGenreClick(genre.id)}
                      chipRef={(el) => {
                        if (el) {
                          // Defer check until after layout to get accurate dimensions
                          requestAnimationFrame(() => {
                            const rect = el.getBoundingClientRect();
                            if (rect.width > 0 && rect.height > 0) {
                              chipRefsMap.current.set(genre.id, el);
                            }
                          });
                        } else {
                          chipRefsMap.current.delete(genre.id);
                        }
                      }}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        }
        bottom={
          <div className="flex justify-center gap-2 py-1 md:py-3 min-h-[40px] md:min-h-[60px]">
            {phase === 'selecting' && collectedGenreIds.size > 0 && (
              <Button
                onClick={() => setCollectedGenreIds(new Set())}
                size="sm"
                variant="outline"
                className="gap-1 md:gap-2 text-xs md:text-sm text-muted-foreground border-muted-foreground/20 hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                <X className="w-3 h-3 md:w-4 md:h-4" />
                Clear
              </Button>
            )}

            {phase === 'selecting' && (
              <Button
                onClick={handleLock}
                size="sm"
                className="gap-1 md:gap-2 text-xs md:text-sm"
                disabled={!canLock}
              >
                <Lock className="w-3 h-3 md:w-4 md:h-4" />
                Lock It In
              </Button>
            )}

            {(phase === 'locked' || phase === 'revealing' || phase === 'showing-missed') && (
              <Button size="sm" disabled className="gap-1 md:gap-2 text-xs md:text-sm opacity-60">
                {phase === 'showing-missed' ? 'Revealing...' : 'Revealing...'}
              </Button>
            )}

            {phase === 'complete' && !isGameComplete && (
              <Button onClick={handleNext} size="sm" className="gap-1 md:gap-2 text-xs md:text-sm">
                Next Film
                <ArrowRight className="w-3 h-3 md:w-4 md:h-4" />
              </Button>
            )}

            {isGameComplete && (
              <Button
                onClick={handleReset}
                size="sm"
                variant="outline"
                className="gap-1 md:gap-2 text-xs md:text-sm"
              >
                <RotateCcw className="w-3 h-3 md:w-4 md:h-4" />
                Play Again
              </Button>
            )}
          </div>
        }
      />
    </LayoutGroup>
  );
}
