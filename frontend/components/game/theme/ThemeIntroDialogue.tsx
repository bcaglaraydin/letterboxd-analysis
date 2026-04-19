'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { GameBackground } from '@/components/game/shared/GameBackground';
import { GameLayout } from '@/components/game/shared/GameLayout';
import { DIALOGUE_TIMING } from '@/lib/dialogueConfig';
import { computeDialogueTiming, type DialogueLine } from '@/lib/useDialogueTiming';

interface ThemeIntroDialogueProps {
  onComplete: () => void;
}

type DialogueKey = 'start' | 'known' | 'unknown';

// ─── Dialogue text per screen (stable references for memoization) ───────────

const SCREEN_LINES: Record<DialogueKey, DialogueLine[]> = {
  start: [
    { text: 'We all know what an Action or Comedy movie is.' },
    { text: "That's basic cinema stuff." },
    {
      text: 'However... are you aware that Letterboxd assigns specific themes to films?',
    },
  ],
  known: [
    { text: "Ah, so you're familiar with themes like" },
    { text: 'Intense violence and sexual transgression', pauseAfter: 1000 },
    { text: 'or' },
    { text: 'Surreal and thought-provoking visions of life and death', pauseAfter: 1000 },
    {
      text: 'In this next round, I want you to guess movies based on their themes.',
    },
    {
      text: "If you can't, we will reveal more clues, but you will get fewer points.",
    },
  ],
  unknown: [
    { text: 'Like' },
    { text: 'Intense violence and sexual transgression', pauseAfter: 1000 },
    { text: 'or' },
    { text: 'Surreal and thought-provoking visions of life and death', pauseAfter: 1000 },
    { text: 'Yes, these are real, you are going to see more of them now.' },
    {
      text: 'In this next round, I want you to guess movies based on their themes.',
    },
    {
      text: "If you can't, we will reveal more clues, but you will get fewer points.",
    },
  ],
};

export const ThemeIntroDialogue: React.FC<ThemeIntroDialogueProps> = ({ onComplete }) => {
  const [dialogueKey, setDialogueKey] = useState<DialogueKey>('start');
  const [isAnimationComplete, setIsAnimationComplete] = useState(false);

  React.useEffect(() => {
    setIsAnimationComplete(false);
  }, [dialogueKey]);

  // ── Dynamic timing for current screen ──
  const { delays, fadeVariants, slideVariants, totalSequenceDuration } = useMemo(
    () => computeDialogueTiming(SCREEN_LINES[dialogueKey]),
    [dialogueKey],
  );

  // Button delay: appears after all text lines
  const buttonDelay = totalSequenceDuration;
  const secondButtonDelay = totalSequenceDuration + 0.2;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0, transition: { duration: DIALOGUE_TIMING.EXIT_DURATION } },
  };

  const renderContent = () => {
    switch (dialogueKey) {
      case 'start':
        return (
          <>
            <div className="space-y-6 text-center max-w-3xl mb-12">
              <div className="text-xl md:text-3xl font-serif text-primary leading-relaxed">
                <motion.span variants={fadeVariants} custom={delays[0]}>
                  We all know what an Action or Comedy movie is.{' '}
                </motion.span>
                <motion.span variants={fadeVariants} custom={delays[1]}>
                  That&apos;s basic cinema stuff.{' '}
                </motion.span>
              </div>
              <div className="text-xl md:text-3xl font-serif text-primary leading-relaxed">
                <motion.span variants={fadeVariants} custom={delays[2]}>
                  However... are you aware that Letterboxd assigns{' '}
                  <span className="font-bold">specific themes</span> to films?
                </motion.span>
              </div>
            </div>

            <motion.div
              variants={fadeVariants}
              custom={buttonDelay}
              onAnimationComplete={() => setIsAnimationComplete(true)}
              className="w-full"
            />

            <div className="flex flex-col gap-4 w-full max-w-sm shrink-0">
              <motion.div variants={slideVariants} custom={buttonDelay}>
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
              <motion.div variants={slideVariants} custom={secondButtonDelay}>
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
                <motion.span variants={fadeVariants} custom={delays[0]}>
                  Ah, so you&apos;re familiar with themes like
                </motion.span>
              </div>

              <div className="text-xl md:text-3xl font-serif font-bold text-primary leading-relaxed">
                <motion.span variants={fadeVariants} custom={delays[1]}>
                  &lsquo;Intense violence and sexual transgression&rsquo;
                </motion.span>
              </div>

              <div className="text-xl md:text-3xl font-serif text-primary leading-relaxed">
                <motion.span variants={fadeVariants} custom={delays[2]}>
                  or
                </motion.span>
              </div>

              <div className="text-xl md:text-3xl font-serif font-bold text-primary leading-relaxed">
                <motion.span variants={fadeVariants} custom={delays[3]}>
                  &lsquo;Surreal and thought-provoking visions of life and death&rsquo;
                </motion.span>
              </div>

              <div className="text-xl md:text-3xl font-serif text-primary leading-relaxed">
                <motion.span variants={fadeVariants} custom={delays[4]}>
                  In this next round, I want you to{' '}
                  <span className="font-bold">guess movies based on their themes.</span>
                </motion.span>
              </div>
              <div className="text-xl md:text-3xl font-serif text-primary leading-relaxed">
                <motion.span variants={fadeVariants} custom={delays[5]}>
                  If you can&apos;t, we will reveal more clues,{' '}
                  <span className="font-bold">but you will get fewer points.</span>
                </motion.span>
              </div>
            </div>

            <motion.div
              variants={slideVariants}
              custom={buttonDelay}
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
                <motion.span variants={fadeVariants} custom={delays[0]}>
                  Like
                </motion.span>
              </div>

              <div className="text-xl md:text-3xl font-serif font-bold text-primary leading-relaxed">
                <motion.span variants={fadeVariants} custom={delays[1]}>
                  &lsquo;Intense violence and sexual transgression&rsquo;
                </motion.span>
              </div>

              <div className="text-xl md:text-3xl font-serif text-primary leading-relaxed">
                <motion.span variants={fadeVariants} custom={delays[2]}>
                  or
                </motion.span>
              </div>

              <div className="text-xl md:text-3xl font-serif font-bold text-primary leading-relaxed">
                <motion.span variants={fadeVariants} custom={delays[3]}>
                  &lsquo;Surreal and thought-provoking visions of life and death&rsquo;
                </motion.span>
              </div>

              <div className="text-xl md:text-3xl font-serif text-primary leading-relaxed">
                <motion.span variants={fadeVariants} custom={delays[4]}>
                  Yes, these are real, you are going to see more of them now.
                </motion.span>
              </div>
              <div className="text-xl md:text-3xl font-serif text-primary leading-relaxed">
                <motion.span variants={fadeVariants} custom={delays[5]}>
                  In this next round, I want you to{' '}
                  <span className="font-bold">guess movies based on their themes.</span>
                </motion.span>
              </div>
              <div className="text-xl md:text-3xl font-serif text-primary leading-relaxed">
                <motion.span variants={fadeVariants} custom={delays[6]}>
                  If you can&apos;t, we will reveal more clues,{' '}
                  <span className="font-bold">but you will get fewer points.</span>
                </motion.span>
              </div>
            </div>

            <motion.div
              variants={slideVariants}
              custom={buttonDelay}
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
