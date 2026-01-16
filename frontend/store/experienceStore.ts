import { create } from "zustand";

export type GamePhase = "rating-game" | "hub" | "genre-game";

interface ExperienceState {
  currentPhase: GamePhase;
  scores: {
    rating: number;
    genre: number;
  };
  unlockedGames: string[];
  completedGames: string[];

  // Actions
  completeRatingGame: (score: number) => void;
  startGenreGame: () => void;
  startRatingGame: () => void;
  completeGenreGame: (score: number) => void;
  resetExperience: () => void;
}

export const useExperienceStore = create<ExperienceState>((set) => ({
  currentPhase: "rating-game",
  scores: {
    rating: 0,
    genre: 0,
  },
  unlockedGames: ["rating-game"],
  completedGames: [],

  completeRatingGame: (score) =>
    set((state) => ({
      scores: { ...state.scores, rating: score },
      unlockedGames: [...new Set([...state.unlockedGames, "genre-game"])],
      completedGames: [...new Set([...state.completedGames, "rating-game"])],
      currentPhase: "hub",
    })),

  startGenreGame: () =>
    set({
      currentPhase: "genre-game",
    }),

  startRatingGame: () =>
    set({
      currentPhase: "rating-game",
    }),

  completeGenreGame: (score) =>
    set((state) => ({
      scores: { ...state.scores, genre: score },
      completedGames: [...new Set([...state.completedGames, "genre-game"])],
      currentPhase: "hub",
    })),

  resetExperience: () =>
    set({
      currentPhase: "rating-game",
      scores: { rating: 0, genre: 0 },
      unlockedGames: ["rating-game"],
      completedGames: [],
    }),
}));
