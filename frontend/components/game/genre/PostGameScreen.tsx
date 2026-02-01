'use client';

import React, { useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useExperienceStore } from '@/store/core/experienceStore';
import { useGenreOrchestrationStore } from '@/store/genre/genreOrchestrationStore';
import { Loader2, ArrowRight } from 'lucide-react';
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
          <PersonalGenreBubbles data={genreData} />
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
            <div className="mt-2 flex justify-center items-center gap-4 text-xs md:text-sm font-medium text-[#666]">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-1">
                  <div
                    className="w-3 h-3 rounded-full bg-[#2A9D8F] absolute"
                    style={{ transform: 'translateX(-50%)' }}
                  />
                  <div className="w-3 h-3 rounded-full bg-[#E76F51]" />
                </div>
                <span className="ml-2">You</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-300" />
                <span>Community</span>
              </div>
            </div>
          </div>
          <div className="flex-1 min-h-0 px-4 pb-4 flex justify-center">
            <div className="w-full max-w-5xl h-full">
              <TasteGapLine data={genreData.slice(0, 10)} />
            </div>
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
    <div className="fixed inset-0 z-50 bg-[#F8F5F2] text-[#2D2D2D]">
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

      {/* Floating Navigation */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={handleNext}
          className="rounded-full shadow-lg px-6 py-6 text-lg bg-[#2D2D2D] text-[#F8F5F2] hover:bg-black hover:scale-105 transition-all"
        >
          {postGameStep < steps.length - 1 ? 'Next' : 'Finish'}
          <ArrowRight className="ml-2 w-5 h-5" />
        </Button>
      </div>

      {/* Progress Dots? Optional */}
    </div>
  );
};
