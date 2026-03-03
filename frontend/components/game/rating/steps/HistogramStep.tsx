'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { StarRating } from '../StarRating';
import { Button } from '@/components/ui/button';
import { type UserStats } from '@/store/rating/ratingStore';

interface HistogramStepProps {
  userStats: UserStats;
  onNext: () => void;
}

const HISTOGRAM_LABELS = ['0.5', '1.0', '1.5', '2.0', '2.5', '3.0', '3.5', '4.0', '4.5', '5.0'];

const getDistValue = (dist: Record<string, number>, index: number) => {
  const start = index * 0.5;
  const end = start + 0.5;
  const formatNum = (n: number) => (n % 1 === 0 ? n.toString() : n.toString());
  const key = `${formatNum(start)}-${formatNum(end)}`;
  return dist[key] || 0;
};

export const HistogramStep: React.FC<HistogramStepProps> = ({ userStats, onNext }) => {
  const totalComm =
    Object.values(userStats.communityRatingDistribution).reduce((a, b) => a + b, 0) || 1;

  return (
    <div
      key="histogram"
      className="flex flex-col items-center justify-center min-h-[100dvh] w-full text-center p-4 md:p-6"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full max-w-5xl space-y-6 md:space-y-8 flex flex-col h-full justify-center"
      >
        <div className="space-y-2 shrink-0">
          <h2 className="text-2xl md:text-4xl font-serif font-bold">Rating Distribution</h2>
          <div className="flex justify-center gap-6 text-xs md:text-sm font-medium">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary" /> You
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-muted-foreground/30" /> Community
            </div>
          </div>
        </div>

        {/* Chart Container */}
        <div className="h-[40vh] md:h-80 flex items-end justify-between gap-1 md:gap-4 px-2 md:px-4 w-full">
          {HISTOGRAM_LABELS.map((label, i) => {
            const userVal = getDistValue(userStats.ratingDistribution, i);
            const commVal = getDistValue(userStats.communityRatingDistribution, i);
            const userPercent = (userVal / userStats.totalMovies) * 100;
            const commPercent = (commVal / totalComm) * 100;
            const scaleFactor = 1.5;

            return (
              <div
                key={label}
                className="flex-1 flex flex-col justify-end gap-1 h-full group relative"
              >
                <div className="flex gap-[1px] md:gap-1 items-end h-full w-full justify-center">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{
                      height: `${Math.min(userPercent * scaleFactor, 100)}%`,
                    }}
                    transition={{ delay: i * 0.05 }}
                    className="w-1/2 bg-primary rounded-t-[2px] md:rounded-t-sm opacity-90"
                  />
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{
                      height: `${Math.min(commPercent * scaleFactor, 100)}%`,
                    }}
                    transition={{ delay: i * 0.05 + 0.2 }}
                    className="w-1/2 bg-muted-foreground/30 rounded-t-[2px] md:rounded-t-sm"
                  />
                </div>
                <div className="flex items-center justify-center mt-1 md:mt-2">
                  <StarRating
                    value={parseFloat(label)}
                    readOnly
                    starSize="w-1.5 h-1.5 md:w-3 md:h-3"
                    showEmptyStars={false}
                    className="gap-[0.5px] justify-center"
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="shrink-0 pt-4">
          <Button
            onClick={onNext}
            className="w-full md:w-auto mx-auto h-12 md:h-14 px-8 md:px-12 rounded-xl text-base md:text-lg font-bold tracking-widest uppercase shadow-lg hover:shadow-xl hover:-translate-y-0.5 md:hover:-translate-y-1 transform duration-200"
          >
            Next <ArrowRight size={20} className="ml-2" />
          </Button>
        </div>
      </motion.div>
    </div>
  );
};
