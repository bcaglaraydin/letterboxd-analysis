'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useTasteStore } from '@/store/taste/tasteStore';
import { GameLayout } from '@/components/game/shared/GameLayout';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ScorePanel } from '@/components/game/shared/ScorePanel';

import { GameRoundIndicator } from '@/components/game/shared/GameRoundIndicator';

export const TasteGuessStep1 = () => {
  const {
    guessPopularity,
    setGuessPopularity,
    actualPopularity,
    isStep1Revealed,
    submitStep1,
    setStep,
    score,
    step1Score,
  } = useTasteStore();

  const [phase, setPhase] = React.useState<'dialogue' | 'guess'>(
    isStep1Revealed ? 'guess' : 'dialogue',
  );
  const [isDragging, setIsDragging] = React.useState(false);

  const [flyFromPosition, setFlyFromPosition] = React.useState<
    { x: number; y: number } | undefined
  >();
  const [localPointsEarned, setLocalPointsEarned] = React.useState<number | null>(null);
  const thumbRef = React.useRef<HTMLDivElement>(null);

  // Sequenced Reveal Effect: Wait for Reality marker to settle before flying score
  React.useEffect(() => {
    if (isStep1Revealed && thumbRef.current && !localPointsEarned) {
      // Capture coordinates immediately but delay the point flight
      const rect = thumbRef.current.getBoundingClientRect();
      const coords = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };

      const timer = setTimeout(() => {
        setFlyFromPosition(coords);
        setLocalPointsEarned(step1Score);
      }, 500); // Shortened delay for snappier feedback

      return () => clearTimeout(timer);
    }
  }, [isStep1Revealed, step1Score, localPointsEarned]);

  const handleAction = () => {
    if (isStep1Revealed) {
      setStep(2);
    } else {
      submitStep1();
    }
  };

  const percentage = guessPopularity * 100;

  return (
    <GameLayout
      className="w-full"
      top={
        <div className="w-full px-4 md:px-8 pt-4 md:pt-8 bg-background/50 backdrop-blur-sm z-30">
          <div className="max-w-2xl mx-auto flex justify-between items-start">
            <GameRoundIndicator major={1} majorTotal={2} />

            <ScorePanel
              score={score}
              pointsEarned={localPointsEarned}
              flyFromPosition={flyFromPosition}
              label="Total Score"
              size="md"
              className="mb-0"
              position="static"
            />
          </div>
        </div>
      }
      middle={
        <div className="w-full max-w-2xl mx-auto px-4 md:px-6 py-4 md:py-12 flex flex-col items-center justify-center space-y-10 md:space-y-16">
          {phase === 'dialogue' ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center space-y-12 text-center"
            >
              <p className="text-xl md:text-3xl font-serif italic text-primary leading-relaxed px-4">
                &quot;Some movies are popular, while others are niche. Some people prefer popular
                films, while others criticize them.&quot;
              </p>
              <Button
                size="lg"
                onClick={() => setPhase('guess')}
                className="px-12 py-6 h-auto text-lg font-bold tracking-widest uppercase rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transform duration-200 bg-accent text-accent-foreground"
              >
                Next
              </Button>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full flex flex-col items-center space-y-10 md:space-y-16"
            >
              <p className="text-sm md:text-base font-bold uppercase tracking-[0.2em] text-muted-foreground/80">
                Use the slider to locate yourself
              </p>

              <div className="w-full relative py-8 px-2 md:px-0">
                {/* Slider Labels */}
                <div
                  className="absolute -top-6 left-0 text-center flex flex-col items-start px-2 transition-colors duration-300"
                  style={{ color: '#818cf8' }}
                >
                  <span className="text-[12px] md:text-[14px] font-black uppercase tracking-widest leading-tight">
                    Niche
                  </span>
                </div>
                <div
                  className="absolute -top-6 right-0 text-center flex flex-col items-end px-2 transition-colors duration-300"
                  style={{ color: '#f59e0b' }}
                >
                  <span className="text-[12px] md:text-[14px] font-black uppercase tracking-widest leading-tight text-right">
                    Popular
                  </span>
                </div>

                {/* Track Background - The Color Carrier */}
                <div
                  className="relative h-2 w-full rounded-full overflow-hidden transition-colors duration-200"
                  style={{
                    backgroundColor: (function () {
                      const indigo = { r: 129, g: 140, b: 248 };
                      const midpoint = { r: 244, g: 63, b: 94 }; // Rose #f43f5e
                      const amber = { r: 245, g: 158, b: 11 };

                      let r, g, b;
                      if (percentage < 50) {
                        const factor = percentage / 50;
                        r = Math.round(indigo.r + (midpoint.r - indigo.r) * factor);
                        g = Math.round(indigo.g + (midpoint.g - indigo.g) * factor);
                        b = Math.round(indigo.b + (midpoint.b - indigo.b) * factor);
                      } else {
                        const factor = (percentage - 50) / 50;
                        r = Math.round(midpoint.r + (amber.r - midpoint.r) * factor);
                        g = Math.round(midpoint.g + (amber.g - midpoint.g) * factor);
                        b = Math.round(midpoint.b + (amber.b - midpoint.b) * factor);
                      }
                      return `rgba(${r}, ${g}, ${b}, 0.8)`;
                    })(),
                  }}
                >
                  {/* Shimmer Effect - Entire Track */}
                  <motion.div
                    animate={{ backgroundPosition: ['0% 0%', '200% 0%'] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                    className="w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent bg-[size:200%_100%]"
                  />
                </div>

                {/* Native Slider Interaction */}
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={guessPopularity}
                  onMouseDown={() => setIsDragging(true)}
                  onMouseUp={() => setIsDragging(false)}
                  onMouseLeave={() => setIsDragging(false)}
                  onTouchStart={() => setIsDragging(true)}
                  onTouchEnd={() => setIsDragging(false)}
                  onChange={(e) =>
                    !isStep1Revealed && setGuessPopularity(parseFloat(e.target.value))
                  }
                  disabled={isStep1Revealed}
                  className={cn(
                    'absolute inset-x-[-10px] inset-y-[-20px] w-[calc(100%+20px)] h-[calc(100%+40px)] opacity-0 z-20',
                    isStep1Revealed ? 'cursor-default' : 'cursor-pointer active:cursor-grabbing',
                  )}
                />

                {/* Custom Thumb - Lift & Scale */}
                <div
                  ref={thumbRef}
                  className={cn(
                    'absolute top-1/2 -translate-y-1/2 w-10 h-10 md:w-8 md:h-8 bg-primary rounded-full border-4 border-background flex items-center justify-center pointer-events-none z-10',
                    isDragging
                      ? 'scale-125 shadow-[0_20px_40px_rgba(0,0,0,0.4)]'
                      : 'scale-100 shadow-2xl',
                  )}
                  style={{
                    left: `calc(${percentage}% - 20px)`,
                    transition: 'transform 0.2s ease-out, box-shadow 0.2s ease-out',
                  }}
                >
                  <div className="absolute top-10 text-[10px] md:text-[8px] font-black text-primary uppercase whitespace-nowrap tracking-wider">
                    You
                  </div>
                  <div className="w-2 h-2 md:w-1.5 md:h-1.5 bg-background rounded-full" />
                </div>

                {/* Reality Marker */}
                {isStep1Revealed && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5, y: -20, left: '50%' }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                      y: '-50%',
                      left: `${actualPopularity * 100}%`,
                    }}
                    transition={{ type: 'spring', stiffness: 100, damping: 15, delay: 0.2 }}
                    className="absolute top-1/2 w-10 h-10 md:w-8 md:h-8 bg-accent rounded-full shadow-2xl border-4 md:border-2 border-background flex items-center justify-center z-11 pointer-events-none"
                  >
                    <div className="absolute top-10 text-[8px] font-bold text-accent uppercase whitespace-nowrap">
                      Reality
                    </div>
                  </motion.div>
                )}
              </div>

              <Button
                size="lg"
                onClick={handleAction}
                className="w-full max-w-md px-12 py-6 h-auto text-lg font-bold tracking-widest uppercase rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transform duration-200"
              >
                {isStep1Revealed ? 'Continue' : 'Lock In'}
              </Button>
            </motion.div>
          )}
        </div>
      }
    />
  );
};
