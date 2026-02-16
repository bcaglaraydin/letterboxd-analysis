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

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 1.5,
        delayChildren: 0.5,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { duration: 1.2, ease: [0.16, 1, 0.3, 1] as const } },
  };

  return (
    <div
      key="intro"
      className="flex flex-col items-center justify-center min-h-[100dvh] w-full text-center p-6"
    >
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="flex flex-col items-center space-y-8 max-w-3xl mx-auto"
      >
        {/* 1. The results are in... */}
        <motion.div
          variants={item}
          className="text-2xl md:text-4xl text-primary font-serif font-bold tracking-tight"
        >
          The results are in...
        </motion.div>

        {/* 2. Score Section */}
        <motion.div
          variants={item}
          className="flex flex-col md:flex-row items-center md:items-baseline justify-center gap-2 md:gap-3 flex-wrap"
        >
          <span className="text-lg md:text-2xl text-muted-foreground text-center">
            {isHighScore ? 'Congratulations, you scored' : 'But you scored'}
          </span>

          <div className="flex items-baseline leading-none">
            <span
              className="text-5xl md:text-7xl font-serif font-black tracking-tighter"
              style={scoreColor}
            >
              {score}
            </span>
            <span className="text-2xl md:text-4xl text-muted-foreground/40 font-bold ml-1">
              /100
            </span>
          </div>
        </motion.div>

        {/* 3. As this is your first test... */}
        <motion.p
          variants={item}
          className="text-lg md:text-2xl text-muted-foreground max-w-lg mx-auto leading-relaxed"
        >
          {isHighScore ? (
            <>
              Your intuition is sharp.{' '}
              <span className="font-bold tracking-tight text-primary">Impressive.</span>
            </>
          ) : (
            'As this is your first test, I will show you the analysis anyway.'
          )}
        </motion.p>

        {/* 4. Button */}
        <motion.div variants={item} className="pt-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onNext}
            className="bg-primary text-primary-foreground px-10 py-5 rounded-full text-xl font-bold flex items-center gap-3 shadow-lg hover:shadow-primary/50 transition-all touch-manipulation"
          >
            {isHighScore ? "Let's go" : 'Thank you'} <ArrowRight size={24} />
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  );
};
