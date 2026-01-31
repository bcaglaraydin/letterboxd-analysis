import { create } from 'zustand';

export interface Genre {
  id: string;
  name: string;
  tier: 'popular' | 'mid-tier' | 'niche'; // Frontend uses 'mid-tier', backend sends 'mid'. Mapping needed.
}

import { GenreMatchingRound, ScoringConfig } from '@/lib/api';

export type MatchingRound = GenreMatchingRound;

export interface MatchingGameConfig {
  scoring: ScoringConfig;
  maxScorePerMovie: number;
}

interface GenreMatchingGameState {
  isActive: boolean;
  rounds: MatchingRound[];
  rarityMap: Record<string, string>; // 'popular' | 'mid' | 'niche'
  config: MatchingGameConfig;

  // Game Play State
  currentIndex: number;
  totalScore: number;

  // Actions
  initGame: (data: {
    rounds: MatchingRound[];
    rarityMap: Record<string, string>;
    scoring: ScoringConfig;
    maxScorePerMovie: number;
  }) => void;
  submitRoundScore: (score: number) => void;
  nextRound: () => void;
  resetGame: () => void;
}

export const useGenreMatchingStore = create<GenreMatchingGameState>((set) => ({
  isActive: false,
  rounds: [],
  rarityMap: {},
  config: {
    scoring: { WEIGHTS: {}, PENALTY_FACTOR: 0.75 },
    maxScorePerMovie: 20,
  },

  currentIndex: 0,
  totalScore: 0,

  initGame: (data) => {
    set({
      isActive: true,
      rounds: data.rounds,
      rarityMap: data.rarityMap,
      config: {
        scoring: data.scoring,
        maxScorePerMovie: data.maxScorePerMovie,
      },
      currentIndex: 0,
      totalScore: 0,
    });
  },

  submitRoundScore: (score) => {
    set((state) => ({ totalScore: state.totalScore + score }));
  },

  nextRound: () => {
    set((state) => ({ currentIndex: state.currentIndex + 1 }));
  },

  resetGame: () => {
    set({
      isActive: false,
      rounds: [],
      currentIndex: 0,
      totalScore: 0,
    });
  },
}));
