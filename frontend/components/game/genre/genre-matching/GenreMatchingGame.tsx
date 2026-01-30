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
        <div className="flex items-center gap-1 text-[10px] md:text-[10px] lg:text-xs xl:text-sm text-muted-foreground">
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
          <span className="text-[8px] md:text-[9px] lg:text-[10px] xl:text-xs opacity-60">
            (+{TIER_POINTS[tier].correct}/{TIER_POINTS[tier].incorrect})
          </span>
        </div>
        <div className="flex flex-wrap gap-1 md:gap-1 lg:gap-1.5 xl:gap-2.5 min-h-[28px] md:min-h-[28px] lg:min-h-[40px] xl:min-h-[48px]">
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
          <div className="flex flex-col gap-2 md:gap-3 w-full max-w-6xl mx-auto flex-1 min-h-0 justify-center px-2 md:px-6">
            <div className="flex flex-col md:flex-row items-stretch gap-2 md:gap-8 lg:gap-12 min-h-0 flex-1">
              
              {/* INTERACTION COLUMN: Genres + Selections + Buttons */}
              {/* Mobile: Bottom | Desktop: Left */}
              <div className="order-2 md:order-1 flex flex-col gap-4 flex-1 min-h-0 justify-center">
                
                {/* Genres List */}
                <div className="w-full bg-card/30 rounded-xl border border-border/20 overflow-y-auto no-scrollbar flex flex-col relative shadow-inner max-h-[60vh]">
                  <div className="p-2 md:p-4 md:space-y-4 space-y-2">
                    {renderTierSection('niche')}
                    {renderTierSection('mid-tier')}
                    {renderTierSection('popular')}
                  </div>
                </div>

                {/* Selections Area */}
                <motion.div
                  className={cn(
                    'w-full rounded-xl border border-dashed p-2 md:p-4 transition-colors duration-300 shrink-0',
                    phase === 'selecting' &&
                      (collectedGenres.length > 0
                        ? 'border-primary/50 bg-primary/5'
                        : 'border-muted-foreground/30 bg-muted/10'),
                  )}
                  style={getDynamicStyle()}
                >
                  <div className="text-[10px] md:text-xs text-muted-foreground mb-1 md:mb-2 flex items-center gap-1.5 uppercase tracking-wider font-semibold">
                    <Sparkles className="w-3 h-3 md:w-3.5 md:h-3.5" />
                    <span>Your Selections</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 md:gap-2 min-h-[24px] md:min-h-[32px]">
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
                    {collectedGenres.length === 0 && (
                      <span className="text-xs text-muted-foreground/40 italic py-0.5">
                        Select genres...
                      </span>
                    )}
                  </div>
                </motion.div>

                {/* DESKTOP BUTTONS: Unified with Interaction Column */}
                <div className="hidden md:flex gap-3 justify-center items-center pt-2">
                   {phase === 'selecting' && collectedGenreIds.size > 0 && (
                    <Button
                      onClick={clearSelections}
                      size="sm"
                      variant="ghost"
                      className="gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                      <X className="w-4 h-4" />
                      Clear
                    </Button>
                  )}
                  
                  {phase === 'selecting' && (
                    <Button
                      onClick={handleLock}
                      size="lg"
                      className="gap-2 text-base px-8 font-semibold shadow-md transition-all hover:scale-105"
                      disabled={!canLock}
                    >
                      <Lock className="w-4 h-4" />
                      Lock It In
                    </Button>
                  )}

                  {(phase === 'locked' || phase === 'revealing' || phase === 'showing-missed') && (
                    <Button size="lg" disabled className="gap-2 text-base px-8 opacity-60">
                      {phase === 'showing-missed' ? 'Revealing...' : 'Revealing...'}
                    </Button>
                  )}

                  {phase === 'complete' && !isGameComplete && (
                    <Button onClick={handleNext} size="lg" className="gap-2 text-base px-8 shadow-md hover:scale-105">
                      Next Film
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  )}

                  {isGameComplete && (
                    <Button
                      onClick={handleReset}
                      size="lg"
                      variant="outline"
                      className="gap-2 text-base"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Play Again
                    </Button>
                  )}
                </div>
              </div>

              {/* POSTER COLUMN */}
              {/* Mobile: Top | Desktop: Right */}
              <div className="order-1 md:order-2 shrink-0 md:flex-1 flex flex-col items-center justify-center md:py-8">
                <div className="relative h-[30vh] md:h-auto md:w-[80%] max-w-[400px] aspect-[2/3] shadow-2xl shadow-black/50 rounded-lg md:rounded-2xl overflow-hidden">
                   <AnimatePresence mode="wait">
                    <motion.div
                      key={currentFilm.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="w-full h-full"
                    >
                      <Image
                        src={currentFilm.posterUrl}
                        alt={`Poster for ${currentFilm.title}`}
                        fill
                        className="object-cover"
                        priority
                      />
                    </motion.div>
                  </AnimatePresence>
                </div>
                
                <div className="text-center mt-2 md:mt-6 space-y-1">
                  <h2 className="text-base md:text-2xl lg:text-3xl font-serif font-bold text-foreground leading-tight">
                    {currentFilm.title}
                  </h2>
                  <div className="text-xs md:text-base text-muted-foreground font-medium">
                    {currentFilm.year} • {currentFilm.director}
                  </div>
                </div>
              </div>

            </div>
          </div>
        }
        bottom={
          <div className="md:hidden flex justify-center gap-2 py-2 min-h-[60px]">
            {phase === 'selecting' && collectedGenreIds.size > 0 && (
              <Button
                onClick={clearSelections}
                size="sm"
                variant="outline"
                className="gap-1 text-xs text-muted-foreground border-muted-foreground/20"
              >
                <X className="w-3 h-3" />
                Clear
              </Button>
            )}

            {phase === 'selecting' && (
              <Button
                onClick={handleLock}
                size="sm"
                className="gap-1 text-xs font-semibold"
                disabled={!canLock}
              >
                <Lock className="w-3 h-3" />
                Lock It In
              </Button>
            )}

            {(phase === 'locked' || phase === 'revealing' || phase === 'showing-missed') && (
              <Button size="sm" disabled className="gap-1 text-xs opacity-60">
                Revealing...
              </Button>
            )}

            {phase === 'complete' && !isGameComplete && (
              <Button onClick={handleNext} size="sm" className="gap-1 text-xs">
                Next Film
                <ArrowRight className="w-3 h-3" />
              </Button>
            )}

            {isGameComplete && (
              <Button
                onClick={handleReset}
                size="sm"
                variant="outline"
                className="gap-1 text-xs"
              >
                <RotateCcw className="w-3 h-3" />
                Play Again
              </Button>
            )}
          </div>
        }
      />
    </LayoutGroup>
  );
}
