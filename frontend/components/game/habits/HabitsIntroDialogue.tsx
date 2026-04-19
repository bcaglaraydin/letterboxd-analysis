'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { GameBackground } from '@/components/game/shared/GameBackground';
import { GameLayout } from '@/components/game/shared/GameLayout';
import { useExperienceStore } from '@/store/core/experienceStore';
import { useUserStore } from '@/store/core/userStore';
import type { RatingGameMovie } from '@/lib/api';
import { computeDialogueTiming, type DialogueLine } from '@/lib/useDialogueTiming';

interface HabitsIntroDialogueProps {
  onComplete: () => void;
}

type DialogueState = 'greeting' | 'compare' | 'early_exit' | 'mid_exit' | 'late_exit' | 'finish';

export const HabitsIntroDialogue: React.FC<HabitsIntroDialogueProps> = ({ onComplete }) => {
  const [dialogueState, setDialogueState] = useState<DialogueState>('greeting');
  const [compareStep, setCompareStep] = useState(0);
  const [isAnimationComplete, setIsAnimationComplete] = useState(false);
  const [exitMovieName, setExitMovieName] = useState('');

  const userEnjoymentChoice = useExperienceStore((state) => state.userEnjoymentChoice);
  const userStats = useUserStore((state) => state.userStats);

  const comparisonMovies = userStats?.comparisonMovies || [];

  const forceAnimationReset = (newState: DialogueState) => {
    setIsAnimationComplete(false);
    setDialogueState(newState);
  };

  // Build the lines dynamically to handle dynamic text like exitMovieName or userEnjoymentChoice
  const currentLines = useMemo<DialogueLine[]>(() => {
    switch (dialogueState) {
      case 'greeting':
        return userEnjoymentChoice === 'fun'
          ? [
              { text: 'You mentioned earlier that you were having fun. ' },
              { text: "Let's hope that's still true, because the test isn't over. " },
              { text: 'What do you think now?' },
            ]
          : [
              { text: "Earlier you weren't fully entertained by this analysis. " },
              { text: 'What do you think now?' },
            ];
      case 'compare':
        return [{ text: "Let's put that into perspective. Which one is worse?" }];
      case 'early_exit':
        return [
          { text: "Fair enough. That's a great movie. " },
          { text: `Even I can't compete with ${exitMovieName}.` },
        ];
      case 'mid_exit':
        return [{ text: "I don't know how I should feel about this yet." }];
      case 'late_exit':
        return [{ text: 'I have no words.' }];
      case 'finish':
        return [
          { text: 'We will have a few multiple choice questions. ' },
          { text: "It's entirely about your preferences. " },
          { text: 'This is actually the last part. ' },
          { text: 'Keep going.' },
        ];
      default:
        return [];
    }
  }, [dialogueState, userEnjoymentChoice, exitMovieName]);

  const { delays, fadeVariants, slideVariants, totalSequenceDuration } =
    computeDialogueTiming(currentLines);

  const buttonDelay = totalSequenceDuration;
  const secondButtonDelay = totalSequenceDuration + 0.2;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0, transition: { duration: 0.2 } },
  };

  const handleGreetingAnswer = () => {
    if (comparisonMovies.length > 0) {
      setCompareStep(0);
      forceAnimationReset('compare');
    } else {
      forceAnimationReset('finish');
    }
  };

  const handleMovieChoice = (movie: RatingGameMovie, currentStep: number) => {
    setExitMovieName(movie.title);
    if (currentStep <= 1) forceAnimationReset('early_exit');
    else if (currentStep === 2) forceAnimationReset('mid_exit');
    else forceAnimationReset('late_exit');
  };

  const handleExperienceChoice = (currentStep: number) => {
    if (currentStep < 4 && comparisonMovies.length > currentStep + 1) {
      setCompareStep(currentStep + 1);
    } else {
      forceAnimationReset('late_exit');
    }
  };

  const renderComparisonRound = (stepIndex: number) => {
    const movie = comparisonMovies[stepIndex];
    if (!movie) return null;

    // For comparison rounds, we want the buttons to appear much faster than standard dialogue
    const fastButtonDelay = 0.4;
    const fastSecondButtonDelay = 0.55;

    return (
      <div className="flex flex-col items-center w-full">
        <div className="space-y-6 text-center max-w-3xl mb-12">
          <div className="text-xl md:text-3xl font-serif text-primary leading-relaxed">
            <span>Let&apos;s put that into perspective. Which one is worse?</span>
          </div>
        </div>

        <div className="w-full flex justify-center h-40">
          <AnimatePresence mode="wait">
            <motion.div
              key={stepIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-4 w-full max-w-sm shrink-0 mt-4"
            >
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: fastButtonDelay, duration: 0.4 }}
              >
                <Button
                  variant="outline"
                  onClick={() => handleMovieChoice(movie, stepIndex)}
                  className={`w-full py-6 border-primary/20 bg-background/50 transition-all duration-300 ${
                    movie.title.length > 35
                      ? 'text-xs'
                      : movie.title.length > 20
                        ? 'text-sm md:text-base'
                        : 'text-lg'
                  } hover:bg-primary/10 hover:text-primary hover:border-primary/50`}
                >
                  {movie.title}
                </Button>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: fastSecondButtonDelay, duration: 0.4 }}
              >
                <Button
                  variant="outline"
                  onClick={() => handleExperienceChoice(stepIndex)}
                  className="w-full text-lg py-6 border-primary/20 bg-background/50 transition-all duration-300 hover:bg-primary/10 hover:text-primary hover:border-primary/50"
                >
                  This experience
                </Button>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (dialogueState) {
      case 'greeting':
        return (
          <>
            <div className="space-y-6 text-center max-w-3xl mb-12">
              <div className="text-xl md:text-3xl font-serif text-primary leading-relaxed">
                {userEnjoymentChoice === 'fun' ? (
                  <>
                    <motion.span variants={fadeVariants} custom={delays[0]}>
                      You mentioned earlier that you were having fun.{' '}
                    </motion.span>
                    <motion.span variants={fadeVariants} custom={delays[1]}>
                      Let&apos;s hope that&apos;s still true, because the test isn&apos;t over.{' '}
                    </motion.span>
                    <br />
                    <br />
                    <motion.span variants={fadeVariants} custom={delays[2]}>
                      What do you think now?
                    </motion.span>
                  </>
                ) : (
                  <>
                    <motion.span variants={fadeVariants} custom={delays[0]}>
                      Earlier you weren&apos;t fully entertained by this analysis.{' '}
                    </motion.span>
                    <motion.span variants={fadeVariants} custom={delays[1]}>
                      What do you think now?
                    </motion.span>
                  </>
                )}
              </div>
            </div>

            <motion.div
              variants={fadeVariants}
              custom={buttonDelay}
              onAnimationComplete={() => setIsAnimationComplete(true)}
            />

            <div className="flex flex-col gap-4 w-full max-w-sm shrink-0">
              <motion.div variants={slideVariants} custom={buttonDelay}>
                <Button
                  variant="outline"
                  onClick={handleGreetingAnswer}
                  disabled={!isAnimationComplete}
                  className={`w-full text-lg py-6 border-primary/20 bg-background/50 transition-all duration-300 ${
                    !isAnimationComplete
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-primary/10 hover:text-primary hover:border-primary/50'
                  }`}
                >
                  Not bad
                </Button>
              </motion.div>
              <motion.div variants={slideVariants} custom={secondButtonDelay}>
                <Button
                  variant="outline"
                  onClick={handleGreetingAnswer}
                  disabled={!isAnimationComplete}
                  className={`w-full text-lg py-6 border-primary/20 bg-background/50 transition-all duration-300 ${
                    !isAnimationComplete
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-primary/10 hover:text-primary hover:border-primary/50'
                  }`}
                >
                  Not entertaining
                </Button>
              </motion.div>
            </div>
          </>
        );

      case 'compare':
        return renderComparisonRound(compareStep);

      case 'early_exit':
        return (
          <>
            <div className="space-y-6 text-center max-w-3xl mb-12">
              <div className="text-xl md:text-3xl font-serif text-primary leading-relaxed">
                <motion.span variants={fadeVariants} custom={delays[0]}>
                  Fair enough. That&apos;s a great movie.{' '}
                </motion.span>
                <motion.span variants={fadeVariants} custom={delays[1]}>
                  Even I can&apos;t compete with <span className="font-bold">{exitMovieName}</span>.
                </motion.span>
              </div>
            </div>

            <motion.div
              variants={fadeVariants}
              custom={buttonDelay}
              onAnimationComplete={() => setIsAnimationComplete(true)}
            />

            <motion.div variants={slideVariants} custom={buttonDelay}>
              <Button
                onClick={() => setDialogueState('finish')}
                disabled={!isAnimationComplete}
                className="px-12 py-6 h-auto text-lg font-bold tracking-widest uppercase rounded-xl"
              >
                Continue
              </Button>
            </motion.div>
          </>
        );

      case 'mid_exit':
        return (
          <>
            <div className="space-y-6 text-center max-w-3xl mb-12">
              <div className="text-xl md:text-3xl font-serif text-primary leading-relaxed">
                <motion.span variants={fadeVariants} custom={delays[0]}>
                  I don&apos;t know how I should feel about this yet.
                </motion.span>
              </div>
            </div>

            <motion.div
              variants={fadeVariants}
              custom={buttonDelay}
              onAnimationComplete={() => setIsAnimationComplete(true)}
            />

            <motion.div variants={slideVariants} custom={buttonDelay}>
              <Button
                onClick={() => setDialogueState('finish')}
                disabled={!isAnimationComplete}
                className="px-12 py-6 h-auto text-lg font-bold tracking-widest uppercase rounded-xl"
              >
                Continue
              </Button>
            </motion.div>
          </>
        );

      case 'late_exit':
        return (
          <>
            <div className="space-y-6 text-center max-w-3xl mb-12">
              <div className="text-xl md:text-3xl font-serif text-primary leading-relaxed">
                <motion.span variants={fadeVariants} custom={delays[0]}>
                  I have no words.
                </motion.span>
              </div>
            </div>

            <motion.div
              variants={fadeVariants}
              custom={buttonDelay}
              onAnimationComplete={() => setIsAnimationComplete(true)}
            />

            <motion.div variants={slideVariants} custom={buttonDelay}>
              <Button
                onClick={() => setDialogueState('finish')}
                disabled={!isAnimationComplete}
                className="px-12 py-6 h-auto text-lg font-bold tracking-widest uppercase rounded-xl"
              >
                Continue
              </Button>
            </motion.div>
          </>
        );

      case 'finish':
        return (
          <>
            <div className="space-y-6 text-center max-w-3xl mb-12">
              <div className="text-xl md:text-3xl font-serif text-primary leading-relaxed">
                <motion.span variants={fadeVariants} custom={delays[0]}>
                  We will have a few multiple choice questions.{' '}
                </motion.span>
                <motion.span variants={fadeVariants} custom={delays[1]}>
                  It&apos;s entirely about your preferences.{' '}
                </motion.span>
                <motion.span variants={fadeVariants} custom={delays[2]}>
                  This is actually the last part.{' '}
                  <motion.span variants={fadeVariants} custom={delays[3]}>
                    Keep going.
                  </motion.span>
                </motion.span>
              </div>
            </div>

            <motion.div
              variants={fadeVariants}
              custom={buttonDelay}
              onAnimationComplete={() => setIsAnimationComplete(true)}
            />

            <motion.div variants={slideVariants} custom={buttonDelay}>
              <Button
                onClick={onComplete}
                disabled={!isAnimationComplete}
                className="px-12 py-6 h-auto text-lg font-bold tracking-widest uppercase rounded-xl hover:shadow-xl hover:-translate-y-0.5 transform transition-all duration-200"
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
                key={dialogueState}
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
