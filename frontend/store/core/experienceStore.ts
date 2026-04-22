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
    taste: number;
    habits: number;
  };
  unlockedGames: string[];
  completedGames: string[];
  userEnjoymentChoice: 'fun' | 'dk' | null;
  habitsPhase: 'intro' | 'actor' | 'duration' | 'map-intro' | 'map';

  // Actions
  setUserEnjoymentChoice: (choice: 'fun' | 'dk') => void;
  setHabitsPhase: (phase: 'intro' | 'actor' | 'duration' | 'map-intro' | 'map') => void;
  completeRatingGame: (score: number) => void;
  startGenreGame: () => void;
  startRatingGame: () => void;
  completeGenreGame: (score: number) => void;
  startThemeExperience: () => void;
  completeThemeExperience: (score: number) => void;
  startTastePositioning: () => void;
  completeTastePositioning: (score: number) => void;
  startHabitsExperience: () => void;
  completeHabitsExperience: (score: number) => void;
  startRecap: () => void;
  resetExperience: () => void;
}

export const useExperienceStore = create<ExperienceState>((set) => ({
  currentPhase: GAME_PHASES.RATING,
  scores: {
    rating: 0,
    genre: 0,
    theme: 0,
    taste: 0,
    habits: 0,
  },
  unlockedGames: [GAME_PHASES.RATING],
  completedGames: [],
  userEnjoymentChoice: null,
  habitsPhase: 'intro',

  setUserEnjoymentChoice: (choice) => set({ userEnjoymentChoice: choice }),
  setHabitsPhase: (phase) => set({ habitsPhase: phase }),

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
      unlockedGames: [...new Set([...state.unlockedGames, GAME_PHASES.TASTE_POSITIONING])],
      completedGames: [...new Set([...state.completedGames, GAME_PHASES.THEME])],
      currentPhase: GAME_PHASES.HUB,
    })),

  startTastePositioning: () =>
    set({
      currentPhase: GAME_PHASES.TASTE_POSITIONING,
    }),

  completeTastePositioning: (score) =>
    set((state) => ({
      scores: { ...state.scores, taste: score },
      unlockedGames: [...new Set([...state.unlockedGames, GAME_PHASES.HABITS])],
      completedGames: [...new Set([...state.completedGames, GAME_PHASES.TASTE_POSITIONING])],
      currentPhase: GAME_PHASES.HUB,
    })),

  startHabitsExperience: () =>
    set({
      currentPhase: GAME_PHASES.HABITS,
    }),

  completeHabitsExperience: (score) =>
    set((state) => ({
      scores: { ...state.scores, habits: score },
      completedGames: [...new Set([...state.completedGames, GAME_PHASES.HABITS])],
      currentPhase: GAME_PHASES.HUB,
    })),

  startRecap: () =>
    set({
      currentPhase: GAME_PHASES.RECAP,
    }),

  resetExperience: () =>
    set({
      currentPhase: GAME_PHASES.RATING,
      scores: { rating: 0, genre: 0, theme: 0, taste: 0, habits: 0 },
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
export const selectIsTasteCompleted = (state: ExperienceState) =>
  state.completedGames.includes(GAME_PHASES.TASTE_POSITIONING);
export const selectIsTasteUnlocked = (state: ExperienceState) =>
  state.unlockedGames.includes(GAME_PHASES.TASTE_POSITIONING);
export const selectIsHabitsCompleted = (state: ExperienceState) =>
  state.completedGames.includes(GAME_PHASES.HABITS);
export const selectIsHabitsUnlocked = (state: ExperienceState) =>
  state.unlockedGames.includes(GAME_PHASES.HABITS);
export const selectAllGamesCompleted = (state: ExperienceState) =>
  state.completedGames.includes(GAME_PHASES.RATING) &&
  state.completedGames.includes(GAME_PHASES.GENRE) &&
  state.completedGames.includes(GAME_PHASES.THEME) &&
  state.completedGames.includes(GAME_PHASES.TASTE_POSITIONING) &&
  state.completedGames.includes(GAME_PHASES.HABITS);

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

export const selectTasteGameStatus = (state: ExperienceState): GameStatus => {
  if (state.completedGames.includes(GAME_PHASES.TASTE_POSITIONING)) return 'COMPLETED';
  if (state.unlockedGames.includes(GAME_PHASES.TASTE_POSITIONING)) return 'UNLOCKED';
  return 'LOCKED';
};

export const selectHabitsGameStatus = (state: ExperienceState): GameStatus => {
  if (state.completedGames.includes(GAME_PHASES.HABITS)) return 'COMPLETED';
  if (state.unlockedGames.includes(GAME_PHASES.HABITS)) return 'UNLOCKED';
  return 'LOCKED';
};
