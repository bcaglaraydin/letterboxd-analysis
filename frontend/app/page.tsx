'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { GameBackground } from '@/components/game/shared/GameBackground';
import { useRatingGameStore } from '@/store/rating/ratingStore';
import { useGenreRankingStore } from '@/store/genre/rankingStore';
import { useExperienceStore } from '@/store/core/experienceStore';
import { Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { triggerMetrics, pollMetricsStatus } from '@/lib/api';

const POLL_INTERVAL_MS = 2000;

export default function LandingPage() {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const startGame = useRatingGameStore((state) => state.startGame);
  const startGenreGame = useGenreRankingStore((state) => state.startGame);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    setIsLoading(true);
    setError(null);

    const startTime = Date.now();

    try {
      const data = await triggerMetrics(username);

      // Handle immediate error
      if (data.status === 'error') {
        throw new Error(data.message || 'Analysis failed');
      }

      // Ensure minimum loading time for smooth UX (prevent flash)
      const elapsed = Date.now() - startTime;
      if (elapsed < 800) {
        await new Promise((r) => setTimeout(r, 800 - elapsed));
      }

      // If already ready or partial_ready with game data, navigate immediately
      if ((data.status === 'ready' || data.status === 'partial_ready') && data.ratingGame?.movies) {
        // Explicitly reset first to ensure clean state
        useRatingGameStore.getState().resetGame();

        handleGameDataReady(data);
        return;
      }

      // Start polling on landing page until we have game data
      if (data.status === 'processing' || data.status === 'accepted') {
        useExperienceStore.getState().setProcessing(username.trim());
        startPolling(username.trim());
      }
    } catch (err: unknown) {
      handleError(err);
    }
  };

  const startPolling = (user: string) => {
    pollIntervalRef.current = setInterval(async () => {
      try {
        const data = await pollMetricsStatus(user);

        // Keep polling until we have game data
        if (
          (data.status === 'partial_ready' || data.status === 'ready') &&
          data.ratingGame?.movies
        ) {
          // Stop polling
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          handleGameDataReady(data);
        }

        // Handle error status
        if (data.status === 'error') {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          throw new Error(data.message || 'Analysis failed');
        }
      } catch (err: unknown) {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        handleError(err);
      }
    }, POLL_INTERVAL_MS);
  };

  const handleGameDataReady = (data: Awaited<ReturnType<typeof pollMetricsStatus>>) => {
    // Set experience store status
    if (data.status === 'ready') {
      useExperienceStore.getState().setReady();
    } else {
      useExperienceStore.getState().setPartialReady();
    }

    // Hydrate rating game
    if (data.ratingGame?.movies) {
      startGame({
        movies: data.ratingGame.movies,
        userStats: data.userStats || null,
      });
    }

    // Hydrate genre game if available
    if (data.genreGame) {
      startGenreGame({
        ...data.genreGame,
        previousScore: 0,
      });
    }

    router.push('/game');
  };

  const handleError = (err: unknown) => {
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
  };

  return (
    <GameBackground>
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="w-full max-w-md space-y-8 text-center"
        >
          <div className="space-y-6">
            <div className="flex justify-center">
              <Image
                src="/logo.svg"
                alt="Letterboxd Analysis Logo"
                width={120}
                height={120}
                className="w-32 h-32 md:w-40 md:h-40"
                priority
              />
            </div>
            <h1 className="text-6xl font-serif tracking-tight text-primary">
              Letterboxd
              <br />
              <span className="text-accent italic">Guessing Game</span>
            </h1>
            <p className="text-muted-foreground text-lg font-sans">
              How well do you know your own taste?
            </p>
          </div>

          <form onSubmit={handleStart} className="space-y-6">
            <div className="relative group">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your Letterboxd username"
                className="w-full px-6 py-4 bg-white/50 border-2 border-primary/10 rounded-xl text-xl text-center placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:bg-white/80 transition-all duration-300 text-primary font-serif"
                disabled={isLoading}
              />
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="text-destructive text-sm font-medium"
              >
                {error}
              </motion.p>
            )}

            <Button
              type="submit"
              disabled={isLoading || !username}
              size="lg"
              className="w-full py-4 h-auto text-lg font-bold tracking-wide rounded-xl shadow-lg shadow-primary/10 flex items-center justify-center gap-2 group overflow-hidden"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" />
                  <span>Analyzing Profile...</span>
                </>
              ) : (
                <>
                  <span>Start Game</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </form>

          <div className="pt-8 flex justify-center gap-4 text-muted-foreground/60 text-xs uppercase tracking-widest font-medium">
            <span>Powered by Letterboxd</span>
            <span>•</span>
            <span>Made for Film Lovers</span>
          </div>
        </motion.div>
      </div>
    </GameBackground>
  );
}
