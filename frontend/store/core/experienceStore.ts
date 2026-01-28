import { create } from 'zustand';
import { pollMetricsStatus, fetchFullStats as apiFetchFullStats } from '@/lib/api';
import type { UserStats, Genre, GenreGameData, MetricsResponse } from '@/lib/api';

export type GamePhase = 'rating-game' | 'hub' | 'genre-game';

// Re-export types for backwards compatibility
export type { UserStats, Genre, GenreGameData };

interface ExperienceState {
  currentPhase: GamePhase;
  scores: {
    rating: number;
    genre: number;
  };
  unlockedGames: string[];
  completedGames: string[];
  backgroundStatus: 'idle' | 'processing' | 'partial_ready' | 'ready';
  username: string | null;

  // Actions
  completeRatingGame: (score: number) => void;
  startGenreGame: () => void;
  startRatingGame: () => void;
  completeGenreGame: (score: number) => void;
  resetExperience: () => void;
  setProcessing: (username: string) => void;
  setPartialReady: () => void;
  setReady: () => void;
  pollBackgroundStatus: () => Promise<(MetricsResponse & { isPartial?: boolean }) | null>;
  fetchFullStats: () => Promise<{ userStats: UserStats; genreGame: GenreGameData }>;
}

export const useExperienceStore = create<ExperienceState>((set, get) => ({
  currentPhase: 'rating-game',
  scores: {
    rating: 0,
    genre: 0,
  },
  unlockedGames: ['rating-game'],
  completedGames: [],
  backgroundStatus: 'idle',
  username: null,

  completeRatingGame: (score) =>
    set((state) => ({
      scores: { ...state.scores, rating: score },
      unlockedGames: [...new Set([...state.unlockedGames, 'genre-game'])],
      completedGames: [...new Set([...state.completedGames, 'rating-game'])],
      currentPhase: 'hub',
    })),

  startGenreGame: () =>
    set({
      currentPhase: 'genre-game',
    }),

  startRatingGame: () =>
    set({
      currentPhase: 'rating-game',
    }),

  completeGenreGame: (score) =>
    set((state) => ({
      scores: { ...state.scores, genre: score },
      completedGames: [...new Set([...state.completedGames, 'genre-game'])],
      currentPhase: 'hub',
    })),

  resetExperience: () =>
    set({
      currentPhase: 'rating-game',
      scores: { rating: 0, genre: 0 },
      unlockedGames: ['rating-game'],
      completedGames: [],
      backgroundStatus: 'idle',
      username: null,
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

      return data;
    } catch (err) {
      console.error('Failed to check status:', err);
      return null;
    }
  },

  fetchFullStats: async () => {
    const { username } = get();
    if (!username) throw new Error('No username');

    const data = await apiFetchFullStats(username);
    return data as { userStats: UserStats; genreGame: GenreGameData };
  },
}));
