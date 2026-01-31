'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import { MOCK_FILMS, MOCK_GENRES, ANIMATION_TIMING } from './constants';
import { Genre, GenreTier, GamePhase, ChipDisplayState } from './types';
import { useGenreMatchingStore } from '@/store/genre/matchingStore';
import { ScoringConfig } from '@/lib/api';

export interface UseGenreMatchingGameReturn {
  // State
  currentFilmIndex: number;
  currentFilm: {
    id: string;
    title: string;
    year: number;
    director?: string;
    posterUrl: string;
    correctGenreIds: string[];
    theoreticalMax?: number;
    genreScoring?: Record<string, { correct: number; penalty: number }>;
  };
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
  getGenre: (id: string) => Genre | undefined;
  getGenrePoints: (genreId: string) => { correct: number; penalty: number };

  // Actions
  handleGenreClick: (genreId: string) => void;
  handleLock: () => void;
  handleNext: () => void;
  handleReset: () => void;
  clearSelections: () => void;

  // Config
  // Config
  scoringConfig: ScoringConfig;
  maxPositivePoints: number;
  maxNegativePoints: number;
  roundScore: number;
  totalGameMaxScore: number;
}

export function useGenreMatchingGame(): UseGenreMatchingGameReturn {
  const { rounds, rarityMap, currentIndex, isActive, nextRound, resetGame, config } =
    useGenreMatchingStore();

  // Local Game state (per round stuff that doesn't need to be global maybe?)
  // Actually currentIndex is global.
  // collectedGenreIds is local to the round interface.

  const [collectedGenreIds, setCollectedGenreIds] = useState<Set<string>>(new Set());
  const [phase, setPhase] = useState<GamePhase>('selecting');
  const [evaluatedGenres, setEvaluatedGenres] = useState<
    Map<string, 'correct' | 'incorrect' | 'missed'>
  >(new Map());

  // We keep a running local score for the UI, synced with store when confirmed?
  // Or just use local state for the game session.
  const [totalScore, setTotalScore] = useState(0);
  const [lastPointsEarned, setLastPointsEarned] = useState<number | null>(null);

  const [heldIncorrectIds, setHeldIncorrectIds] = useState<Set<string>>(new Set());
  const [flyFromPosition, setFlyFromPosition] = useState<{ x: number; y: number } | undefined>();

  // Ref for reveal timeout
  const revealTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Map to store refs for each genre chip element
  const chipRefsMap = useRef<Map<string, HTMLButtonElement>>(new Map());

  // Use effective data (fallback to mocks if inactive/empty for testing dev flow only if needed,
  // but better to rely on real data if active)
  const hasRealData = isActive && rounds.length > 0;

  console.log('useGenreMatchingGame: State', {
    isActive,
    roundsLength: rounds.length,
    hasRealData,
  });

  const currentFilmIndex = hasRealData ? currentIndex : 0;
  const films = hasRealData ? rounds : MOCK_FILMS;
  const currentFilmRaw = films[currentFilmIndex] || films[0];

  // Adapter for film object structure differences if any
  const currentFilm = useMemo(
    () => ({
      id: currentFilmRaw.id,
      title: currentFilmRaw.title,
      year: parseInt(String(currentFilmRaw.year)),
      posterUrl: currentFilmRaw.posterUrl,
      correctGenreIds: currentFilmRaw.correctGenres || [],
      director: currentFilmRaw.director || '',
      genreScoring: currentFilmRaw.genreScoring || {},
      theoreticalMax: currentFilmRaw.theoreticalMax || 0,
    }),
    [currentFilmRaw],
  );

  const correctGenreIds = useMemo(
    () => new Set(currentFilm.correctGenreIds),
    [currentFilm.correctGenreIds],
  );

  // Generate Genre Objects from Rarity Map
  const allGenres = useMemo(() => {
    if (!hasRealData) return MOCK_GENRES;

    return Object.entries(rarityMap).map(([name, tierRaw]) => {
      // Map backend 'mid' to frontend 'mid-tier'
      let tier: GenreTier = 'niche';
      if (tierRaw === 'popular') tier = 'popular';
      else if (tierRaw === 'mid' || tierRaw === 'mid-tier') tier = 'mid-tier';
      // else niche

      return {
        id: name, // Name is ID for now as we key by string
        name: name,
        tier,
      };
    });
  }, [rarityMap, hasRealData]);

  // Group genres by tier
  const genresByTier = useMemo(() => {
    return allGenres.reduce(
      (acc, genre) => {
        if (acc[genre.tier]) {
          acc[genre.tier].push(genre);
        }
        return acc;
      },
      { niche: [], 'mid-tier': [], popular: [] } as Record<GenreTier, Genre[]>,
    );
  }, [allGenres]);

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
        const next = new Set<string>(prev);
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

  // Points derived from the current film's specific scoring distribution
  const scoringMap = useMemo(() => {
    if (!currentFilm || !currentFilm.genreScoring) {
      return {};
    }
    return currentFilm.genreScoring;
  }, [currentFilm]);

  const getGenrePoints = useCallback(
    (genreId: string) => {
      // 1. Try specific scoring from backend (for correct genres)
      if (scoringMap && scoringMap[genreId]) {
        return scoringMap[genreId];
      }

      // 2. Fallback: Calculate generic penalty for this genre's tier
      // (Used for incorrect guesses that aren't in the correctGenres list)
      const genre = allGenres.find((g) => g.id === genreId);
      if (genre) {
        const tier = genre.tier;
        const weight = config.scoring.WEIGHTS[tier] || 1;
        const penaltyFactor = config.scoring.PENALTY_FACTOR || 0.75;

        // Calculate theoretical penalty based on weight
        // default to at least -1
        const calculatedPenalty = -Math.max(1, Math.floor(weight * penaltyFactor));

        return { correct: weight, penalty: calculatedPenalty };
      }

      return { correct: 0, penalty: 0 };
    },
    [scoringMap, allGenres, config.scoring],
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
    // Find genre object
    const genre = allGenres.find((g) => g.id === genreId);

    // Determine result
    let result: 'correct' | 'incorrect' | 'missed';
    if (wasSelected && isCorrect) {
      result = 'correct';
    } else if (wasSelected && !isCorrect) {
      result = 'incorrect';
    } else {
      result = 'missed';
      // If we are showing missed, update phase?
      // Logic from before: "if (index === selectedCount) setPhase('showing-missed')"
      // We need to know when we switch from checking selections to showing missed.
      // queue = [...selectedList, ...missedList]
      // index will reach selectedList.length eventually.
    }

    // Check phase transition
    // Note: This relies on queue order: selections first, then missed.
    // Ideally we check if 'wasSelected' is false, it means we are in missed section?
    if (!wasSelected && phase !== 'showing-missed') {
      setPhase('showing-missed');
    }

    // Calculate points
    let points = 0;
    if (genre) {
      const gPoints = getGenrePoints(genre.id);
      if (result === 'correct') {
        points = gPoints.correct || 0;
      } else if (result === 'incorrect') {
        points = gPoints.penalty || 0;
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

    const selectedList = Array.from(collectedGenreIds); // Order might be insertion order
    // Better to filter allGenres to keep consistent order or just use set iteration

    const missedList = allGenres
      .filter((g) => correctGenreIds.has(g.id) && !collectedGenreIds.has(g.id))
      .map((g) => g.id);

    const queue = [...selectedList, ...missedList];

    setTimeout(() => {
      setPhase('revealing');
      revealNext(queue, 0);
    }, ANIMATION_TIMING.REVEAL_DELAY_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectedGenreIds, correctGenreIds, allGenres]);

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
    if (currentFilmIndex < films.length - 1) {
      nextRound(); // Update store index
      resetRoundState();
    }
  }, [currentFilmIndex, resetRoundState, nextRound, films.length]);

  // Reset entire game
  const handleReset = useCallback(() => {
    resetGame(); // Reset store
    setTotalScore(0);
    resetRoundState();
  }, [resetRoundState, resetGame]);

  // Clear selections
  const clearSelections = useCallback(() => {
    setCollectedGenreIds(new Set());
  }, []);

  const isGameComplete = currentFilmIndex === films.length - 1 && phase === 'complete';
  const canLock = phase === 'selecting' && collectedGenreIds.size > 0;

  // Get collected genres for display
  const collectedGenres = useMemo(() => {
    return allGenres.filter((g) => isInCollectedZone(g.id));
  }, [isInCollectedZone, allGenres]);

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

    getGenre: (id: string) => allGenres.find((g) => g.id === id),
    getGenrePoints,
    // Actions
    handleGenreClick,
    handleLock,
    handleNext,
    handleReset,
    clearSelections,
    scoringConfig: config.scoring,

    // Dynamic scoring bounds for UI
    maxPositivePoints: useMemo(() => {
      // Find maximum possible correct score among available genres
      return allGenres.reduce((max, genre) => {
        const points = getGenrePoints(genre.id);
        return Math.max(max, points.correct);
      }, 0);
    }, [allGenres, getGenrePoints]),

    maxNegativePoints: useMemo(() => {
      // Find maximum possible penalty (most negative number) among available genres
      return allGenres.reduce((min, genre) => {
        const points = getGenrePoints(genre.id);
        return Math.min(min, points.penalty);
      }, 0);
    }, [allGenres, getGenrePoints]),

    // Current Accumulated Round Score (for this specific movie)
    roundScore: useMemo(() => {
      let score = 0;
      evaluatedGenres.forEach((result, genreId) => {
        const pts = getGenrePoints(genreId);
        if (result === 'correct') score += pts.correct;
        else if (result === 'incorrect') score += pts.penalty;
      });
      return score;
    }, [evaluatedGenres, getGenrePoints]),

    // Total possible score for the entire game session
    totalGameMaxScore: useMemo(() => {
      return films.reduce((sum, film) => sum + (film.theoreticalMax || 20), 0);
    }, [films]),
  };
}
