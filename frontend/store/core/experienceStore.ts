import { create } from 'zustand';
import type { UserStats, Genre, GenreGameData } from '@/lib/api';
import { GamePhase, GAME_PHASES } from '@/lib/gameTypes';

// Re-export types for backwards compatibility
export type { UserStats, Genre, GenreGameData };

export type GameStatus = 'LOCKED' | 'UNLOCKED' | 'COMPLETED';

interface ExperienceState {
  currentPhase: GamePhase | null;
  scores: {
    rating: number;
    genre: number;
    theme: number;
  };
  unlockedGames: string[];
  completedGames: string[];

  // Actions
  completeRatingGame: (score: number) => void;
  startGenreGame: () => void;
  startRatingGame: () => void;
  completeGenreGame: (score: number) => void;
  startThemeExperience: () => void;
  completeThemeExperience: (score: number) => void;
  resetExperience: () => void;
}

export const useExperienceStore = create<ExperienceState>((set) => ({
  currentPhase: GAME_PHASES.RATING,
  scores: {
    rating: 0,
    genre: 0,
    theme: 0,
  },
  unlockedGames: [GAME_PHASES.RATING],
  completedGames: [],

  completeRatingGame: (score) =>
    set((state) => ({
      scores: { ...state.scores, rating: score },
      unlockedGames: [...new Set([...state.unlockedGames, GAME_PHASES.GENRE])],
      completedGames: [...new Set([...state.completedGames, GAME_PHASES.RATING])],
      currentPhase: GAME_PHASES.HUB,
    })),

  startGenreGame: () =>
    set({
      currentPhase: GAME_PHASES.GENRE,
    }),

  startRatingGame: () =>
    set({
      currentPhase: GAME_PHASES.RATING,
    }),

  completeGenreGame: (score) =>
    set((state) => ({
      scores: { ...state.scores, genre: score },
      unlockedGames: [...new Set([...state.unlockedGames, GAME_PHASES.THEME])],
      completedGames: [...new Set([...state.completedGames, GAME_PHASES.GENRE])],
      currentPhase: GAME_PHASES.HUB,
    })),

  startThemeExperience: () =>
    set({
      currentPhase: GAME_PHASES.THEME,
    }),

  completeThemeExperience: (score) =>
    set((state) => ({
      scores: { ...state.scores, theme: score },
      completedGames: [...new Set([...state.completedGames, GAME_PHASES.THEME])],
      currentPhase: GAME_PHASES.HUB,
    })),

  resetExperience: () =>
    set({
      currentPhase: GAME_PHASES.RATING,
      scores: { rating: 0, genre: 0, theme: 0 },
      unlockedGames: [GAME_PHASES.RATING],
      completedGames: [],
    }),
}));

// Selectors
export const selectScores = (state: ExperienceState) => state.scores;
export const selectCurrentPhase = (state: ExperienceState) => state.currentPhase;
export const selectIsRatingCompleted = (state: ExperienceState) =>
  state.completedGames.includes(GAME_PHASES.RATING);
export const selectIsGenreCompleted = (state: ExperienceState) =>
  state.completedGames.includes(GAME_PHASES.GENRE);
export const selectIsGenreUnlocked = (state: ExperienceState) =>
  state.unlockedGames.includes(GAME_PHASES.GENRE);
export const selectIsThemeCompleted = (state: ExperienceState) =>
  state.completedGames.includes(GAME_PHASES.THEME);
export const selectIsThemeUnlocked = (state: ExperienceState) =>
  state.unlockedGames.includes(GAME_PHASES.THEME);
export const selectAllGamesCompleted = (state: ExperienceState) =>
  state.completedGames.includes(GAME_PHASES.RATING) &&
  state.completedGames.includes(GAME_PHASES.GENRE) &&
  state.completedGames.includes(GAME_PHASES.THEME);

// Derived Status Selectors
export const selectRatingGameStatus = (state: ExperienceState): GameStatus => {
  if (state.completedGames.includes(GAME_PHASES.RATING)) return 'COMPLETED';
  return 'UNLOCKED'; // Rating game is always unlocked initially
};

export const selectGenreGameStatus = (state: ExperienceState): GameStatus => {
  if (state.completedGames.includes(GAME_PHASES.GENRE)) return 'COMPLETED';
  if (state.unlockedGames.includes(GAME_PHASES.GENRE)) return 'UNLOCKED';
  return 'LOCKED';
};

export const selectThemeGameStatus = (state: ExperienceState): GameStatus => {
  if (state.completedGames.includes(GAME_PHASES.THEME)) return 'COMPLETED';
  if (state.unlockedGames.includes(GAME_PHASES.THEME)) return 'UNLOCKED';
  return 'LOCKED';
};
