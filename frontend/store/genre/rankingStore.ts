"use client";

import { create } from "zustand";

export interface Genre {
  id: string;
  name: string;
  averageRating?: number;
}

interface GenreGameState {
  // Game flow
  phase: "intro" | "ranking" | "confirming" | "reveal" | "complete";

  // Genres
  genres: Genre[];
  userRanking: string[]; // Genre IDs in user's ranked order
  actualRanking: string[]; // Correct order (from backend)

  // Score
  previousScore: number; // Score from previous games
  currentScore: number; // Score for this game (0-100)

  // Actions
  startGame: (data: {
    genres: Genre[];
    actualRanking: string[];
    previousScore: number;
  }) => void;
  setUserRanking: (ranking: string[]) => void;
  moveGenre: (fromIndex: number, toIndex: number) => void;
  confirmRanking: () => void;
  nextPhase: () => void;
  resetGame: () => void;
}

// Generate consistent color from genre name
export const genreToColor = (name: string): string => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 40%, 42%)`; // Earthy saturation/lightness
};

// Calculate score based on ranking distance (0-100)
// Each position error costs points. Closer = more points.
const calculateScore = (
  userRanking: string[],
  actualRanking: string[],
): number => {
  const n = userRanking.length; // 8 genres
  let totalError = 0;

  for (let i = 0; i < n; i++) {
    const genreId = userRanking[i];
    const actualPosition = actualRanking.indexOf(genreId);
    totalError += Math.abs(i - actualPosition);
  }

  // Max possible error for n=8 is 32 (complete reversal: 0+2+4+6+6+4+2+0 = 24 average case, worst = 32)
  // Scale: 100 - (totalError * scaling factor)
  // With 8 items, max error = 32, so each error point costs ~3.125 points
  const maxError = 32;
  const score = Math.max(0, Math.round(100 - (totalError / maxError) * 100));

  return score;
};

export const useGenreRankingStore = create<GenreGameState>((set, get) => ({
  phase: "intro",
  genres: [],
  userRanking: [],
  actualRanking: [],
  previousScore: 0,
  currentScore: 0,

  startGame: (data) => {
    // Shuffle genres for initial display
    const shuffled = [...data.genres].sort(() => Math.random() - 0.5);
    set({
      phase: "ranking",
      genres: data.genres,
      userRanking: shuffled.map((g) => g.id), // Start with shuffled order
      actualRanking: data.actualRanking,
      previousScore: data.previousScore,
      currentScore: 0,
    });
  },

  setUserRanking: (ranking) => set({ userRanking: ranking }),

  moveGenre: (fromIndex, toIndex) => {
    const { userRanking } = get();
    const newRanking = [...userRanking];
    const [removed] = newRanking.splice(fromIndex, 1);
    newRanking.splice(toIndex, 0, removed);
    set({ userRanking: newRanking });
  },

  confirmRanking: () => {
    const { userRanking, actualRanking } = get();
    const score = calculateScore(userRanking, actualRanking);
    set({
      phase: "reveal",
      currentScore: score,
    });
  },

  nextPhase: () => {
    const { phase } = get();
    if (phase === "intro") set({ phase: "ranking" });
    else if (phase === "ranking") set({ phase: "confirming" });
    else if (phase === "reveal") set({ phase: "complete" });
  },

  resetGame: () =>
    set({
      phase: "intro",
      genres: [],
      userRanking: [],
      actualRanking: [],
      currentScore: 0,
    }),
}));
