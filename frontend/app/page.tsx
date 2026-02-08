'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { GameBackground } from '@/components/game/shared/GameBackground';
import { Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { useGameInitialization } from '@/hooks/useGameInitialization';
import { PreAnalysisFlow } from '@/components/game/pre-analysis/PreAnalysisFlow';

export default function LandingPage() {
  const [username, setUsername] = useState('');
  const [showPreAnalysis, setShowPreAnalysis] = useState(false);
  const { initializeGame, isLoading, error, isReady, transitionToGame } = useGameInitialization({
    autoRedirect: false,
  });

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    // Start the game initialization (backend analysis)
    // We don't await this to block IO, but we do want to trigger the UI change
    initializeGame(username);
    setShowPreAnalysis(true);
  };

  const handlePreAnalysisComplete = () => {
    if (isReady) {
      transitionToGame();
    }
  };

  if (showPreAnalysis) {
    return (
      <GameBackground>
        <div className="relative z-10 flex flex-col items-center justify-center h-[100dvh] w-full overflow-hidden">
          <PreAnalysisFlow onComplete={handlePreAnalysisComplete} isBackendReady={isReady} />
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
