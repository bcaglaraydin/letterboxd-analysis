'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import { MOCK_FILMS, MOCK_GENRES, FILMS_PER_GAME, ANIMATION_TIMING } from './constants';
import { Genre, GenreTier, GamePhase, TIER_POINTS, ChipDisplayState } from './types';

export interface UseGenreMatchingGameReturn {
  // State
  currentFilmIndex: number;
  currentFilm: (typeof MOCK_FILMS)[0];
  phase: GamePhase;
  totalScore: number;
  lastPointsEarned: number | null;
  collectedGenreIds: Set<string>;
  evaluatedGenres: Map<string, 'correct' | 'incorrect' | 'missed'>;
  flyFromPosition: { x: number; y: number } | undefined;
  isGameComplete: boolean;
  canLock: boolean;

  // Derived data
  correctGenreIds: Set<string>;
  genresByTier: Record<GenreTier, Genre[]>;
  collectedGenres: Genre[];

  // Chip ref management
  chipRefsMap: React.MutableRefObject<Map<string, HTMLButtonElement>>;

  // Helpers
  getChipState: (genreId: string) => ChipDisplayState;
  isInCollectedZone: (genreId: string) => boolean;
  getTierGenres: (tier: GenreTier) => Genre[];

  // Actions
  handleGenreClick: (genreId: string) => void;
  handleLock: () => void;
  handleNext: () => void;
  handleReset: () => void;
  clearSelections: () => void;
}

export function useGenreMatchingGame(): UseGenreMatchingGameReturn {
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
  // Map to store refs for each genre chip element
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
      if (heldIncorrectIds.has(genreId)) return true;
      const state = getChipState(genreId);
      return state === 'selected' || state === 'correct' || state === 'missed';
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

  // Reveal function using recursive setTimeout
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
      setHeldIncorrectIds((prev) => new Set(prev).add(genreId));
      setEvaluatedGenres((prev) => new Map(prev).set(genreId, result));

      const chipEl = chipRefsMap.current.get(genreId);
      if (chipEl) {
        const rect = chipEl.getBoundingClientRect();
        setFlyFromPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
      }

      if (points !== 0) {
        setTotalScore((prev) => prev + points);
        setLastPointsEarned(points);
      }

      revealTimeoutRef.current = setTimeout(() => {
        setHeldIncorrectIds((prev) => {
          const next = new Set(prev);
          next.delete(genreId);
          return next;
        });

        setTimeout(() => {
          revealNext(queue, index + 1);
        }, ANIMATION_TIMING.FLY_ANIMATION_MS);
      }, ANIMATION_TIMING.INCORRECT_HOLD_MS);
    } else {
      setEvaluatedGenres((prev) => new Map(prev).set(genreId, result));

      const chipEl = chipRefsMap.current.get(genreId);
      if (chipEl) {
        const rect = chipEl.getBoundingClientRect();
        setFlyFromPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
      }

      if (points !== 0) {
        setTotalScore((prev) => prev + points);
        setLastPointsEarned(points);
      }

      revealTimeoutRef.current = setTimeout(() => {
        revealNext(queue, index + 1);
      }, ANIMATION_TIMING.REVEAL_STEP_MS);
    }
  };

  // Lock selections and start reveal
  const handleLock = useCallback(() => {
    setPhase('locked');

    const selectedList = MOCK_GENRES.filter((g) => collectedGenreIds.has(g.id)).map((g) => g.id);
    const missedList = MOCK_GENRES.filter(
      (g) => correctGenreIds.has(g.id) && !collectedGenreIds.has(g.id),
    ).map((g) => g.id);

    const queue = [...selectedList, ...missedList];

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

  // Clear selections
  const clearSelections = useCallback(() => {
    setCollectedGenreIds(new Set());
  }, []);

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

  return {
    // State
    currentFilmIndex,
    currentFilm,
    phase,
    totalScore,
    lastPointsEarned,
    collectedGenreIds,
    evaluatedGenres,
    flyFromPosition,
    isGameComplete,
    canLock,

    // Derived data
    correctGenreIds,
    genresByTier,
    collectedGenres,

    // Chip ref management
    chipRefsMap,

    // Helpers
    getChipState,
    isInCollectedZone,
    getTierGenres,

    // Actions
    handleGenreClick,
    handleLock,
    handleNext,
    handleReset,
    clearSelections,
  };
}
