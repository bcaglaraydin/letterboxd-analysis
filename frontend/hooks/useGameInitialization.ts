import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { triggerMetrics, pollMetricsStatus } from '@/lib/api';
import { useUserStore } from '@/store/core/userStore';
import { useRatingGameStore } from '@/store/rating/ratingStore';
import { MIN_LOADING_TIME_MS } from '@/lib/gameTypes';
import { useStoreHydration } from './useStoreHydration';
import { useGamePoller } from './useGamePoller';
import { API_ERRORS, ERROR_MESSAGES } from '@/lib/content';

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
  const setExperienceProcessing = useUserStore((state) => state.setProcessing);
  const ratingGameReset = useRatingGameStore((state) => state.resetGame);

  // Store state for background polling checks
  const backgroundStatus = useUserStore((state) => state.backgroundStatus);
  const ratingMoviesLength = useRatingGameStore((state) => state.movies.length);
  const experienceUsername = useUserStore((state) => state.username);

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
        errorMessage.includes(API_ERRORS.USER_NOT_FOUND) ||
        errorMessage.includes(API_ERRORS.PROFILE_PRIVATE) ||
        errorMessage.includes(API_ERRORS.NOT_FOUND_404)
      ) {
        setError(ERROR_MESSAGES.USER_NOT_FOUND);
      } else {
        setError(ERROR_MESSAGES.GENERIC);
      }
      setIsLoading(false);
      stopPolling();
    },
    onRestart: async (username) => {
      try {
        console.log(`[GameInit] Session missing for ${username}. Auto-restarting...`);
        await triggerMetrics(username);
      } catch (e) {
        console.error('[GameInit] Auto-restart failed:', e);
      }
    },
  });

  // Initial Start Trigger (Landing Page)
  const initializeGame = async (username: string): Promise<boolean> => {
    if (!username.trim()) return false;

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
        return true;
      }

      // Start Polling
      if (data.status === 'processing' || data.status === 'accepted') {
        setExperienceProcessing(username.trim());
        startPolling(username.trim());
        return true;
      }
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      if (
        errorMessage.includes(API_ERRORS.USER_NOT_FOUND) ||
        errorMessage.includes(API_ERRORS.PROFILE_PRIVATE) ||
        errorMessage.includes(API_ERRORS.NOT_FOUND_404)
      ) {
        setError(ERROR_MESSAGES.USER_NOT_FOUND);
      } else {
        setError(ERROR_MESSAGES.GENERIC);
      }
      setIsLoading(false);
      return false;
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
