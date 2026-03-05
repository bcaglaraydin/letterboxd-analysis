'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ScorePanel } from '@/components/game/shared/ScorePanel';
import { getScoreColor } from '@/lib/scoreUtils';
import { useUserStore } from '@/store/core/userStore';

interface FakeScoreInteractionProps {
  score: number;
  maxScore: number;
  threshold: number;
  onComplete: () => void;
  onScoreChange?: (score: number) => void;
}

type InteractionPhase =
  | 'initial-fail'
  | 'forgive'
  | 'interactive-score'
  | 'busted'
  | 'final-busted'
  | 'success';

export const FakeScoreInteraction: React.FC<FakeScoreInteractionProps> = ({
  score,
  maxScore,
  threshold,
  onComplete: _onComplete,
  onScoreChange,
}) => {
  const {
    hasSeenFakeScorePrank,
    setHasSeenFakeScorePrank,
    hasSeenSuccessDialog,
    setHasSeenSuccessDialog,
  } = useUserStore();
  const isPass = score >= threshold;

  const determineInitialPhase = (): InteractionPhase => {
    return isPass ? 'success' : 'initial-fail';
  };

  const [phase, setPhase] = useState<InteractionPhase>(determineInitialPhase());
  const [fakeScore, setFakeScore] = useState(score);
  const [clicks, setClicks] = useState(0);

  // Animation variants
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 1.0 } },
    exit: { opacity: 0, transition: { duration: 0.5 } },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: 'easeOut' } },
  };

  const textVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: 0.7, ease: 'easeOut' } },
  };

  const scoreColor = getScoreColor(fakeScore);

  const finishPrank = () => {
    setHasSeenFakeScorePrank(true);
    // onComplete() is called by the useEffect that watches hasSeenFakeScorePrank
  };

  const finishSuccess = () => {
    setHasSeenSuccessDialog(true);
    // onComplete() is called by the useEffect that watches hasSeenSuccessDialog
  };

  const handleScoreInteraction = () => {
    if (phase !== 'interactive-score' && phase !== 'busted') return;

    const nextClicks = clicks + 1;
    const nextScore = fakeScore - 1;
    setClicks(nextClicks);
    setFakeScore(nextScore);

    if (onScoreChange) {
      onScoreChange(nextScore);
    }

    if (phase === 'interactive-score' && nextClicks >= 3) {
      setPhase('busted');
    }
  };

  if ((hasSeenFakeScorePrank && !isPass) || (hasSeenSuccessDialog && isPass)) return null;

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] w-full text-center p-6 bg-background relative z-50 select-none">
      {/* Top Right Score Panel */}
      <AnimatePresence>
        {!isPass && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 md:top-6 md:right-6 z-[60] flex flex-col items-center"
          >
            <AnimatePresence>
              {(phase === 'interactive-score' ||
                phase === 'busted' ||
                phase === 'final-busted') && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="cursor-pointer mb-2 opacity-50 hover:opacity-100 hover:-translate-y-1 transition-all group"
                  onClick={handleScoreInteraction}
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-primary group-hover:animate-bounce"
                  >
                    <path d="m18 15-6-6-6 6" />
                  </svg>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="cursor-pointer" onClick={handleScoreInteraction}>
              <ScorePanel
                score={fakeScore}
                maxScore={maxScore}
                label="Score"
                size="md"
                countSpeed={1}
                animationDelay={0}
              />
            </div>

            <AnimatePresence>
              {(phase === 'interactive-score' ||
                phase === 'busted' ||
                phase === 'final-busted') && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="cursor-pointer mt-2 opacity-50 hover:opacity-100 hover:translate-y-1 transition-all group"
                  onClick={handleScoreInteraction}
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-primary group-hover:animate-bounce"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {phase === 'success' && (
          <motion.div
            key="success"
            variants={containerVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            className="flex flex-col items-center space-y-8 max-w-4xl mx-auto"
          >
            <motion.div
              variants={itemVariants}
              className="flex flex-col md:flex-row items-center md:items-baseline justify-center gap-2 md:gap-3 flex-wrap"
            >
              <span className="text-xl md:text-3xl text-muted-foreground text-center">
                Congratulations, you scored
              </span>
              <div className="flex items-baseline leading-none">
                <span
                  className="text-5xl md:text-7xl font-serif font-black tracking-tighter"
                  style={scoreColor}
                >
                  {score}
                </span>
                <span className="text-2xl md:text-4xl text-muted-foreground/40 font-bold ml-1">
                  /{maxScore}
                </span>
              </div>
            </motion.div>
            <motion.div
              variants={itemVariants}
              className="text-xl md:text-3xl text-muted-foreground max-w-2xl mx-auto leading-relaxed text-center"
            >
              You truly have a <span className="font-bold text-foreground">respectable memory</span>{' '}
              and <span className="font-bold text-foreground">attention to detail</span>. You know
              yourself very well.{' '}
              <span className="font-bold text-foreground">
                You&apos;ve earned the right to see the genre bubbles
              </span>
              .
            </motion.div>
            <motion.div variants={itemVariants} className="pt-8">
              <Button
                size="lg"
                onClick={finishSuccess}
                className="w-full sm:w-auto px-12 py-6 text-xl"
              >
                Thank you
              </Button>
            </motion.div>
          </motion.div>
        )}

        {phase === 'initial-fail' && (
          <motion.div
            key="initial-fail"
            variants={containerVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            className="flex flex-col items-center space-y-8 max-w-4xl mx-auto"
          >
            <motion.div
              variants={itemVariants}
              className="flex flex-col md:flex-row items-center md:items-baseline justify-center gap-2 md:gap-3 flex-wrap"
            >
              <span className="text-xl md:text-3xl text-muted-foreground text-center">
                I see you scored
              </span>
              <div className="flex items-baseline leading-none">
                <span
                  className="text-5xl md:text-7xl font-serif font-black tracking-tighter"
                  style={scoreColor}
                >
                  {score}
                </span>
                <span className="text-2xl md:text-4xl text-muted-foreground/40 font-bold ml-1">
                  /{maxScore}
                </span>
              </div>
            </motion.div>
            <motion.p
              variants={itemVariants}
              className="text-xl md:text-3xl text-primary font-serif leading-relaxed"
            >
              Do you have <span className="font-bold">anything</span> to say about this?
            </motion.p>
            <motion.div variants={itemVariants} className="pt-8 w-full flex justify-center">
              <Button
                variant="outline"
                onClick={() => setPhase('forgive')}
                className="w-full max-w-sm text-lg py-6 border-primary/20 bg-background/50 hover:bg-primary/10 hover:text-primary hover:border-primary/50 transition-all duration-300"
              >
                I&apos;m a disappointment.
              </Button>
            </motion.div>
          </motion.div>
        )}

        {phase === 'forgive' && (
          <motion.div
            key="forgive"
            variants={containerVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            className="flex flex-col items-center space-y-8 max-w-4xl mx-auto"
          >
            <div className="text-xl md:text-3xl text-primary font-serif leading-relaxed text-center">
              <motion.span variants={textVariants} className="inline mr-2">
                Alright, alright.
              </motion.span>
              <motion.span variants={textVariants} className="inline mr-2">
                To be honest,
              </motion.span>
              <motion.span variants={textVariants} className="inline">
                I&apos;m going to show you the analysis <span className="font-bold">anyway</span>
                .{' '}
              </motion.span>
              <motion.span variants={textVariants} className="inline">
                We&apos;re here to have <span className="font-bold">fun</span> after all,{' '}
              </motion.span>
              <motion.span variants={textVariants} className="inline">
                aren&apos;t we?
              </motion.span>
            </div>
            <motion.div variants={itemVariants} className="pt-8 w-full flex justify-center">
              <Button
                variant="outline"
                onClick={() => setPhase('interactive-score')}
                className="w-full max-w-sm text-lg py-6 border-primary/20 bg-background/50 hover:bg-primary/10 hover:text-primary hover:border-primary/50 transition-all duration-300"
              >
                That&apos;s great.
              </Button>
            </motion.div>
          </motion.div>
        )}

        {phase === 'interactive-score' && (
          <motion.div
            key="interactive-score"
            variants={containerVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            className="flex flex-col items-center space-y-12 max-w-4xl mx-auto"
          >
            <div className="text-xl md:text-3xl text-primary font-serif leading-relaxed text-center">
              <motion.span variants={textVariants} className="block mb-8 w-full text-center">
                The score was there just to bring a bit more <span className="font-bold">fun</span>.
              </motion.span>
              <span className="block mb-2 text-center w-full">
                <motion.span variants={textVariants} className="inline mr-2">
                  In fact,
                </motion.span>
                <motion.span variants={textVariants} className="inline">
                  I&apos;ll even give you the chance to change your score{' '}
                  <span className="font-bold">however you like</span>.{' '}
                </motion.span>
              </span>
              <motion.span variants={itemVariants} className="block mt-4 text-center w-full">
                Try it in the top right corner.
              </motion.span>
            </div>

            <motion.div variants={itemVariants} className="pt-8 w-full flex justify-center">
              <Button size="lg" onClick={finishPrank} className="w-full max-w-sm text-xl py-6">
                Continue
              </Button>
            </motion.div>
          </motion.div>
        )}

        {phase === 'busted' && (
          <motion.div
            key="busted"
            variants={containerVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            className="flex flex-col items-center space-y-8 max-w-4xl mx-auto"
          >
            <div className="text-xl md:text-3xl text-primary font-serif leading-relaxed text-center">
              <span className="block mb-2">
                <motion.span variants={textVariants} className="inline mr-2">
                  What are you doing?
                </motion.span>
                <motion.span variants={textVariants} className="inline font-bold">
                  Stop that.
                </motion.span>
              </span>
              <motion.span variants={textVariants} className="inline">
                The scores <span className="font-bold">won&apos;t</span> prevent the analysis,{' '}
              </motion.span>
              <motion.span variants={textVariants} className="inline">
                <span className="font-bold"> but your score needs to be fair</span> if you want to
                compete with your friends.
              </motion.span>
            </div>
            <motion.p
              variants={itemVariants}
              className="text-xl md:text-3xl text-primary font-serif leading-relaxed"
            >
              By attempting these <span className="font-bold">ridiculous</span> things, you&apos;ve
              just lost <span className="font-bold text-red-500">{clicks}</span> points.{' '}
            </motion.p>
            <motion.p
              variants={itemVariants}
              className="text-xl md:text-3xl text-primary font-serif leading-relaxed"
            >
              <span className="font-bold">I advise you not to touch it anymore.</span>
            </motion.p>
            <motion.div variants={itemVariants} className="pt-8 w-full flex justify-center">
              <Button
                variant="outline"
                onClick={() => setPhase('final-busted')}
                className="w-full max-w-sm text-lg py-6 border-primary/20 bg-background/50 hover:bg-primary/10 hover:text-primary hover:border-primary/50 transition-all duration-300"
              >
                I want my points back
              </Button>
            </motion.div>
          </motion.div>
        )}

        {phase === 'final-busted' && (
          <motion.div
            key="final-busted"
            variants={containerVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            className="flex flex-col items-center space-y-8 max-w-4xl mx-auto"
          >
            <motion.p
              variants={itemVariants}
              className="text-xl md:text-3xl text-primary font-serif leading-relaxed"
            >
              No, enjoy your <span className="font-bold">genre bubbles</span>.
            </motion.p>
            <motion.div variants={itemVariants} className="pt-8 w-full flex justify-center">
              <Button size="lg" onClick={finishPrank} className="w-full max-w-sm text-xl py-6">
                Continue
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
