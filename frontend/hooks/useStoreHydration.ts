import { useCallback } from 'react';
import { useRatingGameStore } from '@/store/rating/ratingStore';
import { useGenreRankingStore } from '@/store/genre/rankingStore';
import { useGenreMatchingStore } from '@/store/genre/matchingStore';
import { useExperienceStore } from '@/store/core/experienceStore';
import { pollMetricsStatus } from '@/lib/api';

export function useStoreHydration() {
  const setExperienceReady = useExperienceStore((state) => state.setReady);
  const setExperiencePartialReady = useExperienceStore((state) => state.setPartialReady);

  const startRatingGame = useRatingGameStore((state) => state.startGame);
  const startGenreGame = useGenreRankingStore((state) => state.startGame);
  const initMatchingGame = useGenreMatchingStore((state) => state.initGame);

  const hydrateStores = useCallback(
    (data: Awaited<ReturnType<typeof pollMetricsStatus>>) => {
      console.log('useStoreHydration: Hydrating stores', {
        status: data.status,
        hasRating: !!data.ratingGame,
        hasGenre: !!data.genreGame,
        hasMatching: !!data.genreMatchingGame,
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
    },
    [
      setExperienceReady,
      setExperiencePartialReady,
      startRatingGame,
      startGenreGame,
      initMatchingGame,
    ],
  );

  return { hydrateStores };
}
