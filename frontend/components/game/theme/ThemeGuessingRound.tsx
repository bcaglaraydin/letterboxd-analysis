'use client';

import React, { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Calendar, User, Film } from 'lucide-react';
import { useThemeStore, HINT_SCORE_MAP } from '@/store/theme/themeStore';
import { getScoreColor } from '@/lib/scoreUtils';
import Image from 'next/image';
import { GameBackground } from '@/components/game/shared/GameBackground';
import { GameLayout } from '@/components/game/shared/GameLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GAME_TEXT } from '@/lib/content';
import { cn } from '@/lib/utils';
import type { ThemeRound } from './types';

/* ─────────────────────── Inline Stars ─────────────────────── */
function InlineStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const isFull = rating >= star;
        const isHalf = !isFull && rating >= star - 0.5;
        return (
          <div key={star} className="relative w-4 h-4 md:w-5 md:h-5">
            <Star
              className="absolute inset-0 w-full h-full text-muted-foreground/20"
              strokeWidth={1.5}
            />
            {(isFull || isHalf) && (
              <div className={cn('absolute inset-0 overflow-hidden', isHalf ? 'w-1/2' : 'w-full')}>
                <Star className="w-4 h-4 md:w-5 md:h-5 fill-current text-accent" strokeWidth={0} />
              </div>
            )}
            {(isFull || isHalf) && (
              <Star className="absolute inset-0 w-full h-full text-accent" strokeWidth={1.5} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────── Hint Chip ─────────────────────── */
const chipVariants = {
  initial: { opacity: 0, scale: 0.8, y: 6 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 400, damping: 25 },
  },
  exit: { opacity: 0, scale: 0.8, y: -4 },
};

function HintChip({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      variants={chipVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex items-center gap-1.5 px-3 py-1.5 md:px-5 md:py-2.5
        bg-accent/5 border border-accent/20 rounded-full
        text-xs md:text-base shadow-sm backdrop-blur-sm"
    >
      <Icon className="w-3.5 h-3.5 text-primary shrink-0" />
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground font-medium">{children}</span>
    </motion.div>
  );
}

/* ─────────────────────── Shake Wrapper ─────────────────────── */
const shakeKeyframes = {
  x: [0, -8, 8, -6, 6, -3, 3, 0],
};

/* ─────────────────────── Main Component ─────────────────────── */
interface ThemeGuessingRoundProps {
  round: ThemeRound;
  roundIndex: number;
  totalRounds: number;
  onRoundComplete: () => void;
  roundIndicator: React.ReactNode;
  scorePanel: React.ReactNode;
  onScorePosition?: (pos: { x: number; y: number }) => void;
}

export function ThemeGuessingRound({
  round,
  onRoundComplete,
  roundIndicator,
  scorePanel,
  onScorePosition,
}: ThemeGuessingRoundProps) {
  const { phase, userGuess, setUserGuess, submitGuess, hintLevel, wrongGuessShake, roundScore } =
    useThemeStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pointsRef = useRef<HTMLSpanElement>(null);

  const potentialPoints = HINT_SCORE_MAP[hintLevel] ?? 0;

  // Compute a very subtle tint color for the reveal background based on score
  const revealTintColor = useMemo(() => {
    if (phase !== 'revealed' || roundScore === null) return 'transparent';
    if (roundScore === 0) return 'hsla(0, 85%, 45%, 0.15)';
    const style = getScoreColor(roundScore, 20, 0);
    const hsl = style.color as string;
    return hsl.replace('hsl(', 'hsla(').replace(')', ', 0.15)');
  }, [phase, roundScore]);

  const handleSubmit = () => {
    if (!userGuess.trim()) return;
    setIsSubmitting(true);

    // Capture the position of the score indicator BEFORE submitGuess changes the phase
    // (AnimatePresence will unmount the guessing UI, destroying the ref)
    if (pointsRef.current && onScorePosition) {
      const rect = pointsRef.current.getBoundingClientRect();
      onScorePosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    }

    setTimeout(() => {
      submitGuess(round.correctMovie.title);
      setIsSubmitting(false);
    }, 300);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && userGuess.trim()) {
      handleSubmit();
    }
  };

  return (
    <GameBackground>
      <GameLayout
        top={
          <div className="flex justify-between items-start p-4 md:p-8 w-full max-w-7xl mx-auto relative z-[60]">
            {roundIndicator}
            {scorePanel}
          </div>
        }
        middle={
          <div className="w-full flex flex-col items-center justify-center px-4 md:px-6 min-h-0">
            {/* Reveal background effect — blurred poster + score-color tint */}
            <AnimatePresence>
              {phase === 'revealed' && (
                <>
                  <motion.div
                    key="reveal-bg"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.15 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8 }}
                    className="fixed inset-0 bg-cover bg-center blur-2xl scale-110 z-[1] pointer-events-none"
                    style={{
                      backgroundImage: `url(${round.correctMovie.posterUrl})`,
                    }}
                  />
                  <motion.div
                    key="reveal-tint"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8 }}
                    className="fixed inset-0 z-[2] pointer-events-none"
                    style={{
                      backgroundColor: revealTintColor,
                    }}
                  />
                  <motion.div
                    key="reveal-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6 }}
                    className="fixed inset-0 bg-background/60 backdrop-blur-[2px] z-[3] pointer-events-none"
                  />
                </>
              )}
            </AnimatePresence>
            <AnimatePresence mode="wait">
              {phase === 'guessing' ? (
                <motion.div
                  key="guessing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="w-full max-w-md md:max-w-lg flex flex-col items-center gap-3 md:gap-6"
                >
                  {/* Prompt */}
                  <motion.p
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-xs md:text-base text-muted-foreground
                      tracking-wide text-center"
                  >
                    {GAME_TEXT.THEME_EXPERIENCE.PROMPT}
                  </motion.p>

                  {/* Theme Tags — compact on mobile */}
                  <div className="flex flex-wrap items-center justify-center gap-1.5 md:gap-2">
                    {round.themes.map((theme, i) => (
                      <motion.span
                        key={theme}
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{
                          delay: i * 0.08,
                          type: 'spring',
                          stiffness: 350,
                          damping: 25,
                        }}
                        className="px-3 py-1 md:px-5 md:py-2
                          bg-primary/5 border border-primary/20 rounded-full
                          text-foreground font-serif text-xs md:text-base
                          tracking-wide shadow-sm"
                      >
                        {theme}
                      </motion.span>
                    ))}
                  </div>

                  {/* Hint Chips — always-visible genre + progressive reveals */}
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <AnimatePresence mode="popLayout">
                      {/* Always visible: Genre */}
                      {round.genres.length > 0 && (
                        <HintChip key="genre" icon={Film} label="Genre">
                          {round.genres.join(' · ')}
                        </HintChip>
                      )}

                      {/* Level 1: Year */}
                      {hintLevel >= 1 && (
                        <HintChip key="year" icon={Calendar} label="Year">
                          {round.correctMovie.year}
                        </HintChip>
                      )}

                      {/* Level 2: User Rating */}
                      {hintLevel >= 2 && (
                        <HintChip key="rating" icon={Star} label="Rated">
                          {round.userRating !== null ? (
                            <InlineStars rating={round.userRating} />
                          ) : (
                            'Not rated'
                          )}
                        </HintChip>
                      )}

                      {/* Level 3: Director */}
                      {hintLevel >= 3 && (
                        <HintChip key="director" icon={User} label="Director">
                          {round.correctMovie.director}
                        </HintChip>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Points at stake — same style as genre game */}
                  <div className="flex items-center justify-center">
                    <span ref={pointsRef} className="text-xs md:text-base font-bold">
                      <span
                        style={potentialPoints === 0 ? {} : getScoreColor(potentialPoints, 20, 0)}
                        className={cn(
                          'transition-colors duration-300',
                          potentialPoints === 0 && 'text-muted-foreground/60 font-medium',
                        )}
                      >
                        {potentialPoints}
                      </span>
                      <span className="text-muted-foreground/50 font-medium">/20</span>
                    </span>
                  </div>

                  {/* Input area with shake on wrong guess */}
                  <motion.div
                    animate={wrongGuessShake ? shakeKeyframes : {}}
                    transition={{ duration: 0.4, ease: 'easeInOut' }}
                    className="w-full space-y-2 md:space-y-3"
                  >
                    <Input
                      value={userGuess}
                      onChange={(e) => setUserGuess(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={GAME_TEXT.THEME_EXPERIENCE.INPUT_PLACEHOLDER}
                      className="text-center text-sm md:text-lg h-10 md:h-14
                        bg-card/40 border-border/30 rounded-xl font-sans
                        placeholder:text-muted-foreground/50"
                      autoFocus
                    />
                    <Button
                      onClick={handleSubmit}
                      disabled={!userGuess.trim() || isSubmitting}
                      className="w-full h-10 md:h-14 rounded-xl text-sm md:text-base
                        font-bold tracking-widest uppercase"
                    >
                      {GAME_TEXT.THEME_EXPERIENCE.SUBMIT}
                    </Button>
                  </motion.div>
                </motion.div>
              ) : (
                /* ───── Revealed State ───── */
                <motion.div
                  key="revealed"
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    duration: 0.5,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="w-full max-w-sm md:max-w-3xl min-h-0 flex flex-col items-center gap-3 md:gap-5 relative z-[5]"
                >
                  {/* Main content: stacked on mobile, side-by-side on desktop */}
                  <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-10 items-center">
                    {/* Left column (desktop) / Bottom (mobile): Themes */}
                    <div className="order-2 md:order-1 flex flex-wrap items-center justify-center md:justify-start gap-1.5 md:gap-2">
                      {round.themes.map((theme) => (
                        <span
                          key={theme}
                          className="px-2.5 py-0.5 md:px-5 md:py-2
                            bg-primary/5 border border-primary/20 rounded-full
                            text-foreground font-serif text-[11px] md:text-base
                            tracking-wide shadow-sm"
                        >
                          {theme}
                        </span>
                      ))}
                    </div>

                    {/* Right column (desktop) / Top (mobile): Movie Card */}
                    <div className="order-1 md:order-2 flex flex-col items-center gap-2 md:gap-3">
                      <div className="relative w-32 md:w-72 aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border-2 border-white/10">
                        <Image
                          src={round.correctMovie.posterUrl}
                          alt={round.correctMovie.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="text-center space-y-0.5">
                        <h2 className="text-lg md:text-3xl font-bold text-foreground font-serif leading-tight">
                          {round.correctMovie.title}
                        </h2>
                        <div className="flex items-center justify-center gap-2 text-xs md:text-base text-muted-foreground font-medium tracking-wide">
                          <span>{round.correctMovie.year}</span>
                          <span>•</span>
                          <span className="uppercase tracking-wider">
                            {round.correctMovie.director}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Round score — centered below both columns */}
                  {roundScore !== null && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="shrink-0 text-base md:text-xl font-bold"
                    >
                      <span style={getScoreColor(roundScore, 20, 0)}>{roundScore}</span>
                      <span className="text-muted-foreground/50 font-medium">/20</span>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        }
        bottom={
          phase === 'revealed' ? (
            <div className="px-4 pb-4 md:px-6 md:pb-6 pt-2">
              <Button
                onClick={onRoundComplete}
                className="w-full max-w-sm md:max-w-md mx-auto h-10 md:h-14 rounded-xl text-sm md:text-base
                  font-bold tracking-widest uppercase block relative z-[5]"
              >
                {GAME_TEXT.THEME_EXPERIENCE.CONTINUE}
              </Button>
            </div>
          ) : null
        }
      />
    </GameBackground>
  );
}
