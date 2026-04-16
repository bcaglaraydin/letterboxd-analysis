'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { GameBackground } from '@/components/game/shared/GameBackground';
import { GameLayout } from '@/components/game/shared/GameLayout';
import { useDialogueTiming, type DialogueLine } from '@/lib/useDialogueTiming';

interface GameDialogueProps {
  messages: React.ReactNode[];
  onComplete: () => void;
  buttonText?: string;
  completionMessage?: string;
  className?: string;
  top?: React.ReactNode;
  /**
   * Plain-text representation of each message, used for dynamic timing calculation.
   * Must have the same length as `messages`. If omitted, falls back to
   * extracting text from ReactNode children (best-effort).
   */
  dialogueTexts?: string[];
}

/**
 * Best-effort text extraction from ReactNode for timing calculation.
 * Handles strings, numbers, and recursively traverses React elements.
 */
function extractText(node: React.ReactNode): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (React.isValidElement(node)) {
    const children = (node.props as { children?: React.ReactNode }).children;
    return extractText(children);
  }
  return '';
}

export const GameDialogue: React.FC<GameDialogueProps> = ({
  messages,
  onComplete,
  buttonText = 'Continue',
  completionMessage,
  className,
  top,
  dialogueTexts,
}) => {
  const [isCompleting, setIsCompleting] = useState(false);

  // Build dialogue lines for the timing engine
  const dialogueLines: DialogueLine[] = messages.map((msg, i) => ({
    text: dialogueTexts?.[i] ?? extractText(msg),
  }));

  const { delays, fadeVariants, slideVariants, totalSequenceDuration } =
    useDialogueTiming(dialogueLines);

  // Button appears after all messages have had their read-time
  const buttonDelay = totalSequenceDuration;

  const handleComplete = () => {
    if (completionMessage) {
      setIsCompleting(true);
      setTimeout(() => {
        onComplete();
      }, 800); // Show "Good" for 800ms
    } else {
      onComplete();
    }
  };

  if (isCompleting && completionMessage) {
    return (
      <GameBackground className={className}>
        <div className="absolute inset-0 flex items-center justify-center z-50 overflow-hidden">
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 50 }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
              transition: { type: 'spring', stiffness: 200, damping: 20 },
            }}
            exit={{
              opacity: 0,
              scale: 4,
              filter: 'blur(20px)',
              transition: { duration: 0.4, ease: 'easeIn' },
            }}
            className="text-5xl md:text-7xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-br from-primary via-primary/80 to-primary/50 tracking-tighter drop-shadow-2xl"
          >
            {completionMessage}
          </motion.div>
        </div>
      </GameBackground>
    );
  }

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1 },
  };

  return (
    <GameBackground className={className}>
      <GameLayout
        className="w-full max-w-4xl mx-auto"
        top={top}
        middle={
          <div className="flex flex-col items-center justify-center w-full px-6">
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="flex flex-col items-center max-w-4xl text-center space-y-8"
            >
              <div className="space-y-6">
                {messages.map((msg, index) => (
                  <motion.div
                    key={index}
                    variants={fadeVariants}
                    custom={delays[index]}
                    className="text-xl md:text-3xl font-serif text-primary leading-relaxed"
                  >
                    {msg}
                  </motion.div>
                ))}
              </div>

              <motion.div
                variants={slideVariants}
                custom={buttonDelay}
                className="pt-4 w-full flex justify-center"
              >
                <Button
                  size="lg"
                  onClick={handleComplete}
                  className="px-12 py-6 h-auto text-lg font-bold tracking-widest uppercase rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transform duration-200"
                >
                  {buttonText}
                </Button>
              </motion.div>
            </motion.div>
          </div>
        }
      />
    </GameBackground>
  );
};
