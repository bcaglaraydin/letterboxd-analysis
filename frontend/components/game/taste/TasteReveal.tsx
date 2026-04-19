'use client';

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTasteStore } from '@/store/taste/tasteStore';
import { GameLayout } from '@/components/game/shared/GameLayout';
import { Button } from '@/components/ui/button';
import { ScorePanel } from '@/components/game/shared/ScorePanel';
import { TasteScatterPlot } from './visualizations/TasteScatterPlot';
import { useExperienceStore } from '@/store/core/experienceStore';
import { cn } from '@/lib/utils';

type RevealStep = 'AXES' | 'PERCEPTION' | 'LANDSCAPE' | 'REALITY';

export const TasteReveal = () => {
  const { guessPopularity, actualPopularity, guessAlignment, actualAlignment, movies, score } =
    useTasteStore();

  const { completeTastePositioning } = useExperienceStore();
  const [step, setStep] = useState<RevealStep>('AXES');

  // Dynamic diagnostic messages based on the user's final quadrant
  const diagnosticMessages = useMemo(() => {
    const isMainstream = actualPopularity > 0.5;
    const isDivergent = actualAlignment > 0.5;

    if (isMainstream && isDivergent) {
      // Top-Right: a mainstream rebel, a systemic anomaly, a provocateur
      return ['**a mainstream rebel**', '**a systemic anomaly**', '**a provocateur.**'];
    } else if (!isMainstream && isDivergent) {
      // Top-Left: an originalist, the avant-garde, actually mental
      return ['**an originalist**', '**the avant-garde**', '**actually mental.**'];
    } else if (!isMainstream && !isDivergent) {
      // Bottom-Left: a cult scholar, letterboxd elite, a criterion slave
      return ['**a cult scholar**', '**letterboxd elite**', '**a criterion slave.**'];
    } else {
      // Bottom-Right: a populist, a box office drone, an npc
      return ['**a populist**', '**a box office drone**', '**an NPC.**'];
    }
  }, [actualPopularity, actualAlignment]);

  // Define dialogues for each step
  const stepConfig = useMemo(() => {
    const isMainstream = actualPopularity > 0.5;
    const isDivergent = actualAlignment > 0.5;
    const explainSentence = `You tend to love ${isMainstream ? 'mainstream' : 'niche'} movies, and your ratings usually ${isDivergent ? 'diverge' : 'align'} with the community.`;

    return {
      AXES: {
        messages: [
          'The landscape is defined by two metrics.',
          'The horizontal axis represents your **Mainstream Affinity**: Niche to Mainstream.',
          'The vertical axis measures your Independence: Consensus to Divergence.',
        ],
        nextStep: 'PERCEPTION' as RevealStep,
        showPoints: false,
        showGuess: false,
        showActual: false,
        showLine: false,
      },
      PERCEPTION: {
        messages: ['This was your projection.'],
        nextStep: 'LANDSCAPE' as RevealStep,
        showPoints: false,
        showGuess: true,
        showActual: false,
        showLine: false,
      },
      LANDSCAPE: {
        messages: ["Every data point is a movie. **A movie you've judged.**"],
        nextStep: 'REALITY' as RevealStep,
        showPoints: true,
        showGuess: true,
        showActual: false,
        showLine: false,
      },
      REALITY: {
        messages: ['This is your real taste center.', explainSentence, ...diagnosticMessages],
        nextStep: null,
        showPoints: true,
        showGuess: true,
        showActual: true,
        showLine: true,
      },
    };
  }, [diagnosticMessages, actualPopularity, actualAlignment]);

  const currentConfig = stepConfig[step];
  const [activeMessageIndex, setActiveMessageIndex] = useState(0);

  const handleNext = () => {
    // 1. If there are more messages within the SAME step, advance message index
    if (activeMessageIndex < currentConfig.messages.length - 1) {
      setActiveMessageIndex((prev) => prev + 1);
      return;
    }

    // 2. Otherwise, advance to the NEXT STEP and reset message index
    if (currentConfig.nextStep) {
      setActiveMessageIndex(0);
      setStep(currentConfig.nextStep);
    } else {
      completeTastePositioning(score);
    }
  };

  // Helper to colorize and highlight keywords and parse **bold** syntax
  const highlightText = (text: string) => {
    // 1. Handle Markdown-style bolding first (**)
    const boldRegex = /\*\*(.*?)\*\*/g;
    const partsByBold = text.split(boldRegex);

    return partsByBold.map((part, i) => {
      // Odd indices are the captured bold content
      if (i % 2 === 1) {
        return (
          <span key={`bold-${i}`} className="font-bold whitespace-nowrap">
            {part}
          </span>
        );
      }

      // 2. Handle Keyword colorization on the non-bold parts
      const keywords: Record<string, string> = {
        niche: 'text-[#818cf8]',
        mainstream: 'text-[#f59e0b]',
        popular: 'text-[#f59e0b]',
        consensus: 'text-[#10b981]',
        align: 'text-[#10b981]',
        divergence: 'text-[#f43f5e]',
        diverge: 'text-[#f43f5e]',
        independence: 'text-primary', // Bold for Independence
      };

      const sortedKeys = Object.keys(keywords).sort((a, b) => b.length - a.length);
      const keywordRegex = new RegExp(`\\b(${sortedKeys.join('|')})\\b`, 'gi');
      const subParts = part.split(keywordRegex);

      return subParts.map((sub, j) => {
        const lowerSub = sub.toLowerCase();
        if (keywords[lowerSub]) {
          return (
            <span key={`kw-${i}-${j}`} className={cn('font-bold', keywords[lowerSub])}>
              {sub}
            </span>
          );
        }
        return sub;
      });
    });
  };

  return (
    <GameLayout
      className="max-w-6xl mx-auto"
      top={
        <div className="flex justify-end w-full px-4 md:px-12 pt-4 md:pt-10">
          <ScorePanel
            score={score}
            label="Score"
            className={step === 'REALITY' ? 'opacity-100' : 'opacity-40'}
          />
        </div>
      }
      middle={
        <div className="w-full h-full flex flex-col items-center justify-between overflow-hidden">
          {/* REGION 1: Graph - Maximum vertical reach */}
          <div className="w-full flex-grow flex items-center justify-center p-2">
            <div className="w-full max-w-6xl relative h-full max-h-[900px]">
              <TasteScatterPlot
                movies={movies}
                guessPop={guessPopularity}
                guessAlign={guessAlignment}
                actualPop={actualPopularity}
                actualAlign={actualAlignment}
                showPoints={currentConfig.showPoints}
                showGuess={currentConfig.showGuess}
                showActual={currentConfig.showActual}
                showLine={currentConfig.showLine}
                showXLabels={step !== 'AXES' || activeMessageIndex >= 1}
                showYLabels={step !== 'AXES' || activeMessageIndex >= 2}
              />
            </div>
          </div>

          {/* REGION 2: Dialogue - Absolute Stability with Nested AnimatePresence */}
          <div className="w-full max-w-4xl min-h-[100px] md:min-h-[120px] flex flex-col items-center justify-center relative z-20 mt-2">
            <div className="w-full text-lg md:text-2xl font-serif text-primary leading-relaxed px-4 mx-auto">
              {/* If we are in diagnostic mode, we use a static wrapper to pin 'you are' 
                  and a nested AnimatePresence to ONLY swap the descriptor. */}
              {step === 'REALITY' && activeMessageIndex >= 2 ? (
                /* Absolute Pinned Grid: Ensures 'You are' never moves while keeping a natural gap */
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  className="grid grid-cols-2 w-full"
                >
                  <div className="text-right pr-1">
                    <span className="text-primary whitespace-nowrap">You are</span>
                  </div>
                  <div className="text-left pl-1">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeMessageIndex}
                        initial={{ opacity: 0, x: 5 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -5 }}
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                      >
                        {highlightText(currentConfig.messages[activeMessageIndex])}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </motion.div>
              ) : (
                /* Standard animated block for primary dialogue messages */
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${step}-${activeMessageIndex}`}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    className="text-center w-full"
                  >
                    {highlightText(currentConfig.messages[activeMessageIndex])}
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          </div>

          {/* REGION 3: Action Button - Grounded at the bottom */}
          <div className="w-full flex justify-center pb-6 md:pb-10 pt-2">
            <Button
              size="lg"
              onClick={handleNext}
              className="px-12 py-6 h-auto text-lg font-bold tracking-widest uppercase rounded-xl shadow-2xl hover:scale-105 active:scale-95 transition-all min-w-[240px]"
            >
              {activeMessageIndex < currentConfig.messages.length - 1
                ? 'Continue'
                : currentConfig.nextStep
                  ? 'Next Phase'
                  : 'Finalize Analysis'}
            </Button>
          </div>
        </div>
      }
    />
  );
};
