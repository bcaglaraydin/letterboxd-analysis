import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Question, QuestionOption } from './questions';
import { cn } from '@/lib/utils';
import ScorePanel from '../shared/ScorePanel';

interface QuestionViewProps {
  question: Question;
  currentScore: number;
  onAnswer: (scoreDelta: number) => void;
}

type PrankPhase = null | 'fast' | 'slow';

export const QuestionView: React.FC<QuestionViewProps> = ({ question, currentScore, onAnswer }) => {
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [flyFrom, setFlyFrom] = useState<{ x: number; y: number } | undefined>(undefined);
  const [lastPoints, setLastPoints] = useState<number | null>(null);
  const [prankPhase, setPrankPhase] = useState<PrankPhase>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    // Reset timer when question changes
    startTimeRef.current = performance.now();
    setPrankPhase(null);
    setSelectedOptionId(null);
    setLastPoints(null);

    // Auto-trigger "slow" prank after 8 seconds of inactivity
    // except if it's the very first question maybe? We'll apply it to all for consistency
    const slowTimeout = setTimeout(() => {
      // Check if they haven't answered yet or aren't already being pranked
      setPrankPhase((prevPhase) => {
        if (!prevPhase) {
          // Trigger slow prank
          setFlyFrom({ x: window.innerWidth / 2, y: window.innerHeight / 2 }); // center of screen
          setLastPoints(-5);

          setTimeout(() => {
            onAnswer(-5);
          }, 2000);

          return 'slow';
        }
        return prevPhase;
      });
    }, 8000);

    return () => clearTimeout(slowTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id]);

  const handleOptionClick = (option: QuestionOption, e: React.MouseEvent) => {
    if (selectedOptionId || prankPhase) return; // Prevent double clicks or clicking during prank

    const elapsed = performance.now() - startTimeRef.current;

    // Check speed penalties first
    if (elapsed < 1000) {
      setPrankPhase('fast');
      setFlyFrom({ x: e.clientX, y: e.clientY });
      setLastPoints(-5);

      // Auto-advance after 2s
      setTimeout(() => {
        onAnswer(-5);
      }, 2000);
      return;
    }

    setSelectedOptionId(option.id);
    setFlyFrom({ x: e.clientX, y: e.clientY });
    setLastPoints(option.scoreEffect);

    // Continue with normal flow
    onAnswer(option.scoreEffect);
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full max-w-2xl mx-auto p-4 md:p-6 overflow-hidden">
      <div className="w-full flex justify-end shrink-0 mb-2 md:mb-4">
        <ScorePanel
          score={currentScore}
          pointsEarned={lastPoints}
          flyFromPosition={flyFrom}
          size="md"
          position="static"
          flyDuration={0.5}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={question.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.4 }}
          className="flex-1 flex flex-col w-full min-h-0 md:justify-center md:gap-12"
        >
          <div className="flex-1 flex items-center justify-center p-2 md:flex-none">
            <h2 className="text-lg md:text-3xl font-serif text-primary text-center leading-relaxed font-medium">
              {question.text}
            </h2>
          </div>

          <div className="relative grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3 pb-2 shrink-0 w-full max-w-4xl md:pb-0">
            <AnimatePresence>
              {prankPhase && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-10 flex items-center justify-center bg-background/95 backdrop-blur-sm rounded-xl border-2 border-primary/20 p-4 md:p-6 shadow-2xl"
                >
                  <p className="text-base sm:text-lg md:text-3xl font-serif text-primary text-center leading-relaxed font-bold">
                    {prankPhase === 'fast' && (
                      <>
                        Did you even read the question?
                        <br />
                        <span className="text-red-500">-5 points</span> for not taking me seriously.
                      </>
                    )}
                    {prankPhase === 'slow' && (
                      <>
                        Are you Googling the answers about yourself?
                        <br />
                        I&apos;m deducting <span className="text-red-500">points</span> for lag.
                      </>
                    )}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {question.options.map((option, index) => (
              <motion.div
                key={option.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 + 0.3 }}
                className="w-full h-10 md:h-24"
              >
                <Button
                  variant="outline"
                  onClick={(e) => handleOptionClick(option, e)}
                  disabled={selectedOptionId !== null || prankPhase !== null}
                  className={cn(
                    'w-full h-full text-xs md:text-xl whitespace-normal text-center justify-center border-primary/20 bg-background/50 leading-tight px-1',
                    'hover:bg-primary/10 hover:text-primary hover:border-primary/50 transition-all duration-300',
                    selectedOptionId === option.id &&
                      option.scoreEffect > 0 &&
                      'bg-green-500/20 border-green-500 hover:bg-green-500/20 text-green-700 dark:text-green-300',
                    selectedOptionId === option.id &&
                      option.scoreEffect < 0 &&
                      'bg-red-500/20 border-red-500 hover:bg-red-500/20 text-red-700 dark:text-red-300',
                    selectedOptionId === option.id &&
                      option.scoreEffect === 0 &&
                      'bg-primary/20 border-primary hover:bg-primary/20',
                    selectedOptionId !== null && selectedOptionId !== option.id && 'opacity-50',
                  )}
                >
                  <span className="px-2">{option.text}</span>
                </Button>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
