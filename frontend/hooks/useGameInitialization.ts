import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { triggerMetrics, pollMetricsStatus } from '@/lib/api';
import { useExperienceStore } from '@/store/core/experienceStore';
import { useRatingGameStore } from '@/store/rating/ratingStore';
import { MIN_LOADING_TIME_MS } from '@/lib/gameTypes';
import { useStoreHydration } from './useStoreHydration';
import { useGamePoller } from './useGamePoller';

interface UseGameInitializationOptions {
  /**
   * If true, starts polling immediately on mount if conditions are met
   * (Used for background polling in Orchestrator)
   */
  backgroundMode?: boolean;
  /**
   * If true, automatically redirects to /game when ready.
   * If false, sets isReady state but waits for manual transition.
   * @default true
   */
  autoRedirect?: boolean;
}

export function useGameInitialization(options: UseGameInitializationOptions = {}) {
  const { backgroundMode = false, autoRedirect = true } = options;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const router = useRouter();

  // Store actions
  const setExperienceProcessing = useExperienceStore((state) => state.setProcessing);
  const ratingGameReset = useRatingGameStore((state) => state.resetGame);

  // Store state for background polling checks
  const backgroundStatus = useExperienceStore((state) => state.backgroundStatus);
  const ratingMoviesLength = useRatingGameStore((state) => state.movies.length);
  const experienceUsername = useExperienceStore((state) => state.username);

  const { hydrateStores } = useStoreHydration();

  // Helper to handle navigation (only for Landing Page mode)
  const handleGameReady = useCallback(
    (data: Awaited<ReturnType<typeof pollMetricsStatus>>) => {
      hydrateStores(data);

      if (!backgroundMode) {
        if (autoRedirect) {
          router.push('/game');
        } else {
          setIsReady(true);
        }
      }
    },
    [hydrateStores, router, backgroundMode, autoRedirect],
  );

  const transitionToGame = useCallback(() => {
    router.push('/game');
  }, [router]);

  // Poller Hook
  const { startPolling, stopPolling } = useGamePoller({
    backgroundMode,
    onGameReady: handleGameReady,
    onError: (err) => {
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
      stopPolling();
    },
  });

  // Initial Start Trigger (Landing Page)
  const initializeGame = async (username: string) => {
    if (!username.trim()) return;

    setIsLoading(true);
    setError(null);
    setIsReady(false);
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
    }
  };

  // Background Polling Effect (Orchestrator)
  useEffect(() => {
    if (!backgroundMode) return;

    if (backgroundStatus === 'partial_ready' && ratingMoviesLength > 0 && experienceUsername) {
      startPolling(experienceUsername);
    }

    return () => {
      stopPolling();
    };
  }, [
    backgroundMode,
    backgroundStatus,
    ratingMoviesLength,
    experienceUsername,
    startPolling,
    stopPolling,
  ]);

  return {
    initializeGame,
    isLoading,
    error,
    isReady,
    transitionToGame,
  };
}
