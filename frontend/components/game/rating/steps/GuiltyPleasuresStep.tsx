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
  categoryKey: 'guiltyPleasures' | 'controversialPicks' | 'hotTakes' | 'skepticPicks';
  movieIndex: number;
  hasMoreInCurrentList: boolean;
  isLastOfEverything: boolean;
  currentListLength: number;
  onShowAnother: () => void;
  onContinue: () => void;
}

export const GuiltyPleasuresStep: React.FC<GuiltyPleasuresStepProps> = ({
  currentMovie,
  categoryKey,
  hasMoreInCurrentList,
  isLastOfEverything,
  currentListLength,
  onShowAnother,
  onContinue,
}) => {
  if (!currentMovie) return null;

  const anotherLabel =
    categoryKey === 'guiltyPleasures'
      ? 'guilty pleasure'
      : categoryKey === 'controversialPicks'
        ? 'controversial pick'
        : categoryKey === 'hotTakes'
          ? 'hot take'
          : "skeptic's pick";
  const anotherButtonClasses = cn(
    'text-xs md:text-sm font-medium text-foreground/85 hover:text-foreground px-4 py-2 mt-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 shadow-md transition-all active:scale-95 hover:-translate-y-0.5 flex items-center gap-2',
    categoryKey === 'guiltyPleasures' && 'shadow-rose-500/10',
    categoryKey === 'controversialPicks' && 'shadow-amber-600/10',
    categoryKey === 'hotTakes' && 'shadow-orange-500/10',
    categoryKey === 'skepticPicks' && 'shadow-red-500/10',
  );
  const anotherLabelClasses = cn(
    'font-semibold',
    categoryKey === 'guiltyPleasures' && 'text-rose-400',
    categoryKey === 'controversialPicks' && 'text-amber-600',
    categoryKey === 'hotTakes' && 'text-orange-400',
    categoryKey === 'skepticPicks' && 'text-red-400',
  );

  return (
    <div
      key="guilty"
      className="relative flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-x-hidden px-4 py-6 text-center"
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
        className="relative z-10 my-auto grid w-full max-w-4xl items-center gap-6 md:grid-cols-2 md:gap-12"
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

        <div className="order-2 md:order-1 space-y-4 text-center md:space-y-6 md:text-left">
          <div
            className={cn(
              'inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] md:text-sm font-bold uppercase tracking-widest shadow-lg',
              categoryKey === 'guiltyPleasures' && 'bg-rose-600 text-white border border-rose-400',
              categoryKey === 'controversialPicks' &&
                'bg-amber-600 text-white border border-amber-400',
              categoryKey === 'hotTakes' && 'bg-orange-600 text-white border border-orange-400',
              categoryKey === 'skepticPicks' && 'bg-red-600 text-white border border-red-400',
            )}
          >
            <Heart size={14} className="fill-current" />
            {categoryKey === 'guiltyPleasures' && 'Guilty Pleasure'}
            {categoryKey === 'controversialPicks' && 'Controversial Pick'}
            {categoryKey === 'hotTakes' && 'Hot Take'}
            {categoryKey === 'skepticPicks' && "Skeptic's Pick"}
          </div>

          <h2 className="text-2xl md:text-5xl font-serif font-bold leading-none text-foreground">
            {categoryKey === 'guiltyPleasures' && "You loved it. They didn't."}
            {categoryKey === 'controversialPicks' && 'You saw a masterpiece.'}
            {categoryKey === 'hotTakes' && 'You Did Not Get the Hype.'}
            {categoryKey === 'skepticPicks' && 'Hater of the year.'}
          </h2>

          <p className="text-sm md:text-lg text-muted-foreground">
            {categoryKey === 'guiltyPleasures' && <>You saw something special they missed.</>}
            {categoryKey === 'controversialPicks' && <>You knew it was incredible.</>}
            {categoryKey === 'hotTakes' && <>Is this really what all the fuss is about?</>}
            {categoryKey === 'skepticPicks' && (
              <>
                The community already thought{' '}
                <span className="font-bold text-foreground">{currentMovie.title}</span> was
                mediocre, but you made sure to let them know it was actually terrible.
              </>
            )}
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

      <div className="z-20 flex shrink-0 flex-col items-center gap-3 pt-6 md:pt-8">
        {currentListLength > 1 &&
          (hasMoreInCurrentList ? (
            <button onClick={onShowAnother} className={anotherButtonClasses}>
              <span>Do you want to see another</span>
              <span className={anotherLabelClasses}>{anotherLabel}</span>
              <span>?</span>
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
          className="w-full md:w-auto h-12 md:h-14 px-8 md:px-12 rounded-xl text-base md:text-lg font-bold tracking-widest uppercase shadow-lg hover:shadow-xl hover:-translate-y-0.5 md:hover:-translate-y-1 transform duration-200"
        >
          {isLastOfEverything ? 'See Summary' : 'Continue'}{' '}
          <ArrowRight size={20} className="ml-2" />
        </Button>
      </div>
    </div>
  );
};
