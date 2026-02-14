import { create } from 'zustand';
import { pollMetricsStatus, fetchFullStats as apiFetchFullStats } from '@/lib/api';
import type { UserStats, GenreGameData, MetricsResponse } from '@/lib/api';

interface UserState {
  username: string | null;
  userStats: UserStats | null;
  backgroundStatus: 'idle' | 'processing' | 'partial_ready' | 'ready';

  // Actions
  setUsername: (username: string) => void;
  setProcessing: (username: string) => void;
  setPartialReady: () => void;
  setReady: () => void;
  resetUser: () => void;
  pollBackgroundStatus: () => Promise<(MetricsResponse & { isPartial?: boolean }) | null>;
  fetchFullStats: () => Promise<{ userStats: UserStats; genreGame: GenreGameData }>;
}

export const useUserStore = create<UserState>((set, get) => ({
  username: null,
  userStats: null,
  backgroundStatus: 'idle',

  setUsername: (username) => set({ username }),

  setProcessing: (username) => set({ backgroundStatus: 'processing', username }),
  setPartialReady: () => set({ backgroundStatus: 'partial_ready' }),
  setReady: () => set({ backgroundStatus: 'ready' }),

  resetUser: () =>
    set({
      username: null,
      userStats: null,
      backgroundStatus: 'idle',
    }),

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
        genreGame: { genres: [], actualRanking: [] }, // Placeholder as we only cache userStats
      } as { userStats: UserStats; genreGame: GenreGameData };
    }

    const data = await apiFetchFullStats(username);

    if (data.userStats) {
      set({ userStats: data.userStats });
    }

    return data as { userStats: UserStats; genreGame: GenreGameData };
  },
}));

// Selectors
export const selectUserStats = (state: UserState) => state.userStats;
export const selectUsername = (state: UserState) => state.username;
export const selectBackgroundStatus = (state: UserState) => state.backgroundStatus;
