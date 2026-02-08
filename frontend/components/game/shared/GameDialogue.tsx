'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { GameBackground } from '@/components/game/shared/GameBackground';
import { GameLayout } from '@/components/game/shared/GameLayout';

interface GameDialogueProps {
  messages: React.ReactNode[];
  onComplete: () => void;
  buttonText?: string;
  completionMessage?: string;
  className?: string;
}

export const GameDialogue: React.FC<GameDialogueProps> = ({
  messages,
  onComplete,
  buttonText = 'Continue',
  completionMessage,
  className,
}) => {
  const [isCompleting, setIsCompleting] = useState(false);

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
              transition: { type: "spring", stiffness: 200, damping: 20 } 
            }}
            exit={{ 
              opacity: 0, 
              scale: 4, 
              filter: "blur(20px)",
              transition: { duration: 0.4, ease: "easeIn" }
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
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.3,
        delayChildren: 0.2,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
  };

  return (
    <GameBackground className={className}>
      <GameLayout
        className="h-full w-full max-w-4xl mx-auto"
        middle={
          <div className="flex flex-col items-center justify-center h-full w-full px-6">
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="flex flex-col items-center max-w-xl text-center space-y-8"
            >
              <div className="space-y-6">
                {messages.map((msg, index) => (
                  <motion.div
                    key={index}
                    variants={item}
                    className="text-xl md:text-2xl font-serif text-primary leading-relaxed"
                  >
                    {msg}
                  </motion.div>
                ))}
              </div>

              <motion.div variants={item} className="pt-4 w-full flex justify-center">
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
