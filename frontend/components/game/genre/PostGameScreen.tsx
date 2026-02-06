'use client';

import React, { useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useExperienceStore } from '@/store/core/experienceStore';
import { useGenreOrchestrationStore } from '@/store/genre/genreOrchestrationStore';
import { Loader2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { UserStats } from '@/lib/api';
import { PersonalGenreBubbles } from './visualizations/PersonalGenreBubbles';
import { TasteGapLine } from '@/components/game/genre/visualizations/TasteGapLineChart';

interface PostGameScreenProps {
  onComplete: () => void;
}

export const PostGameScreen: React.FC<PostGameScreenProps> = ({ onComplete }) => {
  const { fetchFullStats, backgroundStatus, username } = useExperienceStore();
  const { postGameStep, setPostGameStep } = useGenreOrchestrationStore();
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(false);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      setIsAtBottom(scrollTop + clientHeight >= scrollHeight - 20);
    }
  };

  React.useEffect(() => {
    setIsAtBottom(false);
  }, [postGameStep]);

  React.useEffect(() => {
    // If we have access to a store that persists it, great. If not, fetch.
    // Ideally useExperienceStore would cache it, but it doesn't seem to persist "userStats" in state, only "scores".
    // So we fetch it.
    if (backgroundStatus === 'ready' && username) {
      fetchFullStats().then((data) => {
        if (data.userStats) setUserStats(data.userStats);
      });
    }
  }, [fetchFullStats, backgroundStatus, username]);

  // Transform GenreStat[] to the format components expect
  // PersonalGenreBubbles expects { name, userAvgRating, userWatchCount, id, exampleMovies }
  // TasteGapLine expects { name, userAvgRating, communityAvgRating, userWatchCount, id }
  // Our new api.ts GenreStat has all this.

  const genreData = useMemo(() => {
    return userStats?.genreOverview || [];
  }, [userStats]);

  // Steps Configuration
  const steps = [
    {
      id: 'bubbles',
      component: (
        <div className="w-full h-full relative">
          <PersonalGenreBubbles data={genreData} insights={userStats?.genreInsights} />
          {/* Title is handled inside PersonalGenreBubbles now */}
        </div>
      ),
    },
    {
      id: 'taste-gap',
      component: (
        <div className="w-full h-full relative flex flex-col bg-[#F8F5F2]">
          <div className="shrink-0 p-4 text-center">
            <h2 className="text-2xl md:text-3xl font-serif font-bold text-[#2D2D2D]">Taste Gap</h2>
            <div className="mt-2 flex justify-center items-center gap-4 md:gap-6 text-sm md:text-base font-medium text-[#666]">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-1 md:-space-x-2">
                  <div
                    className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-[#2A9D8F] absolute"
                    style={{ transform: 'translateX(-50%)' }}
                  />
                  <div className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-[#E76F51]" />
                </div>
                <span className="ml-2">You</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-gray-300" />
                <span>Community</span>
              </div>
            </div>
          </div>
          <div className="flex-1 min-h-0 relative">
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="absolute inset-0 px-4 overflow-y-auto no-scrollbar flex justify-center"
            >
              <div className="w-full max-w-5xl pb-8 pt-2">
                <TasteGapLine data={genreData.slice(0, 10)} />
              </div>
            </div>
            <div
              className={cn(
                'absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#F8F5F2] to-transparent pointer-events-none transition-opacity duration-500',
                isAtBottom ? 'opacity-0' : 'opacity-100',
              )}
            />
          </div>
        </div>
      ),
    },
  ];

  const currentStep = steps[postGameStep] || steps[0];

  const handleNext = () => {
    if (postGameStep < steps.length - 1) {
      setPostGameStep(postGameStep + 1);
    } else {
      onComplete();
    }
  };

  if (!userStats) {
    return (
      <div className="flex items-center justify-center h-full bg-[#F8F5F2]">
        <Loader2 className="w-8 h-8 animate-spin text-[#2D2D2D]" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#F8F5F2] text-[#2D2D2D] flex flex-col">
      <div className="flex-1 min-h-0 relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep.id}
            className="w-full h-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            {currentStep.component}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer Navigation */}
      <div className="shrink-0 px-6 py-6 flex justify-end bg-[#F8F5F2] z-50">
        <Button
          onClick={handleNext}
          size="lg"
          className="gap-2 px-8 text-base md:text-lg font-semibold shadow-md hover:scale-105 transition-all"
        >
          {postGameStep < steps.length - 1 ? 'Next' : 'Finish'}
          <ArrowRight className="ml-2 w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};
