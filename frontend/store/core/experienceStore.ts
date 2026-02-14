import { create } from 'zustand';
import { pollMetricsStatus, fetchFullStats as apiFetchFullStats } from '@/lib/api';
import type { UserStats, Genre, GenreGameData, MetricsResponse } from '@/lib/api';
import { GamePhase, GAME_PHASES } from '@/lib/gameTypes';

// Re-export types for backwards compatibility
export type { UserStats, Genre, GenreGameData };

interface ExperienceState {
  currentPhase: GamePhase;
  scores: {
    rating: number;
    genre: number;
    theme: number;
  };
  unlockedGames: string[];
  completedGames: string[];
  backgroundStatus: 'idle' | 'processing' | 'partial_ready' | 'ready';
  username: string | null;
  userStats: UserStats | null;

  // Actions
  completeRatingGame: (score: number) => void;
  startGenreGame: () => void;
  startRatingGame: () => void;
  completeGenreGame: (score: number) => void;
  startThemeExperience: () => void;
  completeThemeExperience: (score: number) => void;
  resetExperience: () => void;
  setProcessing: (username: string) => void;
  setPartialReady: () => void;
  setReady: () => void;
  pollBackgroundStatus: () => Promise<(MetricsResponse & { isPartial?: boolean }) | null>;
  fetchFullStats: () => Promise<{ userStats: UserStats; genreGame: GenreGameData }>;
}

export const useExperienceStore = create<ExperienceState>((set, get) => ({
  currentPhase: GAME_PHASES.RATING,
  scores: {
    rating: 0,
    genre: 0,
    theme: 0,
  },
  unlockedGames: [GAME_PHASES.RATING],
  completedGames: [],
  backgroundStatus: 'idle',
  username: null,

  userStats: null,

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
      backgroundStatus: 'idle',
      username: null,
      userStats: null,
    }),

  setProcessing: (username) => set({ backgroundStatus: 'processing', username }),
  setPartialReady: () => set({ backgroundStatus: 'partial_ready' }),
  setReady: () => set({ backgroundStatus: 'ready' }),

  pollBackgroundStatus: async () => {
    const { username, backgroundStatus } = get();
    // Continue polling during 'processing' and 'partial_ready' until we get 'ready'
    if (!username || (backgroundStatus !== 'processing' && backgroundStatus !== 'partial_ready'))
      return null;

    try {
      const data = await pollMetricsStatus(username);

      // PROGRESSIVE LOADING HANDLING
      if (data.status === 'partial_ready' && data.ratingGame) {
        set({ backgroundStatus: 'partial_ready' });
        return {
          ...data,
          isPartial: true,
        };
      }

      // If ready, cache the stats
      if (data.status === 'ready' && data.userStats) {
        set({ userStats: data.userStats });
      }

      return data;
    } catch (err) {
      console.error('Failed to check status:', err);
      return null;
    }
  },

  fetchFullStats: async () => {
    const { username, userStats } = get();
    if (!username) throw new Error('No username');

    // Return cached stats if available
    if (userStats) {
      return {
        userStats,
        genreGame: { genres: [], actualRanking: [] },
      } as { userStats: UserStats; genreGame: GenreGameData };
      // Note: We might need genreGame too, but usually fetchFullStats is called for stats.
      // Actually, looking at usages, it expects internal structure.
      // Let's safe-guard: if we have userStats, do we have genreGame?
      // The store doesn't seem to cache genreGame separate from components.
      // But for PostGameScreen, we only need userStats.
    }

    const data = await apiFetchFullStats(username);

    if (data.userStats) {
      set({ userStats: data.userStats });
    }

    return data as { userStats: UserStats; genreGame: GenreGameData };
  },
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
