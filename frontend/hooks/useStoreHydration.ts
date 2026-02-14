import { useCallback } from 'react';
import { useRatingGameStore } from '@/store/rating/ratingStore';
import { useGenreRankingStore } from '@/store/genre/rankingStore';
import { useGenreMatchingStore } from '@/store/genre/matchingStore';
import { useUserStore } from '@/store/core/userStore';
import { pollMetricsStatus } from '@/lib/api';
import { useThemeStore } from '@/store/theme/themeStore';

export function useStoreHydration() {
  const setExperienceReady = useUserStore((state) => state.setReady);
  const setExperiencePartialReady = useUserStore((state) => state.setPartialReady);

  const startRatingGame = useRatingGameStore((state) => state.startGame);
  const startGenreGame = useGenreRankingStore((state) => state.startGame);
  const initMatchingGame = useGenreMatchingStore((state) => state.initGame);
  const initThemeGame = useThemeStore((state) => state.initThemeGame);

  const hydrateStores = useCallback(
    (data: Awaited<ReturnType<typeof pollMetricsStatus>>) => {
      console.log('useStoreHydration: Hydrating stores', {
        status: data.status,
        hasRating: !!data.ratingGame,
        hasGenre: !!data.genreGame,
        hasMatching: !!data.genreMatchingGame,
        hasTheme: !!data.themeGame,
      });

      // Update Experience Store Status
      if (data.status === 'ready') {
        setExperienceReady();
      } else {
        setExperiencePartialReady();
      }

      // 1. Rating Game
      if (data.ratingGame?.movies && data.ratingGame.movies.length > 0) {
        // Only initialize if not already populated to prevent game reset
        const currentMovies = useRatingGameStore.getState().movies;
        if (currentMovies.length === 0) {
          startRatingGame({
            movies: data.ratingGame.movies,
            userStats: data.userStats || null,
          });
        }
      }

      // 2. Genre Ranking Game
      if (data.genreGame) {
        const currentGenres = useGenreRankingStore.getState().genres;
        if (currentGenres.length === 0) {
          startGenreGame({
            ...data.genreGame,
            previousScore: 0,
          });
        }
      }

      // 3. Genre Matching Game
      if (data.genreMatchingGame) {
        const isMatchingActive = useGenreMatchingStore.getState().isActive;
        if (!isMatchingActive) {
          initMatchingGame(data.genreMatchingGame);
        }
      }

      // 4. Theme Guessing Game
      if (data.themeGame) {
        // Check if already initialized?
        // For now, simpler to just init if we have data, as `rounds` default is empty.
        const currentRounds = useThemeStore.getState().rounds;
        console.log('[useStoreHydration] Theme Game Data:', {
          hasData: !!data.themeGame,
          roundsInData: data.themeGame.rounds?.length,
          currentStoreRounds: currentRounds.length,
        });

        if (currentRounds.length === 0) {
          console.log('[useStoreHydration] Initializing Theme Game...');
          initThemeGame(data.themeGame.rounds);
        }
      } else {
        console.warn('[useStoreHydration] No Theme Game data in response');
      }
    },
    [
      setExperienceReady,
      setExperiencePartialReady,
      startRatingGame,
      startGenreGame,
      initMatchingGame,
      initThemeGame,
    ],
  );

  return { hydrateStores };
}
