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
  onScoreUpdate?: (scoreDelta: number) => void;
}

type PrankPhase = null | 'fast' | 'slow';

export const QuestionView: React.FC<QuestionViewProps> = ({
  question,
  currentScore,
  onAnswer,
  onScoreUpdate,
}) => {
  const SLOW_PRANK_DELAY_MS = 17000;
  const FAST_PRANK_THRESHOLD_MS = 3000;
  const EARLY_EXIT_OPTION_ID = 'early-exit';
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [flyFrom, setFlyFrom] = useState<{ x: number; y: number } | undefined>(undefined);
  const [lastPoints, setLastPoints] = useState<number | null>(null);
  const [prankPhase, setPrankPhase] = useState<PrankPhase>(null);
  const startTimeRef = useRef<number>(0);
  const prankTriggeredRef = useRef(false);

  useEffect(() => {
    // Reset timer when question changes
    startTimeRef.current = performance.now();
    setPrankPhase(null);
    setSelectedOptionId(null);
    setLastPoints(null);
    prankTriggeredRef.current = false;

    // Auto-trigger the "slow" prank if the user lingers too long.
    const slowTimeout = setTimeout(() => {
      // Guard: only trigger once and only if no answer/prank yet
      if (prankTriggeredRef.current) return;
      prankTriggeredRef.current = true;

      // Set local states first
      setPrankPhase('slow');
      setFlyFrom({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
      setLastPoints(-5);

      // Defer parent score update to next microtask to avoid React render conflict
      queueMicrotask(() => {
        if (onScoreUpdate) onScoreUpdate(-5);
      });

      setTimeout(() => {
        onAnswer(0); // score already applied, just advance
      }, 900);
    }, SLOW_PRANK_DELAY_MS);

    return () => clearTimeout(slowTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id]);

  const handleOptionClick = (option: QuestionOption, e: React.MouseEvent) => {
    if (selectedOptionId || prankPhase) return; // Prevent double clicks or clicking during prank

    const elapsed = performance.now() - startTimeRef.current;

    // Check speed penalties first
    const shouldSkipFastPenalty = option.id === EARLY_EXIT_OPTION_ID;

    if (!shouldSkipFastPenalty && elapsed < FAST_PRANK_THRESHOLD_MS) {
      prankTriggeredRef.current = true;
      setPrankPhase('fast');
      setFlyFrom({ x: e.clientX, y: e.clientY });
      setLastPoints(-5);
      // Defer parent score update to avoid React render conflict
      queueMicrotask(() => {
        if (onScoreUpdate) onScoreUpdate(-5);
      });

      // Auto-advance after 0.9s
      setTimeout(() => {
        onAnswer(0); // score already applied, just advance
      }, 900);
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
                  className="absolute inset-0 z-10 flex items-center justify-center p-4 md:p-6"
                  data-testid="prank-popup"
                >
                  <div className="relative w-full overflow-hidden rounded-[1.75rem] border border-primary/12 bg-background px-5 py-6 shadow-[0_18px_45px_rgba(15,23,42,0.12)] ring-1 ring-black/5 md:px-8 md:py-8 dark:ring-white/10">
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-primary/8 via-primary/3 to-transparent" />
                    <div className="pointer-events-none absolute inset-[1px] rounded-[calc(1.75rem-1px)] border border-white/40 dark:border-white/6" />
                    <p className="relative text-base sm:text-lg md:text-3xl font-serif text-primary text-center leading-relaxed font-bold">
                      {prankPhase === 'fast' && (
                        <>
                          Did you even read the question?
                          <br />
                          <span className="text-red-500">-5 points</span> for not taking me
                          seriously.
                        </>
                      )}
                      {prankPhase === 'slow' && (
                        <>
                          Are you Googling the answers?
                          <br />
                          I&apos;m deducting <span className="text-red-500">points</span> for lag.
                        </>
                      )}
                    </p>
                  </div>
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
