'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { GameBackground } from '@/components/game/shared/GameBackground';
import { Loader2, ArrowRight, Github } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PreAnalysisFlow } from '@/components/game/pre-analysis/PreAnalysisFlow';
import { ExperienceOrchestrator } from '@/components/game/core/ExperienceOrchestrator';
import { useUserStore } from '@/store/core/userStore';
import { usePollingStore, hydrateStoresGlobal } from '@/store/core/pollingStore';
import { useRatingGameStore } from '@/store/rating/ratingStore';
import { triggerMetrics } from '@/lib/api';
import { MIN_LOADING_TIME_MS } from '@/lib/gameTypes';
import { API_ERRORS, ERROR_MESSAGES } from '@/lib/content';

export default function HomePage() {
  const [usernameInput, setUsernameInput] = useState('');
  const [showPreAnalysis, setShowPreAnalysis] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState('');

  const { hasStartedGame, setStartedGame, backgroundStatus, setProcessing, setUsername } =
    useUserStore();

  const startPolling = usePollingStore((state) => state.start);
  const ratingGameReset = useRatingGameStore((state) => state.resetGame);

  const isBackendReady = backgroundStatus === 'partial_ready' || backgroundStatus === 'ready';

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalUsername = usernameInput.trim() || 'bcaglaraydin';

    setLocalLoading(true);
    setLocalError('');

    const startTime = Date.now();

    try {
      const data = await triggerMetrics(finalUsername);

      if (data.status === 'error') {
        throw new Error(data.message || 'Analysis failed');
      }

      const elapsed = Date.now() - startTime;

      if (elapsed < MIN_LOADING_TIME_MS) {
        await new Promise((r) => setTimeout(r, MIN_LOADING_TIME_MS - elapsed));
      }

      setUsername(finalUsername);
      ratingGameReset();

      if (data.status === 'ready' && data.ratingGame?.movies) {
        setProcessing(finalUsername);

        // Hydrate ALL stores (rating, genre, theme, matching) in one shot
        hydrateStoresGlobal(data);

        setShowPreAnalysis(true);
        return;
      }

      if (
        data.status === 'processing' ||
        data.status === 'accepted' ||
        data.status === 'partial_ready'
      ) {
        setProcessing(finalUsername);
        startPolling(finalUsername);
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
    setStartedGame(true);
  };

  if (hasStartedGame) {
    return <ExperienceOrchestrator />;
  }

  if (showPreAnalysis) {
    return (
      <GameBackground>
        <div className="relative z-10 flex items-center justify-center min-h-[100dvh] px-5">
          <PreAnalysisFlow onComplete={handlePreAnalysisComplete} isBackendReady={isBackendReady} />
        </div>
      </GameBackground>
    );
  }

  const handleImpersonate = () => {
    setUsernameInput('bcaglaraydin');
  };

  const heroSection = (
    <div
      className="flex flex-col items-center text-center w-full max-w-2xl mx-auto overflow-hidden"
      style={{ gap: 'clamp(1.25rem, 4vw, 1.75rem)' }}
    >
      <h1 className="font-serif leading-none flex flex-col items-center w-full min-w-0 overflow-hidden">
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="mb-2 rotate-2"
        >
          <span
            className="bg-primary text-white rounded-full uppercase font-black inline-block"
            style={{
              fontSize: 'clamp(0.625rem, 2vw, 0.75rem)',
              padding: 'clamp(0.375rem, 1.5vw, 0.5rem) clamp(0.875rem, 3vw, 1.25rem)',
              letterSpacing: '0.3em',
            }}
          >
            THE
          </span>
        </motion.div>

        <motion.span
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="text-accent font-black tracking-[-0.04em] leading-[0.85] rotate-[1.5deg] transition-transform hover:rotate-0 block w-full"
          style={{
            fontSize: 'clamp(3rem, 18vw, 10rem)',
            marginBottom: 'clamp(0.75rem, 3vw, 1.5rem)',
            textShadow: '3px 3px 0 var(--primary)',
          }}
        >
          Ultimate
        </motion.span>

        <motion.span
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="text-white bg-primary rounded-xl font-extrabold tracking-tight inline-block max-w-full"
          style={{
            fontSize: 'clamp(0.875rem, 3.5vw, 1.9rem)',
            padding: 'clamp(0.5rem, 1.5vw, 0.75rem) clamp(0.875rem, 3vw, 1.25rem)',
          }}
        >
          Letterboxd Taste Test
        </motion.span>
      </h1>

      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="text-muted-foreground font-medium leading-relaxed w-full"
        style={{
          fontSize: 'clamp(0.8125rem, 2.5vw, 1rem)',
          maxWidth: 'min(380px, 100%)',
        }}
      >
        No account? No problem! Use{' '}
        <span
          className="font-bold text-primary cursor-pointer hover:underline underline-offset-4"
          onClick={handleImpersonate}
        >
          bcaglaraydin
        </span>{' '}
        and{' '}
        <strong
          className="text-primary bg-primary/10 px-2 py-0.5 rounded-md hover:bg-primary hover:text-white transition-all cursor-pointer"
          onClick={handleImpersonate}
        >
          impersonate me
        </strong>{' '}
        to explore.
      </motion.p>
    </div>
  );

  const formElement = (
    <form onSubmit={handleStart} className="w-full max-w-lg mx-auto space-y-4">
      <div>
        <input
          type="text"
          value={usernameInput}
          onChange={(e) => setUsernameInput(e.target.value)}
          placeholder="Enter your Letterboxd username"
          className="w-full px-4 bg-white/50 border-2 border-primary/10 rounded-xl text-center placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50 focus:bg-white/80 transition-all duration-300 text-primary font-serif"
          style={{
            height: 'clamp(2.75rem, 8vw, 3.5rem)',
            fontSize: 'clamp(0.875rem, 3vw, 1.125rem)',
          }}
          disabled={localLoading}
        />
      </div>

      {localError && (
        <motion.p
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="text-destructive text-sm font-medium text-center"
          data-testid="error-message"
        >
          {localError}
        </motion.p>
      )}

      <Button
        type="submit"
        disabled={localLoading}
        size="lg"
        className="w-full text-lg font-bold tracking-wide rounded-xl shadow-lg shadow-primary/10 flex items-center justify-center gap-2 group"
        style={{
          height: 'clamp(2.75rem, 8vw, 3.5rem)',
          fontSize: 'clamp(0.875rem, 3vw, 1.125rem)',
        }}
      >
        {localLoading ? (
          <>
            <Loader2 className="animate-spin" />
            <span>Analyzing Profile...</span>
          </>
        ) : (
          <>
            <span>Start</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </>
        )}
      </Button>
    </form>
  );

  const footerElement = (
    <footer className="flex flex-col items-center gap-3 text-muted-foreground/80 text-xs w-full">
      <div className="flex items-center gap-5 tracking-wide font-sans">
        <a
          href="https://github.com/bcaglaraydin/letterboxd-analysis"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 hover:text-primary hover:underline"
        >
          <Github className="w-4 h-4" />
          <span>GitHub</span>
        </a>

        <span className="opacity-40">•</span>

        <a
          href="https://letterboxd.com/bcaglaraydin"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 hover:text-primary hover:underline"
        >
          <span>Letterboxd</span>
        </a>
      </div>
    </footer>
  );

  return (
    <GameBackground>
      <div
        className="relative z-10 flex items-center justify-center min-h-[100dvh] overflow-x-hidden"
        style={{
          padding: 'clamp(1.5rem, 5vw, 3.5rem) clamp(1rem, 5vw, 1.25rem)',
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="w-full max-w-2xl flex flex-col items-center min-w-0"
          style={{ gap: 'clamp(2rem, 6vw, 3rem)' }}
        >
          {heroSection}
          {formElement}
          {footerElement}
        </motion.div>
      </div>
    </GameBackground>
  );
}
