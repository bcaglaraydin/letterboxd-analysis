import { create } from 'zustand';
import { pollMetricsStatus } from '@/lib/api';
import { POLL_INTERVAL_MS } from '@/lib/gameTypes';
import { useUserStore } from './userStore';

// We cannot directly invoke a hook (useStoreHydration) inside a Zustand action,
// so we'll pass the hydrate function down from the root when starting the poller,
// OR we can move the hydration logic directly into the global space.
// Since hydrateStores just dispatches to other Zustand stores, we can import those stores directly.

import { useRatingGameStore } from '@/store/rating/ratingStore';
import { useGenreRankingStore } from '@/store/genre/rankingStore';
import { useGenreMatchingStore } from '@/store/genre/matchingStore';
import { useThemeStore } from '@/store/theme/themeStore';

interface PollingState {
  isPolling: boolean;
  intervalId: NodeJS.Timeout | null;
  start: (username: string) => void;
  stop: () => void;
}

// Global hydration function (Moved from useStoreHydration hook for global use)
const hydrateStoresGlobal = (data: Awaited<ReturnType<typeof pollMetricsStatus>>) => {
  console.log('[pollingStore] Hydrating stores', {
    status: data.status,
    hasRating: !!data.ratingGame,
    hasGenre: !!data.genreGame,
    hasMatching: !!data.genreMatchingGame,
    hasTheme: !!data.themeGame,
    hasUserStats: !!data.userStats,
  });

  const { setReady, setPartialReady, setUserStats } = useUserStore.getState();

  // Update Experience Store Status
  if (data.status === 'ready') {
    setReady();
    if (data.userStats) {
      setUserStats(data.userStats);
    }
  } else {
    setPartialReady();
  }

  // 1. Rating Game
  if (data.ratingGame?.movies && data.ratingGame.movies.length > 0) {
    const currentMovies = useRatingGameStore.getState().movies;
    if (currentMovies.length === 0) {
      useRatingGameStore.getState().startGame({
        movies: data.ratingGame.movies,
        userStats: data.userStats || null,
      });
    }
  }

  // 2. Genre Ranking Game
  if (data.genreGame) {
    const currentGenres = useGenreRankingStore.getState().genres;
    if (currentGenres.length === 0) {
      useGenreRankingStore.getState().startGame({
        ...data.genreGame,
        previousScore: 0,
      });
    }
  }

  // 3. Genre Matching Game
  if (data.genreMatchingGame) {
    const isMatchingActive = useGenreMatchingStore.getState().isActive;
    if (!isMatchingActive) {
      useGenreMatchingStore.getState().initGame(data.genreMatchingGame);
    }
  }

  // 4. Theme Guessing Game
  if (data.themeGame) {
    const currentRounds = useThemeStore.getState().rounds;
    if (currentRounds.length === 0) {
      useThemeStore
        .getState()
        .initThemeGame(data.themeGame.rounds, data.themeGame.sortingRounds || []);
    }
  }
};

export const usePollingStore = create<PollingState>((set, get) => ({
  isPolling: false,
  intervalId: null,

  start: (username: string) => {
    // Prevent double polling
    if (get().isPolling) return;

    console.log(`[pollingStore] Starting background polling for ${username}`);

    const intervalId = setInterval(async () => {
      try {
        const data = await pollMetricsStatus(username);

        // Success Condition: ready or partial_ready with MINIMUM rating game data
        if (
          (data.status === 'partial_ready' || data.status === 'ready') &&
          data.ratingGame?.movies
        ) {
          hydrateStoresGlobal(data);

          if (data.status === 'ready') {
            get().stop(); // Job's done!
          }
        }

        if (data.status === 'not_found' || data.status === 'error') {
          console.error(`[pollingStore] Polling Error: ${data.message}`);
          useUserStore.getState().resetUser(); // Optionally gracefully degrade
          get().stop();
        }
      } catch (err) {
        console.error('[pollingStore] Interval tick failed', err);
      }
    }, POLL_INTERVAL_MS);

    set({ isPolling: true, intervalId });
  },

  stop: () => {
    const { intervalId } = get();
    if (intervalId) {
      clearInterval(intervalId);
      console.log('[pollingStore] Background polling stopped');
    }
    set({ isPolling: false, intervalId: null });
  },
}));
