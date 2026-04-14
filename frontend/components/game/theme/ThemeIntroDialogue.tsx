'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { GameBackground } from '@/components/game/shared/GameBackground';
import { GameLayout } from '@/components/game/shared/GameLayout';

interface ThemeIntroDialogueProps {
  onComplete: () => void;
}

type DialogueKey = 'start' | 'known' | 'unknown';

// ─── Animation Config ────────────────────────────────────────────────────────
// All timing and motion values live here. Tune freely without touching JSX.
const DIALOGUE_ANIMATIONS = {
  // Dialogue container: wraps every screen transition
  container: {
    exitDuration: 0.2,
  },

  // Regular sentences that fade in one after another (custom = step index)
  sequentialFade: {
    stepInterval: 1.4, // seconds between each step
    duration: 0.9, // fade-in duration per sentence
  },

  // CTA buttons slide up after the sentences
  sequentialSlide: {
    stepInterval: 1.4,
    duration: 0.9,
    yOffset: 20, // starting vertical offset (px)
  },
} as const;
// ─────────────────────────────────────────────────────────────────────────────

export const ThemeIntroDialogue: React.FC<ThemeIntroDialogueProps> = ({ onComplete }) => {
  const [dialogueKey, setDialogueKey] = useState<DialogueKey>('start');
  const [isAnimationComplete, setIsAnimationComplete] = useState(false);

  React.useEffect(() => {
    setIsAnimationComplete(false);
  }, [dialogueKey]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0, transition: { duration: DIALOGUE_ANIMATIONS.container.exitDuration } },
  };

  const sequentialFade = {
    hidden: { opacity: 0 },
    visible: (i: number) => ({
      opacity: 1,
      transition: {
        delay: i * DIALOGUE_ANIMATIONS.sequentialFade.stepInterval,
        duration: DIALOGUE_ANIMATIONS.sequentialFade.duration,
      },
    }),
  };

  const sequentialSlide = {
    hidden: { opacity: 0, y: DIALOGUE_ANIMATIONS.sequentialSlide.yOffset },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * DIALOGUE_ANIMATIONS.sequentialFade.stepInterval,
        duration: DIALOGUE_ANIMATIONS.sequentialSlide.duration,
      },
    }),
  };

  const renderContent = () => {
    switch (dialogueKey) {
      case 'start':
        return (
          <>
            <div className="space-y-6 text-center max-w-3xl mb-12">
              <div className="text-xl md:text-3xl font-serif text-primary leading-relaxed">
                <motion.span variants={sequentialFade} custom={0}>
                  We all know what an Action or Comedy movie is.{' '}
                </motion.span>
                <motion.span variants={sequentialFade} custom={1}>
                  That&apos;s basic cinema stuff.{' '}
                </motion.span>
              </div>
              <div className="text-xl md:text-3xl font-serif text-primary leading-relaxed">
                <motion.span variants={sequentialFade} custom={2}>
                  But... did you know Letterboxd assigns <span className="font-bold">themes</span>{' '}
                  to movies?
                </motion.span>
              </div>
            </div>

            <motion.div
              variants={sequentialFade}
              custom={3}
              onAnimationComplete={() => setIsAnimationComplete(true)}
              className="w-full"
            />

            <div className="flex flex-col gap-4 w-full max-w-sm shrink-0">
              <motion.div variants={sequentialSlide} custom={3}>
                <Button
                  variant="outline"
                  onClick={() => setDialogueKey('known')}
                  disabled={!isAnimationComplete}
                  className={`w-full text-lg py-6 border-primary/20 bg-background/50 transition-all duration-300 ${
                    !isAnimationComplete
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-primary/10 hover:text-primary hover:border-primary/50'
                  }`}
                >
                  Of course I am
                </Button>
              </motion.div>
              <motion.div variants={sequentialSlide} custom={3.2}>
                <Button
                  variant="outline"
                  onClick={() => setDialogueKey('unknown')}
                  disabled={!isAnimationComplete}
                  className={`w-full text-lg py-6 border-primary/20 bg-background/50 transition-all duration-300 ${
                    !isAnimationComplete
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-primary/10 hover:text-primary hover:border-primary/50'
                  }`}
                >
                  Wait, what themes?
                </Button>
              </motion.div>
            </div>
          </>
        );

      case 'known':
        return (
          <>
            <div className="space-y-6 text-center max-w-3xl mb-12">
              <div className="text-xl md:text-3xl font-serif text-primary leading-relaxed">
                <motion.span variants={sequentialFade} custom={0}>
                  Ah, so you&apos;re familiar with themes like
                </motion.span>
              </div>

              <div className="text-xl md:text-3xl font-serif font-bold text-primary leading-relaxed">
                <motion.span variants={sequentialFade} custom={1}>
                  &lsquo;Intense violence and sexual transgression&rsquo;
                </motion.span>
              </div>

              <div className="text-xl md:text-3xl font-serif text-primary leading-relaxed">
                <motion.span variants={sequentialFade} custom={2}>
                  or
                </motion.span>
              </div>

              <div className="text-xl md:text-3xl font-serif font-bold text-primary leading-relaxed">
                <motion.span variants={sequentialFade} custom={3}>
                  &lsquo;Surreal and thought-provoking visions of life and death&rsquo;
                </motion.span>
              </div>

              <div className="text-xl md:text-3xl font-serif text-primary leading-relaxed">
                <motion.span variants={sequentialFade} custom={4}>
                  In this next round, I want you to guess movies based on their themes.
                </motion.span>
              </div>
              <div className="text-xl md:text-3xl font-serif text-primary leading-relaxed">
                <motion.span variants={sequentialFade} custom={5}>
                  If you can&apos;t, we will reveal more clues, but you will get fewer points.
                </motion.span>
              </div>
            </div>

            <motion.div
              variants={sequentialSlide}
              custom={6}
              onAnimationComplete={() => setIsAnimationComplete(true)}
              className="w-full flex justify-center shrink-0"
            >
              <Button
                size="lg"
                onClick={onComplete}
                disabled={!isAnimationComplete}
                className={`px-12 py-6 h-auto text-lg font-bold tracking-widest uppercase rounded-xl shadow-lg transform duration-200 ${
                  !isAnimationComplete
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:shadow-xl hover:-translate-y-0.5'
                }`}
              >
                Continue
              </Button>
            </motion.div>
          </>
        );

      case 'unknown':
        return (
          <>
            <div className="space-y-6 text-center max-w-3xl mb-12">
              <div className="text-xl md:text-3xl font-serif text-primary leading-relaxed">
                <motion.span variants={sequentialFade} custom={0}>
                  Like
                </motion.span>
              </div>

              <div className="text-xl md:text-3xl font-serif font-bold text-primary leading-relaxed">
                <motion.span variants={sequentialFade} custom={1}>
                  &lsquo;Intense violence and sexual transgression&rsquo;
                </motion.span>
              </div>

              <div className="text-xl md:text-3xl font-serif text-primary leading-relaxed">
                <motion.span variants={sequentialFade} custom={2}>
                  or
                </motion.span>
              </div>

              <div className="text-xl md:text-3xl font-serif font-bold text-primary leading-relaxed">
                <motion.span variants={sequentialFade} custom={3}>
                  &lsquo;Surreal and thought-provoking visions of life and death&rsquo;
                </motion.span>
              </div>

              <div className="text-xl md:text-3xl font-serif text-primary leading-relaxed">
                <motion.span variants={sequentialFade} custom={4}>
                  Yes, these are real, you are going to see more of them now.
                </motion.span>
              </div>
              <div className="text-xl md:text-3xl font-serif text-primary leading-relaxed">
                <motion.span variants={sequentialFade} custom={5}>
                  In this next round, I want you to guess movies based on their themes.
                </motion.span>
              </div>
              <div className="text-xl md:text-3xl font-serif text-primary leading-relaxed">
                <motion.span variants={sequentialFade} custom={6}>
                  If you can&apos;t, we will reveal more clues, but you will get fewer points.
                </motion.span>
              </div>
            </div>

            <motion.div
              variants={sequentialSlide}
              custom={7}
              onAnimationComplete={() => setIsAnimationComplete(true)}
              className="w-full flex justify-center shrink-0"
            >
              <Button
                size="lg"
                onClick={onComplete}
                disabled={!isAnimationComplete}
                className={`px-12 py-6 h-auto text-lg font-bold tracking-widest uppercase rounded-xl shadow-lg transform duration-200 ${
                  !isAnimationComplete
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:shadow-xl hover:-translate-y-0.5'
                }`}
              >
                Continue
              </Button>
            </motion.div>
          </>
        );
    }
  };

  return (
    <GameBackground>
      <GameLayout
        className="w-full max-w-4xl mx-auto"
        top={<div />}
        middle={
          <div className="flex flex-col items-center justify-center w-full px-6 min-h-[50vh]">
            <AnimatePresence mode="wait">
              <motion.div
                key={dialogueKey}
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="flex flex-col items-center w-full"
              >
                {renderContent()}
              </motion.div>
            </AnimatePresence>
          </div>
        }
      />
    </GameBackground>
  );
};
