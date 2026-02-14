import { create } from 'zustand';

export type ThemePhase = 'guessing' | 'revealed';

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
export const HINT_SCORE_MAP: Record<number, number> = {
  0: 20, // Correct on first try (no hints)
  1: 15, // Correct after 1 hint (year)
  2: 10, // Correct after 2 hints (year + rating)
  3: 5, // Correct after 3 hints (year + rating + director)
};

interface ThemeStoreState {
  phase: ThemePhase;
  currentRoundIndex: number;
  userGuess: string;
  hintLevel: number; // 0–3
  wrongGuessShake: boolean;
  score: number;
  roundScore: number | null; // last round's score delta (null = not yet scored)

  // Actions
  setUserGuess: (guess: string) => void;
  submitGuess: (correctTitle: string) => void;
  nextRound: (totalRounds: number) => 'next' | 'complete';
  resetThemeExperience: () => void;
}

import { isFuzzyMatch } from '@/lib/fuzzyMatch';

export const useThemeStore = create<ThemeStoreState>((set, get) => ({
  phase: 'guessing',
  currentRoundIndex: 0,
  userGuess: '',
  hintLevel: 0,
  wrongGuessShake: false,
  score: 0,
  roundScore: null,

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

  nextRound: (totalRounds) => {
    const { currentRoundIndex } = get();
    if (currentRoundIndex + 1 >= totalRounds) {
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

  resetThemeExperience: () =>
    set({
      phase: 'guessing',
      currentRoundIndex: 0,
      userGuess: '',
      hintLevel: 0,
      wrongGuessShake: false,
      score: 0,
      roundScore: null,
    }),
}));
