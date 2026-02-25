'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { GameBackground } from '@/components/game/shared/GameBackground';
import { Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { PreAnalysisFlow } from '@/components/game/pre-analysis/PreAnalysisFlow';
import { ExperienceOrchestrator } from '@/components/game/core/ExperienceOrchestrator';
import { useUserStore } from '@/store/core/userStore';
import { usePollingStore } from '@/store/core/pollingStore';
import { useRatingGameStore } from '@/store/rating/ratingStore';
import { triggerMetrics } from '@/lib/api';
import { MIN_LOADING_TIME_MS } from '@/lib/gameTypes';
import { API_ERRORS, ERROR_MESSAGES } from '@/lib/content';

export default function LandingPage() {
  const [usernameInput, setUsernameInput] = useState('');
  const [showPreAnalysis, setShowPreAnalysis] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const { hasStartedGame, setStartedGame, backgroundStatus, setProcessing, setUsername } =
    useUserStore();
  const startPolling = usePollingStore((state) => state.start);
  const ratingGameReset = useRatingGameStore((state) => state.resetGame);

  // Computed status for PreAnalysis flow
  const isBackendReady = backgroundStatus === 'partial_ready' || backgroundStatus === 'ready';

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput.trim()) return;

    setLocalLoading(true);
    setLocalError(null);
    const startTime = Date.now();

    try {
      const data = await triggerMetrics(usernameInput.trim());

      if (data.status === 'error') {
        throw new Error(data.message || 'Analysis failed');
      }

      // Smooth loading experience
      const elapsed = Date.now() - startTime;
      if (elapsed < MIN_LOADING_TIME_MS) {
        await new Promise((r) => setTimeout(r, MIN_LOADING_TIME_MS - elapsed));
      }

      setUsername(usernameInput.trim());
      ratingGameReset();

      // If already ready (cached user), hydrate stores directly — no polling needed
      if (data.status === 'ready' && data.ratingGame?.movies) {
        setProcessing(usernameInput.trim());
        // Hydrate all game stores directly from the triggerMetrics response
        const { setReady, setUserStats: setStats } = useUserStore.getState();
        setReady();
        if (data.userStats) setStats(data.userStats);
        if (data.ratingGame?.movies?.length > 0) {
          useRatingGameStore.getState().startGame({
            movies: data.ratingGame.movies,
            userStats: data.userStats || null,
          });
        }
        // Hydrate remaining game stores via pollingStore's hydration
        // (pollingStore.start won't be called, but we need to push data)
        if (data.genreGame) {
          const { useGenreRankingStore } = await import('@/store/genre/rankingStore');
          const currentGenres = useGenreRankingStore.getState().genres;
          if (currentGenres.length === 0) {
            useGenreRankingStore.getState().startGame({ ...data.genreGame, previousScore: 0 });
          }
        }
        if (data.genreMatchingGame) {
          const { useGenreMatchingStore } = await import('@/store/genre/matchingStore');
          if (!useGenreMatchingStore.getState().isActive) {
            useGenreMatchingStore.getState().initGame(data.genreMatchingGame);
          }
        }
        if (data.themeGame) {
          const { useThemeStore } = await import('@/store/theme/themeStore');
          if (useThemeStore.getState().rounds.length === 0) {
            useThemeStore
              .getState()
              .initThemeGame(data.themeGame.rounds, data.themeGame.sortingRounds || []);
          }
        }
        setShowPreAnalysis(true);
        return;
      }

      // Processing/accepted/partial_ready — start polling
      if (
        data.status === 'processing' ||
        data.status === 'accepted' ||
        data.status === 'partial_ready'
      ) {
        setProcessing(usernameInput.trim());
        startPolling(usernameInput.trim());
        setShowPreAnalysis(true);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      if (
        errorMessage.includes(API_ERRORS.USER_NOT_FOUND) ||
        errorMessage.includes(API_ERRORS.PROFILE_PRIVATE) ||
        errorMessage.includes(API_ERRORS.NOT_FOUND_404)
      ) {
        setLocalError(ERROR_MESSAGES.USER_NOT_FOUND);
      } else {
        setLocalError(ERROR_MESSAGES.GENERIC);
      }
    } finally {
      setLocalLoading(false);
    }
  };

  const handlePreAnalysisComplete = () => {
    // We only transition when the user chooses to (or finishes dialog)
    // The Game Orchestrator will show a loading wall if backgroundStatus isn't ready when RatingGame finishes
    setStartedGame(true);
  };

  // 1. If Game is fully running
  if (hasStartedGame) {
    return <ExperienceOrchestrator />;
  }

  // 2. Pre-Analysis Waiting Room
  if (showPreAnalysis) {
    return (
      <GameBackground>
        <div className="relative z-10 flex flex-col items-center justify-center h-[100dvh] w-full overflow-hidden">
          <PreAnalysisFlow onComplete={handlePreAnalysisComplete} isBackendReady={isBackendReady} />
        </div>
      </GameBackground>
    );
  }

  return (
    <GameBackground>
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="w-full max-w-md space-y-8 text-center"
        >
          <div className="space-y-8">
            <div className="flex justify-center">
              <Image
                src="/logo.svg"
                alt="Letterboxd Analysis Logo"
                width={1150}
                height={1200}
                className="w-auto h-24 md:h-36 drop-shadow-2xl"
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
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="Enter your Letterboxd username"
                className="w-full px-6 py-4 bg-white/50 border-2 border-primary/10 rounded-xl text-xl text-center placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:bg-white/80 transition-all duration-300 text-primary font-serif"
                disabled={localLoading}
              />
            </div>

            {localError && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="text-destructive text-sm font-medium"
              >
                {localError}
              </motion.p>
            )}

            <Button
              type="submit"
              disabled={localLoading || !usernameInput}
              size="lg"
              className="w-full py-4 h-auto text-lg font-bold tracking-wide rounded-xl shadow-lg shadow-primary/10 flex items-center justify-center gap-2 group overflow-hidden"
            >
              {localLoading ? (
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
