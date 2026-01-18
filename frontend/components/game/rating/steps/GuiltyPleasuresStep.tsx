'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { ArrowRight, Heart } from 'lucide-react';
import { type Movie } from '@/store/rating/ratingStore';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface GuiltyPleasuresStepProps {
  currentMovie: Movie | undefined;
  viewingControversial: boolean;
  cpIndex: number;
  hasMoreInCurrentList: boolean;
  isLastOfEverything: boolean;
  currentListLength: number;
  onShowAnother: () => void;
  onContinue: () => void;
}

export const GuiltyPleasuresStep: React.FC<GuiltyPleasuresStepProps> = ({
  currentMovie,
  viewingControversial,
  cpIndex,
  hasMoreInCurrentList,
  isLastOfEverything,
  currentListLength,
  onShowAnother,
  onContinue,
}) => {
  if (!currentMovie) return null;

  return (
    <div
      key="guilty"
      className="flex flex-col items-center justify-center min-h-[100dvh] w-full text-center p-4 md:p-6 relative overflow-hidden"
    >
      {/* Background Poster Blur */}
      <div
        key={currentMovie.poster}
        className="absolute inset-0 opacity-20 bg-cover bg-center blur-xl scale-110 transition-transform ease-linear animate-slow-zoom"
        style={{
          backgroundImage: `url(${currentMovie.poster || ''})`,
          transitionDuration: '20s',
        }}
      />
      <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px]" />

      <motion.div
        key={currentMovie.movieId || currentMovie.title}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative z-10 max-w-4xl w-full grid md:grid-cols-2 gap-6 md:gap-12 items-center"
      >
        {/* Mobile: Poster First, then Text */}
        <div className="order-1 md:order-2 flex justify-center">
          <motion.div
            whileHover={{ scale: 1.05, rotate: -2 }}
            className="relative rounded-xl overflow-hidden shadow-2xl shadow-black/50 border-4 border-white/10 w-32 md:w-72 aspect-[2/3]"
          >
            <Image
              src={currentMovie.poster || ''}
              alt={currentMovie.title || ''}
              fill
              className="object-cover"
            />
            <div className="absolute top-2 right-2 md:top-4 md:right-4 bg-primary text-primary-foreground font-bold rounded-full w-8 h-8 md:w-12 md:h-12 flex items-center justify-center shadow-lg border-2 border-white/20 text-sm md:text-lg">
              {currentMovie.userRating}
            </div>
          </motion.div>
        </div>

        <div className="order-2 md:order-1 space-y-4 md:space-y-6 text-center md:text-left">
          {/* Transition Message: Show ONLY on the first Controversial Pick */}
          {viewingControversial && cpIndex === 0 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm text-muted-foreground italic"
            >
              You also have some{' '}
              <span className="text-amber-400 font-bold">Controversial Picks</span> that you loved
              more than most...
            </motion.p>
          )}

          <div
            className={cn(
              'inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] md:text-sm font-bold uppercase tracking-widest shadow-lg',
              !viewingControversial
                ? 'bg-rose-600 text-white border border-rose-400'
                : 'bg-amber-600 text-white border border-amber-400',
            )}
          >
            <Heart size={14} className="fill-current" />
            {!viewingControversial ? 'Guilty Pleasure' : 'Controversial Pick'}
          </div>

          <h2 className="text-2xl md:text-5xl font-serif font-bold leading-none text-foreground">
            {!viewingControversial
              ? "You loved it. They didn't."
              : 'You saw something they missed.'}
          </h2>

          <p className="text-sm md:text-lg text-muted-foreground">
            While the community gave{' '}
            <span className="font-bold text-foreground">{currentMovie.title}</span> a{' '}
            {currentMovie.communityRating}, you saw it differently.
          </p>

          <div className="grid grid-cols-2 gap-3 md:gap-4 pt-2">
            <div className="bg-card/80 backdrop-blur p-3 md:p-4 rounded-xl border border-border text-center shadow-sm">
              <div className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-widest mb-1">
                You
              </div>
              <div className="text-2xl md:text-4xl font-serif font-bold text-primary">
                {currentMovie.userRating}
              </div>
            </div>
            <div className="bg-muted/50 backdrop-blur p-3 md:p-4 rounded-xl border border-white/5 text-center">
              <div className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-widest mb-1">
                Them
              </div>
              <div className="text-2xl md:text-4xl font-serif font-bold text-muted-foreground">
                {currentMovie.communityRating}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="pt-6 md:pt-8 z-20 shrink-0 flex flex-col items-center gap-3">
        {currentListLength > 1 &&
          (hasMoreInCurrentList ? (
            <button
              onClick={onShowAnother}
              className="text-xs md:text-sm text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors"
            >
              Do you want to see another one?
            </button>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs md:text-sm text-muted-foreground italic"
            >
              That was all!
            </motion.div>
          ))}

        <Button
          onClick={onContinue}
          className="px-6 py-3 h-auto rounded-full flex items-center gap-2 backdrop-blur shadow-lg border border-border font-medium ring-1 ring-border/50 animate-pulse hover:animate-none"
        >
          {isLastOfEverything ? 'See Summary' : 'Continue'} <ArrowRight size={16} />
        </Button>
      </div>
    </div>
  );
};
