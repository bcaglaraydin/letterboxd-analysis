'use client';

import React from 'react';
import { motion, type Variants } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

import { getScoreColor } from '@/lib/scoreUtils';

interface IntroStepProps {
  score: number;
  onNext: () => void;
}

export const IntroStep: React.FC<IntroStepProps> = ({ score, onNext }) => {
  const isHighScore = score >= 75;
  const scoreColor = getScoreColor(score);
  const [lowScoreStep, setLowScoreStep] = React.useState(0);
  const [isAnimationComplete, setIsAnimationComplete] = React.useState(false);

  // Reset animation state when step changes
  React.useEffect(() => {
    setIsAnimationComplete(false);
  }, [lowScoreStep]);

  const handleNext = () => {
    if (isAnimationComplete) {
      onNext();
    }
  };

  const handleLowScoreNext = () => {
    if (isAnimationComplete) {
      setLowScoreStep(1);
    }
  };

  const container: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1 },
    exit: { opacity: 0, transition: { duration: 0.5 } },
  };

  const sequentialItem: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 1.2 + 0.5, duration: 1.2, ease: 'easeOut' },
    }),
  };

  // High Score View (Unchanged layout, updated typography for consistency)
  if (isHighScore) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[100dvh] w-full text-center p-6">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="flex flex-col items-center space-y-8 max-w-4xl mx-auto"
        >
          {/* 1. The results are in... */}
          <motion.div
            variants={sequentialItem}
            custom={0}
            className="text-2xl md:text-4xl text-primary font-serif font-bold tracking-tight"
          >
            The results are in...
          </motion.div>

          <motion.div
            variants={sequentialItem}
            custom={1}
            className="flex flex-col md:flex-row items-center md:items-baseline justify-center gap-2 md:gap-3 flex-wrap"
          >
            {/* 2. Congratulations, you scored + Score Block (Grouped) */}
            <span className="text-xl md:text-3xl text-muted-foreground text-center">
              Congratulations, you scored
            </span>

            {/* 3. Score Block */}
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

          <div className="text-xl md:text-3xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {/* 3. Your intuition... */}
            <motion.span variants={sequentialItem} custom={2}>
              Your intuition is sharp.{' '}
            </motion.span>
            {/* 4. Impressive */}
            <motion.span
              variants={sequentialItem}
              custom={3}
              className="font-bold tracking-tight text-primary"
            >
              Impressive.
            </motion.span>
          </div>

          <motion.div
            variants={sequentialItem}
            custom={4}
            className="pt-8"
            onAnimationComplete={() => setIsAnimationComplete(true)}
          >
            <motion.button
              whileHover={isAnimationComplete ? { scale: 1.05 } : {}}
              whileTap={isAnimationComplete ? { scale: 0.95 } : {}}
              onClick={handleNext}
              disabled={!isAnimationComplete}
              className={`bg-primary text-primary-foreground px-12 py-6 rounded-full text-xl font-bold flex items-center gap-3 shadow-lg transition-all touch-manipulation ${
                !isAnimationComplete ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-primary/50'
              }`}
            >
              Let&apos;s go <ArrowRight size={24} />
            </motion.button>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // Low Score View - Step 1
  if (lowScoreStep === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[100dvh] w-full text-center p-6">
        <motion.div
          key="step1"
          variants={container}
          initial="hidden"
          animate="show"
          exit="exit"
          className="flex flex-col items-center space-y-8 max-w-4xl mx-auto"
        >
          {/* Header matching High Score */}
          <motion.div
            variants={sequentialItem}
            custom={0}
            className="text-2xl md:text-4xl text-primary font-serif font-bold tracking-tight"
          >
            The results are in...
          </motion.div>

          <motion.div
            variants={sequentialItem}
            custom={1}
            className="flex flex-col md:flex-row items-center md:items-baseline justify-center gap-2 md:gap-3 flex-wrap"
          >
            <span className="text-xl md:text-3xl text-muted-foreground text-center">
              I see you scored
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

          <motion.p
            variants={sequentialItem}
            custom={2}
            className="text-xl md:text-3xl text-primary font-bold font-serif leading-relaxed"
          >
            This is below the threshold.
          </motion.p>

          <motion.div
            variants={sequentialItem}
            custom={3}
            className="pt-8 w-full flex justify-center"
            onAnimationComplete={() => setIsAnimationComplete(true)}
          >
            <Button
              variant="outline"
              onClick={handleLowScoreNext}
              disabled={!isAnimationComplete}
              className={`w-full max-w-sm text-lg py-6 border-primary/20 bg-background/50 transition-all duration-300 ${
                !isAnimationComplete
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-primary/10 hover:text-primary hover:border-primary/50'
              }`}
            >
              I know.
            </Button>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // Low Score View - Step 2
  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] w-full text-center p-6">
      <motion.div
        key="step2"
        variants={container}
        initial="hidden"
        animate="show"
        className="flex flex-col items-center space-y-8 max-w-4xl mx-auto"
      >
        <motion.p
          variants={sequentialItem}
          custom={0}
          className="text-xl md:text-3xl text-primary font-serif leading-relaxed px-4"
        >
          Okay.. As this is your first test, I will show you the analysis anyway.
        </motion.p>

        <motion.div
          variants={sequentialItem}
          custom={1}
          className="pt-8 w-full flex justify-center"
          onAnimationComplete={() => setIsAnimationComplete(true)}
        >
          <motion.button
            whileHover={isAnimationComplete ? { scale: 1.05 } : {}}
            whileTap={isAnimationComplete ? { scale: 0.95 } : {}}
            onClick={handleNext}
            disabled={!isAnimationComplete}
            className={`bg-primary text-primary-foreground px-12 py-6 rounded-full text-xl font-bold flex items-center gap-3 shadow-lg transition-all touch-manipulation ${
              !isAnimationComplete ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-primary/50'
            }`}
          >
            Thank you <ArrowRight size={24} />
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  );
};
