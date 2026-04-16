import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { DIALOGUE_TIMING } from '@/lib/dialogueConfig';
import { computeDialogueTiming, type DialogueLine } from '@/lib/useDialogueTiming';

interface EntryDialogueProps {
  onStart: () => void;
}

type DialogueKey = 'start' | 'what' | 'dontcare' | 'mockery';

// ─── Dialogue text per screen (stable references for memoization) ───────────

const SCREEN_LINES: Record<DialogueKey, DialogueLine[]> = {
  start: [
    { text: "You've successfully entered a valid username" },
    { text: 'Good!' },
    { text: 'Before we start' },
    { text: 'I need to ask you a few questions.' },
    {
      text: 'Please answer them calmly and honestly. Your responses will not be stored or shared',
    },
  ],
  what: [
    { text: "We're going to look into your film taste in detail." },
    { text: 'It will be fun.' },
    { text: 'But first you need to answer a few questions correctly' },
  ],
  mockery: [{ text: "You don't even know what we're doing", emotion: 'dramatic' }],
  dontcare: [{ text: 'I do not care about you either.', emotion: 'dramatic' }],
};

export const EntryDialogue: React.FC<EntryDialogueProps> = ({ onStart }) => {
  const [dialogueKey, setDialogueKey] = useState<DialogueKey>('start');
  const [isAnimationComplete, setIsAnimationComplete] = useState(false);

  // Reset animation state when key changes
  React.useEffect(() => {
    setIsAnimationComplete(false);
  }, [dialogueKey]);

  // ── Dynamic timing for current screen ──
  const { delays, fadeVariants, slideVariants, totalSequenceDuration } = useMemo(
    () => computeDialogueTiming(SCREEN_LINES[dialogueKey]),
    [dialogueKey],
  );

  // Button delay: appears after all text lines have had their read-time
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
            <div className="text-xl md:text-3xl font-serif text-primary leading-relaxed mb-8 text-center space-y-4">
              <p>
                <motion.span variants={fadeVariants} custom={delays[0]} className="mr-2">
                  <span className="font-bold">You&apos;ve successfully entered</span> a valid
                  username
                </motion.span>
                <motion.span variants={fadeVariants} custom={delays[1]} className="font-bold">
                  Good!
                </motion.span>
              </p>
              <p>
                <motion.span variants={fadeVariants} custom={delays[2]} className="mr-2">
                  Before we start
                </motion.span>
                <motion.span variants={fadeVariants} custom={delays[3]} className="font-bold">
                  I need to ask you a few questions.
                </motion.span>
              </p>
              <motion.p variants={fadeVariants} custom={delays[4]}>
                Please answer them <span className="font-bold">calmly and honestly.</span> Your
                responses will not be stored or shared
              </motion.p>
            </div>
            <div className="flex flex-col gap-4 w-full max-w-sm">
              <motion.div variants={slideVariants} custom={buttonDelay}>
                <Button
                  variant="outline"
                  onClick={() => setDialogueKey('what')}
                  disabled={!isAnimationComplete}
                  className={`w-full text-lg py-6 border-primary/20 bg-background/50 transition-all duration-300 ${
                    !isAnimationComplete
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-primary/10 hover:text-primary hover:border-primary/50'
                  }`}
                >
                  What are we doing exactly?
                </Button>
              </motion.div>
              <motion.div
                variants={slideVariants}
                custom={secondButtonDelay}
                onAnimationComplete={() => setIsAnimationComplete(true)}
              >
                <Button
                  variant="outline"
                  onClick={() => setDialogueKey('mockery')}
                  disabled={!isAnimationComplete}
                  className={`w-full text-lg py-6 border-primary/20 bg-background/50 transition-all duration-300 ${
                    !isAnimationComplete
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-primary/10 hover:text-primary hover:border-primary/50'
                  }`}
                >
                  Okay.
                </Button>
              </motion.div>
            </div>
          </>
        );

      case 'what':
        return (
          <>
            <div className="space-y-4 text-center mb-8 max-w-md">
              <motion.p
                variants={fadeVariants}
                custom={delays[0]}
                className="text-xl md:text-3xl font-serif text-primary leading-relaxed"
              >
                We&apos;re going to look into your film taste in detail.
              </motion.p>
              <motion.p
                variants={fadeVariants}
                custom={delays[1]}
                className="text-xl md:text-3xl font-serif text-primary leading-relaxed"
              >
                It will be fun.
              </motion.p>
              <motion.p
                variants={fadeVariants}
                custom={delays[2]}
                className="text-xl md:text-3xl font-serif text-primary leading-relaxed"
              >
                But first you need to answer a few questions{' '}
                <span className="font-bold">correctly</span>
              </motion.p>
            </div>
            <motion.div
              variants={slideVariants}
              custom={buttonDelay}
              className="w-full max-w-xs"
              onAnimationComplete={() => setIsAnimationComplete(true)}
            >
              <Button
                size="lg"
                onClick={onStart}
                disabled={!isAnimationComplete}
                className={`w-full text-xl py-6 ${!isAnimationComplete ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Let&apos;s start
              </Button>
            </motion.div>
          </>
        );

      case 'mockery':
        return (
          <>
            <motion.p
              variants={slideVariants}
              custom={delays[0]}
              className="text-xl md:text-3xl font-serif text-primary leading-relaxed mb-8 text-center"
            >
              You don&apos;t even know <span className="font-bold">what we&apos;re doing</span>
            </motion.p>
            <div className="flex flex-col gap-4 w-full max-w-sm">
              <motion.div variants={slideVariants} custom={buttonDelay}>
                <Button
                  variant="outline"
                  onClick={() => setDialogueKey('what')}
                  disabled={!isAnimationComplete}
                  className={`w-full text-lg py-6 border-primary/20 bg-background/50 transition-all duration-300 ${
                    !isAnimationComplete
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-primary/10 hover:text-primary hover:border-primary/50'
                  }`}
                >
                  What are we doing exactly?
                </Button>
              </motion.div>
              <motion.div
                variants={slideVariants}
                custom={secondButtonDelay}
                onAnimationComplete={() => setIsAnimationComplete(true)}
              >
                <Button
                  variant="outline"
                  onClick={() => setDialogueKey('dontcare')}
                  disabled={!isAnimationComplete}
                  className={`w-full text-lg py-6 border-primary/20 bg-background/50 transition-all duration-300 ${
                    !isAnimationComplete
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-primary/10 hover:text-primary hover:border-primary/50'
                  }`}
                >
                  I don&apos;t really care.
                </Button>
              </motion.div>
            </div>
          </>
        );

      case 'dontcare':
        return (
          <>
            <motion.p
              variants={slideVariants}
              custom={delays[0]}
              className="text-xl md:text-3xl font-serif text-primary leading-relaxed mb-8 text-center"
            >
              I do not care about you either.
            </motion.p>
            <motion.div
              variants={slideVariants}
              custom={buttonDelay}
              className="w-full max-w-xs"
              onAnimationComplete={() => setIsAnimationComplete(true)}
            >
              <Button
                size="lg"
                onClick={onStart}
                disabled={!isAnimationComplete}
                className={`w-full text-xl py-6 ${!isAnimationComplete ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Let&apos;s start
              </Button>
            </motion.div>
          </>
        );
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-[100dvh] w-full p-6 overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={dialogueKey}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="flex flex-col items-center w-full max-w-4xl"
        >
          {renderContent()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
