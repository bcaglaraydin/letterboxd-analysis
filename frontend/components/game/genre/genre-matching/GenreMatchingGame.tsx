'use client';

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { Lock, ArrowRight, RotateCcw, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { GameLayout } from '@/components/game/shared/GameLayout';
import { GameRoundIndicator } from '@/components/game/shared/GameRoundIndicator';
import { ScorePanel } from '@/components/game/shared/ScorePanel';
import { Button } from '@/components/ui/button';

import { MOCK_FILMS, MOCK_GENRES, FILMS_PER_GAME } from './constants';
import { Genre, GenreTier, GamePhase, TIER_POINTS, TIER_INFO } from './types';

type ChipDisplayState = 'default' | 'selected' | 'correct' | 'incorrect' | 'missed';

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

  // Ref for reveal timeout
  const revealTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
      const state = getChipState(genreId);
      // In collected zone if: selected, correct, or missed (during showing-missed/complete)
      if (state === 'selected' || state === 'correct' || state === 'missed') {
        return true;
      }
      return false;
    },
    [getChipState],
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

    // Update state
    setEvaluatedGenres((prev) => new Map(prev).set(genreId, result));

    if (points !== 0) {
      setTotalScore((prev) => Math.max(0, prev + points));
      setLastPointsEarned(points);
    }

    // Continue to next after delay
    revealTimeoutRef.current = setTimeout(() => {
      revealNext(queue, index + 1);
    }, 600);
  };

  // Lock selections and start reveal
  const handleLock = useCallback(() => {
    setPhase('locked');

    // Build reveal queue: selected genres first, then missed correct ones
    const selectedList = Array.from(collectedGenreIds);
    const missedList = MOCK_GENRES.filter(
      (g) => correctGenreIds.has(g.id) && !collectedGenreIds.has(g.id),
    ).map((g) => g.id);

    const queue = [...selectedList, ...missedList];

    // Start reveal after brief pause
    setTimeout(() => {
      setPhase('revealing');
      revealNext(queue, 0);
    }, 300);
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

  // Chip component with animations
  const GenreChipAnimated = ({ genre, onClick }: { genre: Genre; onClick?: () => void }) => {
    const state = getChipState(genre.id);
    const points = TIER_POINTS[genre.tier];
    const isDisabled = phase !== 'selecting';

    const getStateStyle = () => {
      switch (state) {
        case 'selected':
          return 'bg-primary/20 border-primary ring-2 ring-primary/30 shadow-md';
        case 'correct':
          return 'bg-green-500/20 border-green-500 text-green-300 shadow-lg shadow-green-500/20';
        case 'incorrect':
          return 'bg-destructive/20 border-destructive text-destructive opacity-60 line-through';
        case 'missed':
          return 'border-dashed border-amber-500/60 bg-amber-500/10 text-amber-400';
        default:
          return cn(
            'bg-card/60 hover:bg-card/80',
            genre.tier === 'niche' && 'border-accent/50 hover:border-accent',
            genre.tier === 'mid-tier' && 'border-primary/50 hover:border-primary',
            genre.tier === 'popular' &&
              'border-muted-foreground/30 hover:border-muted-foreground/50',
          );
      }
    };

    const getPointsLabel = () => {
      if (state === 'correct') return `+${points.correct}`;
      if (state === 'incorrect') return `${points.incorrect}`;
      return null;
    };

    const pointsLabel = getPointsLabel();

    return (
      <motion.button
        layout
        layoutId={`genre-${genre.id}`}
        type="button"
        onClick={onClick}
        disabled={isDisabled}
        whileTap={{ scale: isDisabled ? 1 : 0.95 }}
        whileHover={{ scale: isDisabled ? 1 : 1.03 }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{
          opacity: 1,
          scale: 1,
          transition: { type: 'spring', stiffness: 500, damping: 30 },
        }}
        exit={{ opacity: 0, scale: 0.8 }}
        className={cn(
          'relative px-2 py-1 md:px-2.5 md:py-1 lg:px-3 lg:py-1.5 rounded-full border transition-colors duration-200',
          'text-xs md:text-xs lg:text-sm font-medium',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
          !isDisabled && 'cursor-pointer',
          isDisabled && 'cursor-default',
          getStateStyle(),
        )}
      >
        <span className="inline-flex items-center gap-1">
          {genre.name}
          {pointsLabel && (
            <motion.span
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                'text-[8px] md:text-[10px] font-bold',
                state === 'correct' && 'text-green-400',
                state === 'incorrect' && 'text-destructive',
              )}
            >
              {pointsLabel}
            </motion.span>
          )}
        </span>
      </motion.button>
    );
  };

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
                onClick={() => handleGenreClick(genre.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      </motion.div>
    );
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
              size="sm"
              label="Score"
              maxScore={120}
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
                  collectedGenres.length > 0
                    ? 'border-primary/50 bg-primary/5'
                    : 'border-muted-foreground/30 bg-muted/10',
                  phase === 'complete' && 'border-green-500/50 bg-green-500/5',
                )}
              >
                <div className="text-[9px] text-muted-foreground mb-0.5 flex items-center gap-1">
                  <Sparkles className="w-2 h-2" />
                  <span>
                    {phase === 'complete'
                      ? 'Correct'
                      : phase === 'selecting'
                        ? 'Your Selections'
                        : 'Evaluating...'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-0.5 min-h-[18px]">
                  <AnimatePresence mode="popLayout">
                    {collectedGenres.map((genre) => (
                      <GenreChipAnimated
                        key={genre.id}
                        genre={genre}
                        onClick={() => handleGenreClick(genre.id)}
                      />
                    ))}
                  </AnimatePresence>
                  {collectedGenres.length === 0 && phase === 'selecting' && (
                    <span className="text-[9px] text-muted-foreground/50 italic">Tap</span>
                  )}
                </div>
              </motion.div>

              {/* GENRES: Takes remaining space on mobile, scrolls if needed */}
              <div className="order-3 md:order-1 w-full md:w-[38%] lg:w-[32%] md:shrink-0 bg-card/30 rounded-lg p-1 md:p-3 lg:p-4 border border-border/20 overflow-y-auto flex flex-col justify-center flex-1 md:flex-initial min-h-0">
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
                collectedGenres.length > 0
                  ? 'border-primary/50 bg-primary/5'
                  : 'border-muted-foreground/30 bg-muted/10',
                phase === 'complete' && 'border-green-500/50 bg-green-500/5',
              )}
            >
              <div className="text-[10px] lg:text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3 lg:w-4 lg:h-4" />
                <span>
                  {phase === 'complete'
                    ? 'Correct Genres'
                    : phase === 'selecting'
                      ? 'Your Selections'
                      : 'Evaluating...'}
                </span>
              </div>
              <div className="flex flex-wrap gap-1 lg:gap-1.5 min-h-[28px] lg:min-h-[40px]">
                <AnimatePresence mode="popLayout">
                  {collectedGenres.map((genre) => (
                    <GenreChipAnimated
                      key={genre.id}
                      genre={genre}
                      onClick={() => handleGenreClick(genre.id)}
                    />
                  ))}
                </AnimatePresence>
                {collectedGenres.length === 0 && phase === 'selecting' && (
                  <span className="text-[10px] text-muted-foreground/50 italic">
                    Tap genres to select
                  </span>
                )}
              </div>
            </motion.div>
          </div>
        }
        bottom={
          <div className="flex justify-center gap-2 py-1 md:py-3 min-h-[40px] md:min-h-[60px]">
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
