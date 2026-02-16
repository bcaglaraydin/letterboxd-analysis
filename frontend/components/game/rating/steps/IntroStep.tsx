'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

import { getScoreColor } from '@/lib/scoreUtils';

interface IntroStepProps {
  score: number;
  onNext: () => void;
}

export const IntroStep: React.FC<IntroStepProps> = ({ score, onNext }) => {
  const isHighScore = score >= 75;
  const scoreColor = getScoreColor(score);

  return (
    <div
      key="intro"
      className="flex flex-col items-center justify-center min-h-[100dvh] w-full text-center p-6 space-y-8 animate-in fade-in duration-700"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="space-y-6 max-w-2xl mx-auto"
      >
        <div className="text-2xl md:text-4xl text-primary font-serif font-bold tracking-tight">
          The results are in...
        </div>

        <div className="flex flex-col items-center space-y-6">
          <div className="flex flex-col md:flex-row items-center md:items-baseline justify-center gap-2 md:gap-3 flex-wrap">
            <span className="text-lg md:text-2xl text-muted-foreground text-center">
              But you scored
            </span>

            <div className="flex items-baseline leading-none">
              <span
                className="text-6xl md:text-8xl font-serif font-black tracking-tighter"
                style={scoreColor}
              >
                {score}
              </span>
              <span className="text-2xl md:text-4xl text-muted-foreground/40 font-bold ml-1">
                /100
              </span>
            </div>
          </div>

          <p className="text-lg md:text-2xl text-muted-foreground max-w-lg mx-auto leading-relaxed">
            {isHighScore
              ? 'Your intuition is sharp. Impressive.'
              : 'As this is your first test, I will show you the analysis anyway.'}
          </p>
        </div>
      </motion.div>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onNext}
        className="bg-primary text-primary-foreground px-10 py-5 rounded-full text-xl font-bold flex items-center gap-3 shadow-lg hover:shadow-primary/50 transition-all touch-manipulation"
      >
        {isHighScore ? "Let's go" : 'Thank you'} <ArrowRight size={24} />
      </motion.button>
    </div>
  );
};
