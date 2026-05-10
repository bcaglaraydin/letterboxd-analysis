'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, ArrowRight } from 'lucide-react';
import { useUserStore } from '@/store/core/userStore';
import { Button } from '@/components/ui/button';
import { GameDialogue } from '@/components/game/shared/GameDialogue';
import { GameBackground } from '@/components/game/shared/GameBackground';

interface TasteMatchesAnalysisProps {
  onComplete: () => void;
}

type Step = 'favorites' | 'searching' | 'results';

export function TasteMatchesAnalysis({ onComplete }: TasteMatchesAnalysisProps) {
  const [step, setStep] = useState<Step>('favorites');
  const tasteMatch = useUserStore((s) => s.tasteMatch);

  const { matches, userFavorites, matchCount } = tasteMatch;

  // Cinematic sequences for searching based on matchCount
  const searchingMessages = useMemo(
    () => [
      <span key="intro">I&apos;ve searched through millions of Letterboxd members...</span>,
      <span key="exact">
        Looking for anyone who shares this{' '}
        <span className="text-primary font-bold">exact heartbeat</span>.
      </span>,
    ],
    [],
  );

  const resultMessages = useMemo(() => {
    if (matchCount === 4) {
      return ['And I found them.', 'People who love these exact four films as much as you do.'];
    }

    if (matchCount > 0) {
      return [
        <span key="searching">I searched for a perfect match of four...</span>,
        <span key="no-match">Unfortunately, nobody shares your exact four favorites.</span>,
        <span key="kindred">
          But I found your <span className="text-primary font-bold">kindred spirits</span> who share{' '}
          <span className="text-primary font-black text-4xl">{matchCount}</span> of them.
        </span>,
      ];
    }

    return [
      'I searched for a soulmate who shares your favorites...',
      'But your taste is truly one of a kind.',
      'Nobody in the world matches your specific cinematic signature.',
    ];
  }, [matchCount]);

  // 1. Favorites Step (Direct Entry)
  if (step === 'favorites') {
    return (
      <GameBackground>
        <div className="flex flex-col items-center justify-center w-full min-h-screen p-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-5xl w-full flex flex-col items-center justify-center gap-4 md:gap-8"
          >
            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 1 }}
              className="text-[clamp(1.5rem,5vh,3rem)] md:text-5xl font-serif text-primary leading-tight tracking-tight px-4"
            >
              Do these films look familiar to you?
            </motion.h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-8 w-full max-w-4xl max-h-[50vh] md:max-h-none overflow-visible px-4">
              {userFavorites.map((film, i) => (
                <motion.div
                  key={film.slug}
                  initial={{ opacity: 0, scale: 0.8, y: 30, rotate: -2 }}
                  animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
                  transition={{
                    delay: i * 0.2 + 0.4,
                    duration: 0.8,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  whileHover={{ scale: 1.05, y: -10, transition: { duration: 0.3 } }}
                  className="aspect-[2/3] relative rounded-lg md:rounded-xl overflow-hidden shadow-2xl border border-white/10 group bg-black/20"
                >
                  <Image
                    src={film.posterUrl}
                    alt={`Poster for ${film.title}`}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-2 md:p-4">
                    <p className="text-white text-[10px] md:text-sm font-bold leading-tight">
                      {film.title}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2, duration: 0.8 }}
              className="w-full max-w-xs px-4"
            >
              <Button
                size="lg"
                onClick={() => setStep('searching')}
                className="w-full py-6 md:py-8 h-auto text-lg md:text-xl font-bold tracking-[0.2em] uppercase rounded-xl md:rounded-2xl shadow-2xl hover:scale-105 transition-all bg-primary text-primary-foreground group"
              >
                <span className="relative z-10">Yes!</span>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </GameBackground>
    );
  }

  // 2. Searching Step
  if (step === 'searching') {
    return (
      <GameDialogue
        messages={[...searchingMessages, ...resultMessages]}
        buttonText={matchCount > 0 ? 'Show them to me' : 'Continue'}
        onComplete={() => (matchCount > 0 ? setStep('results') : onComplete())}
      />
    );
  }

  // 3. Results Step
  return (
    <GameBackground>
      <div className="w-full min-h-screen flex flex-col items-center justify-center p-4 py-12 md:py-20 relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] -z-10" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-6xl mx-auto flex flex-col items-center z-10"
        >
          <div className="mb-8 md:mb-16 text-center">
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-4xl md:text-7xl font-serif font-black text-primary leading-tight mb-6 tracking-tight"
            >
              Taste Soulmates
            </motion.h2>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-lg md:text-2xl text-muted-foreground max-w-2xl mx-auto font-serif italic"
            >
              These members share {matchCount} of your top favorite films.
            </motion.p>
          </div>

          <div className="w-full overflow-y-auto max-h-[45vh] md:max-h-none no-scrollbar mb-8 md:mb-12 px-2 pb-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 w-full">
              <AnimatePresence>
                {matches.map((match, i) => (
                  <motion.a
                    href={`https://letterboxd.com${match.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    key={match.url}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: i * 0.1 + 0.8,
                      duration: 0.8,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    whileHover={{ y: -8, transition: { duration: 0.2 } }}
                    className="flex items-center gap-3 md:gap-5 bg-white/5 shadow-xl hover:bg-white/10 p-3 md:p-5 rounded-2xl md:rounded-[2rem] border border-white/10 transition-all group backdrop-blur-md"
                  >
                    <div className="relative w-12 h-12 md:w-20 md:h-20 rounded-full overflow-hidden bg-black/10 shrink-0 border-2 border-white/20 shadow-lg group-hover:border-primary/50 transition-colors duration-500">
                      {match.avatarUrl ? (
                        <Image
                          src={match.avatarUrl}
                          alt={`${match.name}'s avatar`}
                          fill
                          className="object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-bold font-serif text-lg md:text-2xl">
                          {match.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <h3 className="font-bold text-base md:text-xl text-primary truncate group-hover:text-accent transition-colors">
                        {match.name}
                      </h3>
                      <p className="text-xs md:text-sm text-muted-foreground font-medium tracking-tight truncate opacity-60 group-hover:opacity-100 transition-opacity">
                        @{match.url.replace(/\//g, '')}
                      </p>
                    </div>
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <ExternalLink className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground group-hover:text-primary transition-all" />
                    </div>
                  </motion.a>
                ))}
              </AnimatePresence>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.8 }}
          >
            <Button
              onClick={onComplete}
              size="lg"
              className="rounded-full px-8 py-5 md:px-16 md:py-10 text-lg md:text-2xl font-black gap-2 md:gap-4 shadow-2xl hover:scale-105 hover:-translate-y-1 transition-all group border-b-4 border-primary-foreground/20 active:border-b-0 active:translate-y-1"
            >
              <span>See My Journey Summary</span>
              <ArrowRight className="w-5 h-5 md:w-8 md:h-8 group-hover:translate-x-2 transition-transform" />
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </GameBackground>
  );
}
