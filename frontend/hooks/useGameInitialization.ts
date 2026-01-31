import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { triggerMetrics, pollMetricsStatus } from '@/lib/api';
import { useExperienceStore } from '@/store/core/experienceStore';
import { useRatingGameStore } from '@/store/rating/ratingStore';
import { useGenreRankingStore } from '@/store/genre/rankingStore';
import { useGenreMatchingStore } from '@/store/genre/matchingStore';
import { POLL_INTERVAL_MS, MIN_LOADING_TIME_MS } from '@/lib/gameTypes';

interface UseGameInitializationOptions {
  /**
   * If true, starts polling immediately on mount if conditions are met
   * (Used for background polling in Orchestrator)
   */
  backgroundMode?: boolean;
}

export function useGameInitialization(options: UseGameInitializationOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  // Store actions
  const setExperienceProcessing = useExperienceStore((state) => state.setProcessing);
  const setExperienceReady = useExperienceStore((state) => state.setReady);
  const setExperiencePartialReady = useExperienceStore((state) => state.setPartialReady);

  const startRatingGame = useRatingGameStore((state) => state.startGame);
  const ratingGameReset = useRatingGameStore((state) => state.resetGame);

  const startGenreGame = useGenreRankingStore((state) => state.startGame);
  const initMatchingGame = useGenreMatchingStore((state) => state.initGame);

  // Store state for background polling checks
  const backgroundStatus = useExperienceStore((state) => state.backgroundStatus);
  const ratingMoviesLength = useRatingGameStore((state) => state.movies.length);
  const experienceUsername = useExperienceStore((state) => state.username);

  // Hydrate all stores with available data
  const hydrateStores = useCallback(
    (data: Awaited<ReturnType<typeof pollMetricsStatus>>) => {
      console.log('useGameInitialization: Hydrating stores', {
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

  // Handle successful data acquisition (navigates if on landing page)
  const handleGameReady = useCallback(
    (data: Awaited<ReturnType<typeof pollMetricsStatus>>) => {
      hydrateStores(data);

      // Only navigate if NOT in background mode (Landing Page flow)
      if (!options.backgroundMode) {
        router.push('/game');
      }
    },
    [hydrateStores, router, options.backgroundMode],
  );

  // Error Handler
  const handleError = useCallback((err: unknown) => {
    const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';

    if (
      errorMessage.includes('User not found') ||
      errorMessage.includes('profile is private') ||
      errorMessage.includes('Request failed with status code 404')
    ) {
      setError('Who is that?');
    } else {
      setError('Something went wrong. Please try again.');
    }

    setIsLoading(false);

    // Clear interval on error
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  // Polling Logic
  const startPolling = useCallback(
    (username: string) => {
      // Avoid double polling
      if (pollIntervalRef.current) return;

      pollIntervalRef.current = setInterval(async () => {
        try {
          const data = await pollMetricsStatus(username);

          // Success Condition: ready or partial_ready with MINIMUM rating game data
          if (
            (data.status === 'partial_ready' || data.status === 'ready') &&
            data.ratingGame?.movies
          ) {
            // If we are in background mode, and we reached 'ready', we can stop polling
            if (options.backgroundMode && data.status === 'ready') {
              if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
              }
              hydrateStores(data);
              return;
            }

            // If NOT background mode (Landing Page), we stop validation as soon as we have enough to start (Partial Ready)
            if (!options.backgroundMode) {
              if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
              }
              handleGameReady(data);
            }

            // If background mode and still partial, we keep polling (do nothing, just wait next tick)
            if (options.backgroundMode && data.status === 'partial_ready') {
              // We can optionally hydrate here if we want live updates, but usually we just want to know when it's FULL ready
              // existing orchestrator logic was: poll until 'ready', then hydrate everything missing.
              // let's stick to that pattern for background mode.
            }
          }

          if (data.status === 'error') {
            throw new Error(data.message || 'Analysis failed');
          }
        } catch (err) {
          handleError(err);
        }
      }, POLL_INTERVAL_MS);
    },
    [handleError, handleGameReady, hydrateStores, options.backgroundMode],
  );

  // Initial Start Trigger (Landing Page)
  const initializeGame = async (username: string) => {
    if (!username.trim()) return;

    setIsLoading(true);
    setError(null);
    const startTime = Date.now();

    try {
      const data = await triggerMetrics(username);

      if (data.status === 'error') {
        throw new Error(data.message || 'Analysis failed');
      }

      // Smooth loading experience
      const elapsed = Date.now() - startTime;
      if (elapsed < MIN_LOADING_TIME_MS) {
        await new Promise((r) => setTimeout(r, MIN_LOADING_TIME_MS - elapsed));
      }

      // Immediate success
      if ((data.status === 'ready' || data.status === 'partial_ready') && data.ratingGame?.movies) {
        ratingGameReset(); // Ensure clean state before starting
        handleGameReady(data);
        return;
      }

      // Start Polling
      if (data.status === 'processing' || data.status === 'accepted') {
        setExperienceProcessing(username.trim());
        startPolling(username.trim());
      }
    } catch (err) {
      handleError(err);
    }
  };

  // Background Polling Effect (Orchestrator)
  useEffect(() => {
    if (!options.backgroundMode) return;

    // Conditions to start/continue background polling:
    // 1. We are "waiting" (partial_ready)
    // 2. We have a username
    // 3. We have minimum data (rating movies) - otherwise we shouldn't even be in the game view?

    // Logic from ExperienceOrchestrator:
    // if (backgroundStatus === 'partial_ready' && ratingMovies.length > 0)

    if (backgroundStatus === 'partial_ready' && ratingMoviesLength > 0 && experienceUsername) {
      startPolling(experienceUsername);
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [
    options.backgroundMode,
    backgroundStatus,
    ratingMoviesLength,
    experienceUsername,
    startPolling,
  ]);

  return {
    initializeGame,
    isLoading,
    error,
  };
}
