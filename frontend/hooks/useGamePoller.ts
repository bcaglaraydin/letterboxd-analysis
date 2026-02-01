import { useRef, useCallback } from 'react';
import { pollMetricsStatus } from '@/lib/api';
import { POLL_INTERVAL_MS } from '@/lib/gameTypes';
import { useStoreHydration } from './useStoreHydration';

interface UseGamePollerOptions {
  backgroundMode?: boolean;
  onGameReady?: (data: Awaited<ReturnType<typeof pollMetricsStatus>>) => void;
  onError?: (err: unknown) => void;
}

export function useGamePoller(options: UseGamePollerOptions = {}) {
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { hydrateStores } = useStoreHydration();

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

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
              stopPolling();
              hydrateStores(data);
              return;
            }

            // If NOT background mode (Landing Page), we stop validation as soon as we have enough to start (Partial Ready)
            if (!options.backgroundMode) {
              stopPolling();
              if (options.onGameReady) options.onGameReady(data);
            }

            // If background mode and still partial, we keep polling (do nothing, just wait next tick)
          }

          if (data.status === 'error') {
            throw new Error(data.message || 'Analysis failed');
          }
        } catch (err) {
          if (options.onError) options.onError(err);
          // Stop polling on error? usually yes
          // stopPolling();
        }
      }, POLL_INTERVAL_MS);
    },
    [options, hydrateStores, stopPolling],
  );

  return { startPolling, stopPolling };
}
