'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { GameBackground } from '@/components/game/shared/GameBackground';
import { GameLayout } from '@/components/game/shared/GameLayout';

interface GenreIntroDialogueProps {
  onComplete: () => void;
}

type DialogueKey = 'start' | 'fun' | 'dk';

export const GenreIntroDialogue: React.FC<GenreIntroDialogueProps> = ({ onComplete }) => {
  const [dialogueKey, setDialogueKey] = useState<DialogueKey>('start');
  const [isAnimationComplete, setIsAnimationComplete] = useState(false);

  React.useEffect(() => {
    setIsAnimationComplete(false);
  }, [dialogueKey]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0, transition: { duration: 0.2 } },
  };

  const sequentialFade = {
    hidden: { opacity: 0 },
    visible: (i: number) => ({
      opacity: 1,
      transition: { delay: i * 1.2, duration: 0.8 },
    }),
  };

  const sequentialSlide = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 1.2, duration: 0.8 },
    }),
  };

  const renderContent = () => {
    switch (dialogueKey) {
      case 'start':
        return (
          <>
            <motion.div
              variants={sequentialFade}
              custom={0}
              onAnimationComplete={() => setIsAnimationComplete(true)}
              className="text-xl md:text-3xl font-serif text-primary leading-relaxed text-center mb-12"
            >
              What do you think of the game and our analysis so far?
            </motion.div>

            <div className="flex flex-col gap-4 w-full max-w-sm shrink-0">
              <motion.div variants={sequentialSlide} custom={1.2}>
                <Button
                  variant="outline"
                  onClick={() => setDialogueKey('fun')}
                  disabled={!isAnimationComplete}
                  className={`w-full text-lg py-6 border-primary/20 bg-background/50 transition-all duration-300 ${
                    !isAnimationComplete
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-primary/10 hover:text-primary hover:border-primary/50'
                  }`}
                >
                  It&apos;s actually really fun!
                </Button>
              </motion.div>
              <motion.div variants={sequentialSlide} custom={1.4}>
                <Button
                  variant="outline"
                  onClick={() => setDialogueKey('dk')}
                  disabled={!isAnimationComplete}
                  className={`w-full text-lg py-6 border-primary/20 bg-background/50 transition-all duration-300 ${
                    !isAnimationComplete
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-primary/10 hover:text-primary hover:border-primary/50'
                  }`}
                >
                  I don&apos;t know yet.
                </Button>
              </motion.div>
            </div>
          </>
        );

      case 'fun':
        return (
          <>
            <div className="space-y-6 text-center max-w-3xl mb-12">
              <div className="text-xl md:text-3xl font-serif text-primary leading-relaxed">
                <motion.span variants={sequentialFade} custom={0}>
                  <span className="font-bold">Glad to hear that!</span>{' '}
                </motion.span>
                <motion.span variants={sequentialFade} custom={1}>
                  Let&apos;s move on to the next stage then.
                </motion.span>
              </div>
              <div className="text-xl md:text-3xl font-serif text-primary leading-relaxed">
                <motion.span variants={sequentialFade} custom={2}>
                  Our next game is all about <span className="font-bold">Genres</span>.{' '}
                </motion.span>
                <motion.span variants={sequentialFade} custom={3}>
                  I&apos;ll ask you to rank your highest scoring genres.
                </motion.span>
              </div>
              <div className="text-xl md:text-3xl font-serif text-primary leading-relaxed">
                <motion.span variants={sequentialFade} custom={4}>
                  And yes,{' '}
                </motion.span>
                <motion.span variants={sequentialFade} custom={5}>
                  if you score over{' '}
                  <span className="font-bold text-3xl ml-1 text-green-500">75</span>
                  <span className="font-bold text-3xl mr-1">/100</span>,{' '}
                </motion.span>
                <motion.span variants={sequentialFade} custom={6}>
                  again,{' '}
                </motion.span>
                <motion.span variants={sequentialFade} custom={7}>
                  we&apos;ll unlock a<span className="font-bold"> deeper analysis</span>.
                </motion.span>
              </div>
            </div>

            <motion.div
              variants={sequentialSlide}
              custom={8}
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

      case 'dk':
        return (
          <>
            <div className="space-y-6 text-center max-w-3xl mb-12">
              <div className="text-xl md:text-3xl font-serif text-primary leading-relaxed">
                <motion.span variants={sequentialFade} custom={0}>
                  Let&apos;s keep going to see what awaits you.
                </motion.span>
              </div>
              <div className="text-xl md:text-3xl font-serif text-primary leading-relaxed">
                <motion.span variants={sequentialFade} custom={1}>
                  Our next game is all about <span className="font-bold">Genres</span>.{' '}
                </motion.span>
                <motion.span variants={sequentialFade} custom={2}>
                  I&apos;ll ask you to rank your highest scoring genres.
                </motion.span>
              </div>
              <div className="text-xl md:text-3xl font-serif text-primary leading-relaxed">
                <motion.span variants={sequentialFade} custom={3}>
                  And yes,{' '}
                </motion.span>
                <motion.span variants={sequentialFade} custom={4}>
                  if you score over{' '}
                  <span className="font-bold text-3xl ml-1 text-green-500">75</span>
                  <span className="font-bold text-3xl mr-1">/100</span>,{' '}
                </motion.span>
                <motion.span variants={sequentialFade} custom={5}>
                  again,{' '}
                </motion.span>
                <motion.span variants={sequentialFade} custom={6}>
                  we&apos;ll unlock a<span className="font-bold"> deeper analysis</span>.
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
