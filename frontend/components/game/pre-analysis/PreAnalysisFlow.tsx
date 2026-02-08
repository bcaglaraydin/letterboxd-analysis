import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EntryDialogue } from './EntryDialogue';
import { QuestionView } from './QuestionView';
import { questions } from './questions';
import { Button } from '@/components/ui/button';

interface PreAnalysisFlowProps {
  onComplete: () => void;
  isBackendReady: boolean;
}

type FlowStep = 'dialogue' | 'questions' | 'waiting' | 'early-exit-confirmation' | 'ready-to-start';

export const PreAnalysisFlow: React.FC<PreAnalysisFlowProps> = ({ onComplete, isBackendReady }) => {
  const [step, setStep] = useState<FlowStep>('dialogue');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  // Randomize questions with specific rules
  const [shuffledQuestions] = useState(() => {
    // 1. Simple shuffle first
    const shuffled = [...questions].sort(() => Math.random() - 0.5);

    // 2. Rule: Math question (absurd) should never be first
    if (shuffled[0].type === 'absurd') {
      const swapIndex = Math.floor(Math.random() * (shuffled.length - 1)) + 1;
      [shuffled[0], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[0]];
    }

    // 3. Rule: "Is everything going well?" (neutral) should be in the second half
    const neutralIndex = shuffled.findIndex((q) => q.type === 'neutral');
    const midPoint = Math.floor(shuffled.length / 2);

    if (neutralIndex !== -1 && neutralIndex < midPoint) {
      // Move to a random position in the second half
      const newIndex = midPoint + Math.floor(Math.random() * (shuffled.length - midPoint));
      // Swap neutral question with whatever is at newIndex
      [shuffled[neutralIndex], shuffled[newIndex]] = [shuffled[newIndex], shuffled[neutralIndex]];

      // Re-check first rule in case the swap moved an absurd question to the start
      if (shuffled[0].type === 'absurd') {
        // Swap with the second element (or any safe index)
        [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
      }
    }

    return shuffled;
  });

  const handleStartQuestions = () => {
    setStep('questions');
  };

  const handleAnswer = (scoreDelta: number) => {
    // Check if this was the early exit option (scoreDelta is 0, but we need a way to know for sure)
    // We'll rely on a convention or just pass the option ID from QuestionView if we refactor.
    // simpler: QuestionView triggers onAnswer. If we pass a special "early-exit" flag...
    // Actually, let's just use a unique scoreDelta? No, 0 is used for neutral.
    // Let's modify QuestionView to pass the option ID?
    // OR: We intercept it here based on the option ID if we had it.
    // Since we don't change QuestionView interface yet, let's do a hack:
    // We will inject the option with a specific unique score like -9999 (not used anywhere)
    // But wait, user said "Can I stop doing this?" -> "Do you really want to stop?"

    if (scoreDelta === -9999) {
      setStep('early-exit-confirmation');
      return;
    }

    setScore((prev) => prev + scoreDelta);

    // Auto-advance after a short delay for the score animation to fly
    setTimeout(() => {
      if (currentQuestionIndex < shuffledQuestions.length - 1) {
        setCurrentQuestionIndex((prev) => prev + 1);
      } else {
        if (isBackendReady) {
          setStep('ready-to-start');
        } else {
          setStep('waiting');
        }
      }
    }, 1500); // 1.5s delay to see score flying and landing
  };

  // Prepare current question with potentially added "Exit" option
  const currentQuestion = React.useMemo(() => {
    // ...
    // No changes needed here, just context for next part
    const q = shuffledQuestions[currentQuestionIndex];
    // Show early exit only if:
    // 1. Backend is ready
    // 2. User answered at least half of the questions
    const hasAnsweredHalf = currentQuestionIndex >= Math.floor(shuffledQuestions.length / 2);
    
    if (step === 'questions' && isBackendReady && hasAnsweredHalf) {
      // Return a new object with the extra option
      return {
        ...q,
        options: [
          ...q.options,
          {
            id: 'early-exit',
            text: 'Can I stop doing this?',
            scoreEffect: -9999, // Special signal
          },
        ],
      };
    }
    return q;
  }, [shuffledQuestions, currentQuestionIndex, step, isBackendReady]);

  // Effect to handle completion when waiting
  useEffect(() => {
    if (step === 'waiting' && isBackendReady) {
      // Transition to final ready screen instead of auto-completing
      const timer = setTimeout(() => {
        setStep('ready-to-start');
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [step, isBackendReady]);

  // ... (Lines 112-120)

  // Early Exit Confirmation UI
  if (step === 'early-exit-confirmation') {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center max-w-md text-center space-y-8 p-6"
        >
          <h2 className="text-2xl md:text-3xl font-serif text-primary">
            Do you really want to stop doing this?
          </h2>
          <div className="flex flex-col w-full gap-4">
            <Button
              variant="outline"
              onClick={() => setStep('ready-to-start')}
              className="w-full py-6 text-lg border-primary/20 bg-background/50 hover:bg-primary/10 hover:text-primary hover:border-primary/50 transition-all duration-300"
            >
              Yes
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (currentQuestionIndex < shuffledQuestions.length - 1) {
                  setCurrentQuestionIndex((prev) => prev + 1);
                  setStep('questions');
                } else {
                  if (isBackendReady) {
                    setStep('ready-to-start');
                  } else {
                    setStep('waiting');
                  }
                }
              }}
              className="w-full py-6 text-lg border-primary/20 bg-background/50 hover:bg-primary/10 hover:text-primary hover:border-primary/50 transition-all duration-300"
            >
              No
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Unified Final "Ready to Start" UI
  if (step === 'ready-to-start') {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center max-w-xl text-center space-y-6 p-6"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
            className="space-y-4"
          >
            <h2 className="text-2xl md:text-3xl font-serif text-primary leading-tight">
              Appreciate your answers.
            </h2>
            <p className="text-xl md:text-2xl font-serif text-primary/80 leading-snug">
              While you were dealing with the questions, I went through your films.
            </p>
            <p className="text-2xl md:text-4xl font-serif text-primary font-bold pt-2">
              We&apos;re ready to start.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8, ease: 'easeOut' }}
            className="flex flex-col w-full items-center gap-4 pt-4"
          >
            <Button
              size="lg"
              onClick={() => onComplete()}
              className="w-full max-w-xs md:w-auto md:px-16 md:min-w-[240px] py-4 md:py-6 h-auto rounded-xl md:rounded-2xl text-sm md:text-lg font-bold tracking-widest uppercase shadow-lg hover:shadow-xl hover:-translate-y-0.5 transform duration-200"
            >
              Let&apos;s start
            </Button>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <AnimatePresence mode="wait">
        {step === 'dialogue' && (
          <motion.div
            key="dialogue"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <EntryDialogue onStart={handleStartQuestions} />
          </motion.div>
        )}

        {step === 'questions' && (
          <motion.div
            key="questions"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <QuestionView
              key={currentQuestion.id}
              question={currentQuestion}
              currentScore={score}
              onAnswer={handleAnswer}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
