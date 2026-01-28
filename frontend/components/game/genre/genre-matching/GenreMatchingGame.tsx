'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { Lock, ArrowRight, RotateCcw, Sparkles, X } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { GameLayout } from '@/components/game/shared/GameLayout';
import { GameRoundIndicator } from '@/components/game/shared/GameRoundIndicator';
import { ScorePanel } from '@/components/game/shared/ScorePanel';
import { Button } from '@/components/ui/button';

import { MOCK_GENRES, FILMS_PER_GAME } from './constants';
import { GenreTier, TIER_POINTS, TIER_INFO } from './types';
import { GenreChipAnimated } from './GenreChipAnimated';
import { useGenreMatchingGame } from './useGenreMatchingGame';

/**
 * GenreMatchingGame - Redesigned with Flying Animation Mechanics
 * Layout: Available genres LEFT, Movie card + collected zone RIGHT
 * Mobile: Stacked with genres first, then movie
 */
export function GenreMatchingGame() {
  const {
    currentFilmIndex,
    currentFilm,
    phase,
    totalScore,
    lastPointsEarned,
    collectedGenres,
    evaluatedGenres,
    flyFromPosition,
    isGameComplete,
    canLock,
    correctGenreIds,
    chipRefsMap,
    getChipState,
    getTierGenres,
    handleGenreClick,
    handleLock,
    handleNext,
    handleReset,
    clearSelections,
    collectedGenreIds,
  } = useGenreMatchingGame();

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

  // Chip ref callback for flying animation positioning
  const createChipRefCallback = (genreId: string) => (el: HTMLButtonElement | null) => {
    if (el) {
      requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          chipRefsMap.current.set(genreId, el);
        }
      });
    } else {
      chipRefsMap.current.delete(genreId);
    }
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
                        chipRef={createChipRefCallback(genre.id)}
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
                      chipRef={createChipRefCallback(genre.id)}
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
                onClick={clearSelections}
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
