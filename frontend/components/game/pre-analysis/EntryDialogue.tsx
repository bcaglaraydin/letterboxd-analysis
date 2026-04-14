import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { DIALOGUE_TIMING } from '@/lib/dialogueConfig';

interface EntryDialogueProps {
  onStart: () => void;
}

type DialogueKey = 'start' | 'what' | 'dontcare' | 'mockery';

export const EntryDialogue: React.FC<EntryDialogueProps> = ({ onStart }) => {
  const [dialogueKey, setDialogueKey] = useState<DialogueKey>('start');
  const [isAnimationComplete, setIsAnimationComplete] = useState(false);

  // Reset animation state when key changes
  React.useEffect(() => {
    setIsAnimationComplete(false);
  }, [dialogueKey]);

  // No staggered container needed, we control delays explicitly
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0, transition: { duration: DIALOGUE_TIMING.EXIT_DURATION } },
  };

  const sequentialFade = {
    hidden: { opacity: 0 },
    visible: (i: number) => ({
      opacity: 1,
      transition: {
        delay: i * DIALOGUE_TIMING.STEP_DELAY,
        duration: DIALOGUE_TIMING.FADE_DURATION,
      },
    }),
  };

  const sequentialSlide = {
    hidden: { opacity: 0, y: DIALOGUE_TIMING.SLIDE_Y_OFFSET },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * DIALOGUE_TIMING.STEP_DELAY,
        duration: DIALOGUE_TIMING.FADE_DURATION,
      },
    }),
  };

  const fastSequentialSlide = {
    hidden: { opacity: 0, y: DIALOGUE_TIMING.SLIDE_Y_OFFSET },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.2, duration: 0.5 },
    }),
  };

  const renderContent = () => {
    switch (dialogueKey) {
      case 'start':
        return (
          <>
            <div className="text-xl md:text-3xl font-serif text-primary leading-relaxed mb-8 text-center space-y-4">
              <p>
                <motion.span variants={sequentialFade} custom={0} className="mr-2">
                  <span className="font-bold">You’ve successfully entered</span> a valid username
                </motion.span>
                <motion.span variants={sequentialFade} custom={1} className="font-bold">
                  Good!
                </motion.span>
              </p>
              <p>
                <motion.span variants={sequentialFade} custom={2} className="mr-2">
                  Before we start
                </motion.span>
                <motion.span variants={sequentialFade} custom={3} className="font-bold">
                  I need to ask you a few questions.
                </motion.span>
              </p>
              <motion.p variants={sequentialFade} custom={4}>
                Please answer them <span className="font-bold">calmly and honestly.</span> Your
                responses will not be stored or shared
              </motion.p>
            </div>
            <div className="flex flex-col gap-4 w-full max-w-sm">
              <motion.div variants={sequentialSlide} custom={5}>
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
                variants={sequentialSlide}
                custom={5.2}
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
                variants={sequentialFade}
                custom={0}
                className="text-xl md:text-3xl font-serif text-primary leading-relaxed"
              >
                We’re going to look into your film taste in detail.
              </motion.p>
              <motion.p
                variants={sequentialFade}
                custom={1}
                className="text-xl md:text-3xl font-serif text-primary leading-relaxed"
              >
                It will be fun.
              </motion.p>
              <motion.p
                variants={sequentialFade}
                custom={2}
                className="text-xl md:text-3xl font-serif text-primary leading-relaxed"
              >
                But first you need to answer a few questions{' '}
                <span className="font-bold">correctly</span>
              </motion.p>
            </div>
            <motion.div
              variants={sequentialSlide}
              custom={3}
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
              variants={sequentialSlide}
              custom={0}
              className="text-xl md:text-3xl font-serif text-primary leading-relaxed mb-8 text-center"
            >
              You don’t even know <span className="font-bold">what we’re doing</span>
            </motion.p>
            <div className="flex flex-col gap-4 w-full max-w-sm">
              <motion.div variants={fastSequentialSlide} custom={2}>
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
                variants={fastSequentialSlide}
                custom={3}
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
              variants={sequentialSlide}
              custom={0}
              className="text-xl md:text-3xl font-serif text-primary leading-relaxed mb-8 text-center"
            >
              I do not care about you either.
            </motion.p>
            <motion.div
              variants={sequentialSlide}
              custom={1}
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
