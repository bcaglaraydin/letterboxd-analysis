'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { type UserStats } from '@/store/rating/ratingStore';
import { Button } from '@/components/ui/button';

interface AveragesStepProps {
  userStats: UserStats;
  onNext: () => void;
}

export const AveragesStep: React.FC<AveragesStepProps> = ({ userStats, onNext }) => {
  return (
    <div
      key="averages"
      className="flex flex-col items-center justify-center min-h-[100dvh] w-full text-center p-4 md:p-6 bg-gradient-to-br from-background to-secondary/20"
    >
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-4xl space-y-8 md:space-y-12 flex flex-col justify-center h-full"
      >
        <h2 className="text-2xl md:text-3xl font-medium text-muted-foreground uppercase tracking-widest">
          The Big Picture
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
          {/* User Stat */}
          <div className="space-y-2 md:space-y-4">
            <div className="text-xs md:text-sm font-bold text-primary uppercase tracking-widest">
              Your Average
            </div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className="text-7xl md:text-9xl font-serif font-bold text-foreground"
            >
              {userStats.averageRating.toFixed(1)}
            </motion.div>

          </div>

          {/* VS Divider (Mobile only) */}
          <div className="md:hidden text-xl font-black text-muted-foreground/50">- VS -</div>

          {/* Community Stat */}
          <div className="space-y-2 md:space-y-4 opacity-70">
            <div className="text-xs md:text-sm font-bold text-muted-foreground uppercase tracking-widest">
              Community Average
            </div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.4 }}
              className="text-6xl md:text-8xl font-serif font-bold text-muted-foreground"
            >
              {userStats.communityComparison.averageCommunityRating.toFixed(1)}
            </motion.div>

          </div>
        </div>

        <p className="text-lg md:text-xl text-muted-foreground max-w-md mx-auto px-4">
          You are{' '}
          <span className="text-foreground font-bold">
            {userStats.averageRating > userStats.communityComparison.averageCommunityRating
              ? 'more generous'
              : 'tougher'}
          </span>{' '}
          than the rest of the world.
        </p>

        <div className="pt-4">
          <Button
            onClick={onNext}
            variant="secondary"
            className="mx-auto px-6 py-3 h-auto rounded-full flex items-center gap-2"
          >
            Next <ArrowRight size={16} />
          </Button>
        </div>
      </motion.div>
    </div>
  );
};
