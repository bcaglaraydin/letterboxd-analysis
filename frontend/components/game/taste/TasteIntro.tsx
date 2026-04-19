'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { GameLayout } from '@/components/game/shared/GameLayout';
import { useTasteStore } from '@/store/taste/tasteStore';

type IntroStage = 'popularity-signal' | 'rating-preference' | 'transition';

export const TasteIntro: React.FC = () => {
  const { setStep } = useTasteStore();
  const [stage, setStage] = useState<IntroStage>('popularity-signal');

  const containerVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
  };

  const renderContent = () => {
    switch (stage) {
      case 'popularity-signal':
        return (
          <motion.div
            key="popularity-signal"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="flex flex-col items-center space-y-12 max-w-4xl text-center px-4"
          >
            <h2 className="text-2xl md:text-3xl font-serif text-primary leading-tight">
              Is popularity a positive signal for you when it comes to films?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-3xl">
              <Button
                variant="outline"
                className="py-12 px-8 h-auto border-primary/10 bg-background/50 hover:bg-primary/10 hover:text-primary hover:border-primary/50 transition-all duration-500 rounded-3xl flex flex-col items-center justify-center shadow-xl hover:shadow-primary/5 group"
                onClick={() => setStage('rating-preference')}
              >
                <span className="text-base md:text-lg leading-relaxed whitespace-normal break-words max-w-xs transition-colors duration-300 group-hover:text-primary">
                  Popularity usually means compromise. A film made for everyone rarely goes deep.
                </span>
              </Button>
              <Button
                variant="outline"
                className="py-12 px-8 h-auto border-primary/10 bg-background/50 hover:bg-primary/10 hover:text-primary hover:border-primary/50 transition-all duration-500 rounded-3xl flex flex-col items-center justify-center shadow-xl hover:shadow-primary/5 group"
                onClick={() => setStage('rating-preference')}
              >
                <span className="text-base md:text-lg leading-relaxed whitespace-normal break-words max-w-xs transition-colors duration-300 group-hover:text-primary">
                  If many people love it, there’s probably something it gets right. Popularity is a
                  useful signal.
                </span>
              </Button>
            </div>
          </motion.div>
        );

      case 'rating-preference':
        return (
          <motion.div
            key="rating-preference"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="flex flex-col items-center space-y-12 max-w-4xl text-center px-4"
          >
            <h2 className="text-2xl md:text-3xl font-serif text-primary leading-tight">
              Which do you think you tend to rate higher?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-2xl">
              <Button
                variant="outline"
                className="py-12 px-8 h-auto text-xl font-bold border-primary/10 bg-background/50 hover:bg-primary/10 hover:text-primary hover:border-primary/50 transition-all rounded-3xl flex flex-col items-center justify-center whitespace-normal text-center shadow-lg hover:shadow-primary/5 group"
                onClick={() => setStep(1)}
              >
                <span className="leading-tight transition-colors duration-300 group-hover:text-primary">
                  Popular films
                </span>
              </Button>
              <Button
                variant="outline"
                className="py-12 px-8 h-auto text-xl font-bold border-primary/10 bg-background/50 hover:bg-primary/10 hover:text-primary hover:border-primary/50 transition-all rounded-3xl flex flex-col items-center justify-center whitespace-normal text-center shadow-lg hover:shadow-primary/5 group"
                onClick={() => setStep(1)}
              >
                <span className="leading-tight transition-colors duration-300 group-hover:text-primary">
                  Niche films
                </span>
              </Button>
            </div>
          </motion.div>
        );
    }
  };

  return (
    <GameLayout
      top={<div />}
      middle={
        <div className="w-full h-full flex items-center justify-center min-h-[60vh]">
          <AnimatePresence mode="wait">{renderContent()}</AnimatePresence>
        </div>
      }
    />
  );
};
