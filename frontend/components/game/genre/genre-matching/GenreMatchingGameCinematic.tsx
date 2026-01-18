'use client';

import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, ArrowRight, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

import { MovieCard } from '@/components/game/rating/MovieCard';
import { GameBackground } from '@/components/game/shared/GameBackground';
import { GameLayout } from '@/components/game/shared/GameLayout';
import { GameRoundIndicator } from '@/components/game/shared/GameRoundIndicator';
import { ScorePanel } from '@/components/game/shared/ScorePanel';
import { Button } from '@/components/ui/button';

import { GenreChip, GenreChipState } from './GenreChip';
import { MOCK_FILMS, MOCK_GENRES, FILMS_PER_GAME } from './constants';
import { Genre, GenreTier, GamePhase, TIER_POINTS, TIER_INFO } from './types';

/**
 * GenreMatchingGameCinematic - Redesigned following existing game patterns
 * Uses GameBackground + GameLayout with proper semantic styling
 */
export function GenreMatchingGameCinematic() {
  // Game state
  const [currentFilmIndex, setCurrentFilmIndex] = useState(0);
  const [selectedGenreIds, setSelectedGenreIds] = useState<Set<string>>(new Set());
  const [phase, setPhase] = useState<GamePhase>('selecting');
  const [revealedIndex, setRevealedIndex] = useState(-1);
  const [totalScore, setTotalScore] = useState(0);
  const [lastPointsEarned, setLastPointsEarned] = useState<number | null>(null);
  const [flyFromPosition, setFlyFromPosition] = useState<{ x: number; y: number } | null>(null);

  // Refs for genre chips to get positions
  const chipRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const currentFilm = MOCK_FILMS[currentFilmIndex];
  const correctGenreIds = new Set(currentFilm.correctGenreIds);

  // Group genres by tier
  const genresByTier = MOCK_GENRES.reduce(
    (acc, genre) => {
      acc[genre.tier].push(genre);
      return acc;
    },
    { niche: [], 'mid-tier': [], popular: [] } as Record<GenreTier, Genre[]>,
  );

  // Get ordered reveal list: selected first, then missed
  const getRevealOrder = useCallback(() => {
    const selected = MOCK_GENRES.filter((g) => selectedGenreIds.has(g.id));
    const missed = MOCK_GENRES.filter(
      (g) => correctGenreIds.has(g.id) && !selectedGenreIds.has(g.id),
    );
    return [...selected, ...missed];
  }, [selectedGenreIds, correctGenreIds]);

  // Calculate state for a genre chip
  const getChipState = (genre: Genre): GenreChipState => {
    if (phase === 'selecting') {
      return selectedGenreIds.has(genre.id) ? 'selected' : 'default';
    }

    // During reveal
    const revealOrder = getRevealOrder();
    const genreRevealIndex = revealOrder.findIndex((g) => g.id === genre.id);

    // Not yet revealed
    if (genreRevealIndex > revealedIndex) {
      return selectedGenreIds.has(genre.id) ? 'selected' : 'default';
    }

    // Revealed
    const isCorrect = correctGenreIds.has(genre.id);
    const wasSelected = selectedGenreIds.has(genre.id);

    if (wasSelected && isCorrect) return 'correct';
    if (wasSelected && !isCorrect) return 'incorrect';
    if (!wasSelected && isCorrect) return 'missed';
    return 'default';
  };

  // Toggle genre selection
  const handleGenreClick = (genreId: string) => {
    if (phase !== 'selecting') return;

    setSelectedGenreIds((prev) => {
      const next = new Set(prev);
      if (next.has(genreId)) {
        next.delete(genreId);
      } else {
        next.add(genreId);
      }
      return next;
    });
  };

  // Lock selections and start reveal
  const handleLock = () => {
    setPhase('locked');

    const revealOrder = getRevealOrder();
    let currentRevealIndex = 0;

    const revealNext = () => {
      if (currentRevealIndex >= revealOrder.length) {
        setPhase('complete');
        return;
      }

      const genre = revealOrder[currentRevealIndex];
      const isCorrect = correctGenreIds.has(genre.id);
      const wasSelected = selectedGenreIds.has(genre.id);
      const tier = genre.tier;

      // Calculate points
      let points = 0;
      if (wasSelected && isCorrect) {
        points = TIER_POINTS[tier].correct;
      } else if (wasSelected && !isCorrect) {
        points = TIER_POINTS[tier].incorrect;
      }

      // Trigger flying animation for positive points
      if (points > 0) {
        const chipEl = chipRefs.current.get(genre.id);
        if (chipEl) {
          const rect = chipEl.getBoundingClientRect();
          setFlyFromPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
        }
        setLastPointsEarned(points);
      }

      // Always update score (including negatives)
      if (points !== 0) {
        setTotalScore((prev) => Math.max(0, prev + points));
      }

      setRevealedIndex(currentRevealIndex);
      currentRevealIndex++;

      setTimeout(revealNext, 500);
    };

    setPhase('revealing');
    setTimeout(revealNext, 300);
  };

  // Move to next film
  const handleNext = () => {
    if (currentFilmIndex < FILMS_PER_GAME - 1) {
      setCurrentFilmIndex((prev) => prev + 1);
      setSelectedGenreIds(new Set());
      setPhase('selecting');
      setRevealedIndex(-1);
      setLastPointsEarned(null);
    }
  };

  // Reset game
  const handleReset = () => {
    setCurrentFilmIndex(0);
    setSelectedGenreIds(new Set());
    setPhase('selecting');
    setRevealedIndex(-1);
    setTotalScore(0);
    setLastPointsEarned(null);
  };

  const isGameComplete = currentFilmIndex === FILMS_PER_GAME - 1 && phase === 'complete';

  // Render tier section
  const renderTierSection = (tier: GenreTier) => {
    const genres = genresByTier[tier];
    const info = TIER_INFO[tier];

    return (
      <div key={tier} className="space-y-2">
        {/* Tier Header */}
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'text-xs font-bold uppercase tracking-wider',
              tier === 'niche' && 'text-accent',
              tier === 'mid-tier' && 'text-primary',
              tier === 'popular' && 'text-muted-foreground',
            )}
          >
            {info.stars} {info.label}
          </span>
          <span className="text-[10px] text-muted-foreground opacity-70">
            (+{TIER_POINTS[tier].correct} / {TIER_POINTS[tier].incorrect})
          </span>
        </div>

        {/* Genre Chips */}
        <div className="flex flex-wrap gap-2">
          {genres.map((genre) => (
            <GenreChip
              key={genre.id}
              ref={(el) => {
                if (el) chipRefs.current.set(genre.id, el);
              }}
              genre={genre}
              state={getChipState(genre)}
              onClick={() => handleGenreClick(genre.id)}
              disabled={phase !== 'selecting'}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <GameBackground className="h-[100dvh] !min-h-0 overflow-hidden md:h-auto md:min-h-screen md:overflow-visible">
      <GameLayout
        className="h-[100dvh] !min-h-0 overflow-hidden md:h-auto md:min-h-screen md:overflow-visible w-full max-w-7xl mx-auto"
        top={
          <div className="flex justify-between items-start p-4 md:p-8 w-full relative z-[60]">
            <GameRoundIndicator currentRound={currentFilmIndex + 1} totalRounds={FILMS_PER_GAME} />
            <ScorePanel
              score={totalScore}
              pointsEarned={lastPointsEarned}
              flyFromPosition={flyFromPosition ?? undefined}
              maxScore={150}
              showMaxScore={true}
              label="Score"
              size="lg"
              position="static"
            />
          </div>
        }
        middle={
          <div className="w-full max-w-4xl mx-auto flex flex-col md:flex-row gap-6 md:gap-8 px-4 md:px-8 flex-1 min-h-0 justify-center items-center">
            {/* Movie Card Section */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentFilm.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="w-full max-w-[180px] md:max-w-[260px] shrink-0"
              >
                <MovieCard
                  title={currentFilm.title}
                  year={currentFilm.year}
                  director={currentFilm.director}
                  posterUrl={currentFilm.posterUrl}
                  layout="below"
                />
              </motion.div>
            </AnimatePresence>

            {/* Genre Selection Panel */}
            <motion.div
              className="flex-1 bg-card/80 rounded-xl border border-border/50 p-4 md:p-6 space-y-4 shadow-lg max-w-lg"
              layout
            >
              <div className="text-center mb-2">
                <h2 className="text-lg md:text-xl font-serif font-bold text-foreground">
                  Which genres belong to this film?
                </h2>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">
                  Select genres you think are correct
                </p>
              </div>

              <div className="space-y-4">
                {renderTierSection('niche')}
                {renderTierSection('mid-tier')}
                {renderTierSection('popular')}
              </div>
            </motion.div>
          </div>
        }
        bottom={
          <div className="shrink-0 flex justify-center w-full py-4 md:py-8 min-h-[80px] md:min-h-[100px]">
            <div className="h-12 md:h-14 flex items-center gap-3">
              {phase === 'selecting' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Button
                    onClick={handleLock}
                    size="lg"
                    className="px-6 md:px-8 py-3 md:py-4 h-auto text-base md:text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
                    disabled={selectedGenreIds.size === 0}
                  >
                    <Lock className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                    Lock It In
                  </Button>
                </motion.div>
              )}

              {phase === 'revealing' && (
                <Button size="lg" disabled className="px-6 py-3 h-auto rounded-xl opacity-60">
                  Revealing...
                </Button>
              )}

              {phase === 'complete' && !isGameComplete && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    onClick={handleNext}
                    size="lg"
                    className="px-6 py-3 h-auto rounded-xl font-semibold"
                  >
                    Next Film
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </motion.div>
              )}

              {isGameComplete && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    onClick={handleReset}
                    size="lg"
                    variant="outline"
                    className="px-6 py-3 h-auto rounded-xl font-semibold"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Play Again
                  </Button>
                </motion.div>
              )}
            </div>
          </div>
        }
      />
    </GameBackground>
  );
}
