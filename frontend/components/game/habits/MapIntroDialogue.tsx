import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { computeDialogueTiming } from '@/lib/useDialogueTiming';

interface MapIntroDialogueProps {
  onComplete: () => void;
}

export function MapIntroDialogue({ onComplete }: MapIntroDialogueProps) {
  // Use the timing engine to calculate standard delay
  const { slideVariants, totalSequenceDuration } = useMemo(
    () => computeDialogueTiming([{ text: 'The next one is my favorite.' }]),
    [],
  );

  // The button emerges right when the dialogue read-time has lapsed
  const buttonDelay = totalSequenceDuration;

  return (
    <div className="w-full h-[100dvh] flex flex-col items-center justify-center p-6 bg-background relative selection:bg-primary/20">
      <AnimatePresence mode="wait">
        <motion.div
          key="map-intro-text"
          initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          className="text-center space-y-12 max-w-2xl"
        >
          <div className="text-xl md:text-3xl lg:text-4xl font-serif text-primary leading-relaxed tracking-wide">
            The next one is my favorite.
          </div>

          <motion.div
            initial="hidden"
            animate="visible"
            // Re-using the central slide upward variants and dynamic button pacing
            variants={slideVariants}
            custom={buttonDelay}
          >
            <Button
              onClick={onComplete}
              className="px-8 py-6 rounded-full text-lg tracking-widest uppercase bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              Continue
            </Button>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
