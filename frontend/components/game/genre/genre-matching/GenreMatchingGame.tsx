'use client';

import React, { useMemo, useCallback } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { Lock, ArrowRight, RotateCcw, Sparkles, X } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { getScoreColor } from '@/lib/scoreUtils';
import { GameLayout } from '@/components/game/shared/GameLayout';
import { GameRoundIndicator } from '@/components/game/shared/GameRoundIndicator';
import { ScorePanel } from '@/components/game/shared/ScorePanel';
import { Button } from '@/components/ui/button';

import { FILMS_PER_GAME } from './constants';
import { GenreTier, TIER_INFO } from './types';
import { GenreChipAnimated } from './GenreChipAnimated';
import { useGenreMatchingGame } from './useGenreMatchingGame';

/**
 * GenreMatchingGame - Redesigned with Flying Animation Mechanics
 * Layout: Available genres LEFT, Movie card + collected zone RIGHT
 * Mobile: Stacked with genres first, then movie
 */
interface GenreMatchingGameProps {
  onGameComplete?: (score: number) => void;
}

export function GenreMatchingGame({ onGameComplete }: GenreMatchingGameProps) {
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
    chipRefsMap,
    getChipState,
    getTierGenres,
    handleGenreClick,
    handleReset,
    clearSelections,
    collectedGenreIds,
    scoringConfig,
    getGenre,
    handleLock,
    handleNext,
    getGenrePoints,
    maxPositivePoints,
    maxNegativePoints,
    roundScore,
    totalGameMaxScore,
  } = useGenreMatchingGame();

  // Helper to get points/penalty for a tier (used for header display only now)
  const getTierPoints = useCallback(
    (tier: GenreTier) => {
      const points = scoringConfig.WEIGHTS[tier] || 0;
      const penalty = -Math.max(1, Math.floor(points * scoringConfig.PENALTY_FACTOR));
      return { points, penalty };
    },
    [scoringConfig],
  );

  // Calculate specific points for this card to drive animation
  const maxCardPoints = currentFilm?.theoreticalMax || 20;

  const currentCardPoints = useMemo(() => {
    let score = 0;
    evaluatedGenres.forEach((result, id) => {
      // Use specific scoring check if available (for correct genres)
      if (currentFilm?.genreScoring?.[id]) {
        if (result === 'correct') score += currentFilm.genreScoring[id].correct;
        else if (result === 'incorrect') score += currentFilm.genreScoring[id].penalty;
        return;
      }

      // Fallback to tier-based scoring for incorrect guesses (or if mapping missing)
      const genre = getGenre(id);
      if (genre) {
        const { points, penalty } = getTierPoints(genre.tier);
        if (result === 'correct') score += points;
        else if (result === 'incorrect') score += penalty;
      }
    });
    return Math.max(0, score);
  }, [evaluatedGenres, getGenre, currentFilm, getTierPoints]);

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
    // Points/penalty previously used for hint, now removed from UI.

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
                pointsConfig={getGenrePoints(genre.id)}
                onRef={handleChipRef}
              />
            ))}
          </AnimatePresence>
        </div>
      </motion.div>
    );
  };

  // Stable ref handler passed to children
  const handleChipRef = useCallback(
    (el: HTMLButtonElement | null, id: string) => {
      // Only set if element exists.
      // We avoid deleting on unmount because of the race condition between
      // "Available" chip unmounting and "Selected" chip mounting.
      // If we delete on unmount, we might remove the *new* ref if the *old* one unmounts last.
      // Stale refs are handled by checking .isConnected or just strict usage.
      // We explicitly clear the map on round reset.
      if (el) {
        chipRefsMap.current.set(id, el);
      }
    },
    [chipRefsMap],
  );

  return (
    <LayoutGroup>
      <GameLayout
        centered
        className="p-1 md:p-4"
        top={
          <div className="flex items-center justify-between w-full px-2 py-1">
            <GameRoundIndicator
              major={2}
              majorTotal={2}
              minor={{ current: currentFilmIndex + 1, total: FILMS_PER_GAME, label: 'Movie' }}
            />
            {/* Score Panel */}
            <ScorePanel
              score={totalScore}
              pointsEarned={lastPointsEarned}
              flyFromPosition={flyFromPosition}
              maxScore={totalGameMaxScore}
              showMaxScore={true}
              className="mb-0"
              size="md"
              position="static"
              maxPositivePoint={maxPositivePoints}
              maxNegativePoint={maxNegativePoints}
              flyDuration={1.0}
            />
          </div>
        }
        middle={
          <div className="flex flex-col gap-2 md:gap-3 w-full max-w-6xl mx-auto flex-1 min-h-0 justify-center px-2 md:px-6">
            <div className="flex flex-col md:flex-row items-stretch gap-2 md:gap-8 lg:gap-12 min-h-0 flex-1">
              {/* INTERACTION COLUMN: Genres + Selections + Buttons */}
              {/* Mobile: Bottom | Desktop: Left */}
              <div className="order-2 md:order-1 flex flex-col gap-4 shrink-0 md:flex-1 md:min-h-0 justify-center">
                {/* Genres List */}
                <div className="w-full bg-card/30 rounded-xl border border-border/20 overflow-y-auto no-scrollbar flex flex-col relative shadow-inner max-h-[40vh] md:max-h-[60vh]">
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
                  <div className="text-[10px] md:text-xs text-muted-foreground mb-1 md:mb-2 flex items-center justify-between uppercase tracking-wider font-semibold">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 md:w-3.5 md:h-3.5" />
                      <span>Your Selections</span>
                    </div>
                    {/* Round Score Display */}
                    <span
                      style={
                        roundScore === 0
                          ? {}
                          : getScoreColor(roundScore, maxPositivePoints, maxNegativePoints)
                      }
                      className={cn(
                        'text-xs md:text-sm font-bold transition-colors duration-300',
                        roundScore === 0 && 'text-muted-foreground/60 font-medium',
                      )}
                    >
                      {roundScore > 0 ? '+' : ''}
                      {roundScore}/{currentFilm?.theoreticalMax || 20}
                    </span>
                  </div>
                  <div className="flex flex-nowrap overflow-x-auto no-scrollbar md:flex-wrap md:overflow-visible gap-1.5 md:gap-2 min-h-[24px] md:min-h-[32px] [&>*]:shrink-0 pl-0.5 pr-8 md:pr-0 pb-1 [mask-image:linear-gradient(to_right,black_85%,transparent_100%)] md:[mask-image:none]">
                    <AnimatePresence mode="popLayout">
                      {collectedGenres.map((genre) => (
                        <GenreChipAnimated
                          key={genre.id}
                          genre={genre}
                          state={getChipState(genre.id)}
                          isDisabled={phase !== 'selecting'}
                          onClick={() => handleGenreClick(genre.id)}
                          onRef={handleChipRef}
                          pointsConfig={getGenrePoints(genre.id)}
                        />
                      ))}
                    </AnimatePresence>
                    {collectedGenres.length === 0 && phase === 'selecting' && (
                      <span className="text-xs text-muted-foreground/40 italic py-0.5 shrink-0">
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
                    <Button
                      onClick={handleNext}
                      size="lg"
                      className="gap-2 text-base px-8 shadow-md hover:scale-105"
                    >
                      Next Film
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  )}

                  {isGameComplete && (
                    <Button
                      onClick={() => {
                        if (onGameComplete) onGameComplete(totalScore);
                        else handleReset();
                      }}
                      size="lg"
                      variant={onGameComplete ? 'default' : 'outline'}
                      className="gap-2 text-base"
                    >
                      {onGameComplete ? (
                        <>
                          Complete <ArrowRight className="w-4 h-4" />
                        </>
                      ) : (
                        <>
                          <RotateCcw className="w-4 h-4" />
                          Play Again
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>

              {/* POSTER COLUMN */}
              {/* Mobile: Top | Desktop: Right */}
              <div className="order-1 md:order-2 flex-1 md:flex-1 min-h-0 flex flex-col items-center justify-center md:py-8">
                <div className="relative h-full md:h-auto w-auto md:w-[80%] max-w-full md:max-w-[400px] aspect-[2/3] shadow-2xl shadow-black/50 rounded-lg md:rounded-2xl overflow-hidden mx-auto">
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
                onClick={() => {
                  if (onGameComplete) onGameComplete(totalScore);
                  else handleReset();
                }}
                size="sm"
                variant={onGameComplete ? 'default' : 'outline'}
                className="gap-1 text-xs"
              >
                {onGameComplete ? (
                  <>
                    Complete <ArrowRight className="w-3 h-3" />
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3 h-3" />
                    Play Again
                  </>
                )}
              </Button>
            )}
          </div>
        }
      />
    </LayoutGroup>
  );
}
