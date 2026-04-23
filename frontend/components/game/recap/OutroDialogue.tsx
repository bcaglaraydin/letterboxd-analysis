'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { GameBackground } from '@/components/game/shared/GameBackground';
import { GameLayout } from '@/components/game/shared/GameLayout';
import { useDialogueTiming, type DialogueLine } from '@/lib/useDialogueTiming';

interface OutroDialogueProps {
  onComplete: () => void;
}

const OUTRO_LINES: DialogueLine[] = [
  { text: 'Our journey has come to an end…' },
  { text: 'This was a project I developed as a hobby.' },
  { text: 'I truly enjoyed building it, and I hope you enjoyed it too.' },
  { text: 'On the next page, your cinematic identity card is waiting for you.' },
  {
    text: 'After downloading yours, you can start again by entering a friend’s username and get their cinematic identity card to see how well you know them.',
  },
  { text: 'Go ahead, take it:' },
];

export const OutroDialogue: React.FC<OutroDialogueProps> = ({ onComplete }) => {
  const [isAnimationComplete, setIsAnimationComplete] = useState(false);

  const { delays, fadeVariants, slideVariants, totalSequenceDuration } =
    useDialogueTiming(OUTRO_LINES);

  // Button appears exactly after the dialogue finishes sequentially
  const buttonDelay = totalSequenceDuration;

  return (
    <GameBackground>
      <GameLayout
        className="w-full max-w-4xl mx-auto"
        middle={
          <div className="flex flex-col items-center justify-center w-full px-6 min-h-[50vh]">
            <div className="space-y-8 text-center max-w-3xl mb-12">
              <div className="space-y-4">
                <motion.div
                  variants={fadeVariants}
                  initial="hidden"
                  animate="show"
                  custom={delays[0]}
                  className="text-xl md:text-3xl font-serif text-primary leading-relaxed"
                >
                  {OUTRO_LINES[0].text}
                </motion.div>

                <motion.div
                  variants={fadeVariants}
                  initial="hidden"
                  animate="show"
                  custom={delays[1]}
                  className="text-lg md:text-2xl font-serif text-primary/90 leading-relaxed"
                >
                  {OUTRO_LINES[1].text}
                </motion.div>

                <motion.div
                  variants={fadeVariants}
                  initial="hidden"
                  animate="show"
                  custom={delays[2]}
                  className="text-lg md:text-2xl font-serif text-primary/90 leading-relaxed"
                >
                  {OUTRO_LINES[2].text}
                </motion.div>
              </div>

              <div className="space-y-4">
                <motion.div
                  variants={fadeVariants}
                  initial="hidden"
                  animate="show"
                  custom={delays[3]}
                  className="text-lg md:text-2xl font-serif text-primary leading-relaxed"
                >
                  {OUTRO_LINES[3].text}
                </motion.div>

                <motion.div
                  variants={fadeVariants}
                  initial="hidden"
                  animate="show"
                  custom={delays[4]}
                  className="text-lg md:text-2xl font-serif text-primary leading-relaxed"
                >
                  {OUTRO_LINES[4].text}
                </motion.div>
              </div>

              <motion.div
                variants={fadeVariants}
                initial="hidden"
                animate="show"
                custom={delays[5]}
                onAnimationComplete={() => setIsAnimationComplete(true)}
                className="text-xl md:text-3xl font-serif text-primary font-bold pt-4"
              >
                {OUTRO_LINES[5].text}
              </motion.div>
            </div>

            <motion.div
              variants={slideVariants}
              initial="hidden"
              animate="show"
              custom={buttonDelay}
              className="w-full flex justify-center shrink-0"
            >
              <Button
                size="lg"
                onClick={onComplete}
                disabled={!isAnimationComplete}
                className={`px-12 py-6 h-auto text-lg font-bold tracking-widest uppercase rounded-xl shadow-lg transform duration-200 ${
                  !isAnimationComplete
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:shadow-xl hover:-translate-y-0.5 bg-primary text-primary-foreground'
                }`}
              >
                See you!
              </Button>
            </motion.div>
          </div>
        }
      />
    </GameBackground>
  );
};
