import { create } from 'zustand';
import { fetchFullStats as apiFetchFullStats } from '@/lib/api';
import type { UserStats, GenreGameData } from '@/lib/api';

interface UserState {
  username: string | null;
  userStats: UserStats | null;
  tasteMatch: {
    matches: { name: string; url: string; avatarUrl: string }[];
    userFavorites: { slug: string; posterUrl: string; title: string }[];
    matchCount: number;
  };
  backgroundStatus: 'idle' | 'processing' | 'partial_ready' | 'ready';
  hasStartedGame: boolean;
  hasSeenFakeScorePrank: boolean;
  hasSeenSuccessDialog: boolean;

  // Actions
  setUsername: (username: string) => void;
  setUserStats: (stats: UserStats) => void;
  setTasteMatch: (match: {
    matches: { name: string; url: string; avatarUrl: string }[];
    userFavorites: { slug: string; posterUrl: string; title: string }[];
    matchCount: number;
  }) => void;
  setProcessing: (username: string) => void;
  setPartialReady: () => void;
  setReady: () => void;
  setStartedGame: (started: boolean) => void;
  setHasSeenFakeScorePrank: (seen: boolean) => void;
  setHasSeenSuccessDialog: (seen: boolean) => void;
  resetUser: () => void;
  fetchFullStats: () => Promise<{ userStats: UserStats; genreGame: GenreGameData }>;
}

export const useUserStore = create<UserState>((set, get) => ({
  username: null,
  userStats: null,
  tasteMatch: { matches: [], userFavorites: [], matchCount: 0 },
  backgroundStatus: 'idle',
  hasStartedGame: false,
  hasSeenFakeScorePrank: false,
  hasSeenSuccessDialog: false,

  setUsername: (username) => set({ username }),
  setUserStats: (userStats) => set({ userStats }),
  setTasteMatch: (tasteMatch) => set({ tasteMatch }),

  setProcessing: (username) => set({ backgroundStatus: 'processing', username }),
  setPartialReady: () => set({ backgroundStatus: 'partial_ready' }),
  setReady: () => set({ backgroundStatus: 'ready' }),
  setStartedGame: (started) => set({ hasStartedGame: started }),
  setHasSeenFakeScorePrank: (seen) => set({ hasSeenFakeScorePrank: seen }),
  setHasSeenSuccessDialog: (seen) => set({ hasSeenSuccessDialog: seen }),

  resetUser: () =>
    set({
      username: null,
      userStats: null,
      tasteMatch: { matches: [], userFavorites: [], matchCount: 0 },
      backgroundStatus: 'idle',
      hasStartedGame: false,
      hasSeenFakeScorePrank: false,
      hasSeenSuccessDialog: false,
    }),

  fetchFullStats: async () => {
    const { username, userStats } = get();
    if (!username) throw new Error('No username');

    // Return cached stats if available
    if (userStats) {
      return {
        userStats,
      } as unknown as { userStats: UserStats; genreGame: GenreGameData };
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
