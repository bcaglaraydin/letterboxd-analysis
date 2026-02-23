import { create } from 'zustand';

export type ThemePhase = 'guessing' | 'revealed' | 'sorting' | 'results';

/**
 * Progressive hint levels (driven by wrong guesses):
 *   0 = themes + genre only
 *   1 = + year
 *   2 = + user rating
 *   3 = + director
 * After level 3, the next wrong guess reveals the answer.
 */
export const MAX_HINT_LEVEL = 3;

/** Points awarded based on how many hints were needed */
import { ThemeRound } from '@/components/game/theme/types';
export const HINT_SCORE_MAP: Record<number, number> = {
  0: 20, // Correct on first try (no hints)
  1: 15, // Correct after 1 hint (year)
  2: 10, // Correct after 2 hints (year + rating)
  3: 5, // Correct after 3 hints (year + rating + director)
};

import { ThemeSortingRound } from '@/lib/api';

export const SORTING_POINTS = {
  CORRECT: 10,
  INCORRECT: 0,
};

interface ThemeStoreState {
  rounds: ThemeRound[];
  sortingRounds: ThemeSortingRound[];
  phase: ThemePhase;
  currentRoundIndex: number;
  currentSortingIndex: number;
  userGuess: string;
  hintLevel: number; // 0–3
  wrongGuessShake: boolean;
  score: number;
  sortingScore: number;
  roundScore: number | null; // last round's score delta (null = not yet scored)
  sortingLastPoints: number | null;

  // Actions
  initThemeGame: (rounds: ThemeRound[], sortingRounds: ThemeSortingRound[]) => void;
  setUserGuess: (guess: string) => void;
  submitGuess: (correctTitle: string) => void;
  nextRound: () => 'next' | 'complete';
  handleThemeSwipe: (type: 'favorite' | 'least_favorite') => void;
  resetThemeExperience: () => void;
}

import { isFuzzyMatch } from '@/lib/fuzzyMatch';

export const useThemeStore = create<ThemeStoreState>((set, get) => ({
  rounds: [],
  sortingRounds: [],
  phase: 'guessing',
  currentRoundIndex: 0,
  currentSortingIndex: 0,
  userGuess: '',
  hintLevel: 0,
  wrongGuessShake: false,
  score: 0,
  sortingScore: 0,
  roundScore: null,
  sortingLastPoints: null,

  initThemeGame: (rounds, sortingRounds) =>
    set({
      rounds,
      sortingRounds,
      currentRoundIndex: 0,
      currentSortingIndex: 0,
      score: 0,
      sortingScore: 0,
      phase: 'guessing',
    }),

  setUserGuess: (guess) => set({ userGuess: guess }),

  submitGuess: (correctTitle) => {
    const { userGuess, hintLevel, score } = get();
    const isCorrect = isFuzzyMatch(userGuess, correctTitle);

    if (isCorrect) {
      const earned = HINT_SCORE_MAP[hintLevel] ?? 0;
      set({
        phase: 'revealed',
        wrongGuessShake: false,
        score: score + earned,
        roundScore: earned,
      });
      return;
    }

    // Wrong guess
    if (hintLevel >= MAX_HINT_LEVEL) {
      // All hints exhausted → reveal answer, 0 points
      set({
        phase: 'revealed',
        wrongGuessShake: false,
        roundScore: 0,
      });
    } else {
      // Unlock next hint, clear input, trigger shake
      set({
        hintLevel: hintLevel + 1,
        userGuess: '',
        wrongGuessShake: true,
      });
      setTimeout(() => set({ wrongGuessShake: false }), 500);
    }
  },

  nextRound: () => {
    const { currentRoundIndex, rounds } = get();
    if (currentRoundIndex + 1 >= rounds.length) {
      set({ phase: 'results' });
      return 'complete';
    }
    set({
      currentRoundIndex: currentRoundIndex + 1,
      phase: 'guessing',
      userGuess: '',
      hintLevel: 0,
      wrongGuessShake: false,
      roundScore: null,
    });
    return 'next';
  },

  handleThemeSwipe: (guessType) => {
    const { sortingRounds, currentSortingIndex, sortingScore } = get();
    const currentRound = sortingRounds[currentSortingIndex];
    if (!currentRound) return;

    const isCorrect = currentRound.type === guessType;
    const points = isCorrect ? SORTING_POINTS.CORRECT : SORTING_POINTS.INCORRECT;

    set({
      sortingScore: Math.max(0, sortingScore + points),
      sortingLastPoints: points,
    });

    // Move to next sorting round after a tiny delay for animation, or immediately
    // Wait for the UI component to actually call next after animation,
    // or we can increment it here. We'll increment here to keep state simple.
    if (currentSortingIndex + 1 >= sortingRounds.length) {
      setTimeout(() => set({ phase: 'results' }), 1000); // Wait 1s for last animation before complete
    } else {
      set({ currentSortingIndex: currentSortingIndex + 1 });
    }
  },

  resetThemeExperience: () =>
    set({
      phase: 'guessing',
      currentRoundIndex: 0,
      currentSortingIndex: 0,
      userGuess: '',
      hintLevel: 0,
      wrongGuessShake: false,
      score: 0,
      sortingScore: 0,
      roundScore: null,
      sortingLastPoints: null,
    }),
}));
