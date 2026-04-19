import { create } from 'zustand';

export interface TasteMovie {
  id: string;
  title: string;
  posterUrl: string;
  popularity: number; // 0 (Niche) to 1 (Popular)
  userRating: number;
  communityRating: number;
  ratingDiff: number;
  divergence: number; // 0 (Consensus) to 1 (Divergence)
}

interface TasteState {
  step: 0 | 1 | 2 | 3;
  isStep1Revealed: boolean;
  isStep2Revealed: boolean;
  guessPopularity: number; // 0 to 1
  guessAlignment: number; // -1 (Critical) to 1 (Generous), 0 is Aligned
  actualPopularity: number;
  actualAlignment: number;
  movies: TasteMovie[];
  score: number;
  step1Score: number;
  step2Score: number;

  // Actions
  setStep: (step: 0 | 1 | 2 | 3) => void;
  setGuessPopularity: (val: number) => void;
  setGuessAlignment: (val: number) => void;
  setMovies: (movies: TasteMovie[], actualPop?: number, actualAlign?: number) => void;
  submitStep1: () => void;
  submitStep2: () => void;
  calculateResults: () => void;
  resetTasteGame: () => void;
}

export const useTasteStore = create<TasteState>((set, get) => ({
  step: 0,
  isStep1Revealed: false,
  isStep2Revealed: false,
  guessPopularity: 0.5,
  guessAlignment: 0.3, // Default to slightly conservative consensus
  actualPopularity: 0,
  actualAlignment: 0,
  movies: [],
  score: 0,
  step1Score: 0,
  step2Score: 0,

  setStep: (step) => set({ step }),
  setGuessPopularity: (guessPopularity) => set({ guessPopularity }),
  setGuessAlignment: (guessAlignment) => set({ guessAlignment }),
  setMovies: (movies: TasteMovie[], actualPop?: number, actualAlign?: number) => {
    // If backend provided pre-calculated centroid, use it.
    // Otherwise, fallback to a simple average (though backend should always provide it now)
    const avgPop = actualPop ?? movies.reduce((acc, m) => acc + m.popularity, 0) / movies.length;
    const avgAlign =
      actualAlign ?? movies.reduce((acc, m) => acc + (m.divergence || 0), 0) / movies.length;

    set({
      movies,
      actualPopularity: avgPop,
      actualAlignment: avgAlign,
    });
  },

  submitStep1: () => {
    const { guessPopularity, actualPopularity } = get();
    const dist = Math.abs(guessPopularity - actualPopularity);
    const step1Score = Math.round(Math.max(0, 50 * (1 - dist)));

    set((state) => ({
      isStep1Revealed: true,
      step1Score,
      score: state.score + step1Score,
    }));
  },

  submitStep2: () => {
    const { guessAlignment, actualAlignment } = get();
    // Max distance is now 1 (since both are 0 to 1)
    const dist = Math.abs(guessAlignment - actualAlignment);
    const step2Score = Math.round(Math.max(0, 50 * (1 - dist)));

    set((state) => ({
      isStep2Revealed: true,
      step2Score,
      score: state.score + step2Score,
    }));
  },

  calculateResults: () => {
    set({ step: 3 });
  },

  resetTasteGame: () =>
    set({
      step: 0,
      isStep1Revealed: false,
      isStep2Revealed: false,
      guessPopularity: 0.5,
      guessAlignment: 0.3,
      score: 0,
      step1Score: 0,
      step2Score: 0,
    }),
}));
