'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FavoriteActorRound } from './FavoriteActorRound';
import { DurationBatchRound } from './DurationBatchRound';
import { useUserStore } from '@/store/core/userStore';
import { mockActors, mockActorWaitlist } from '@/mocks/data';
import type { TopActor } from '@/lib/api';

interface ViewingHabitsOrchestrationProps {
  onGameComplete: (totalScore: number) => void;
}

export type HabitsPhase = 'actor' | 'duration';

// Convert backend TopActor[] to the shape FavoriteActorRound expects
function buildActorData(topActors: TopActor[]) {
  const top8 = topActors.slice(0, 8).map((actor, idx) => ({
    id: `actor-${idx + 1}`,
    name: actor.name,
    photoUrl: actor.photoUrl || '',
    watchCount: actor.count,
    moviesWatched: actor.movies.map((m, mIdx) => ({
      id: `${idx}-${mIdx}`,
      title: m.title,
      rating: 0,
      posterUrl: m.posterUrl || '',
    })),
  }));

  // Build waitlist: top8 + 3 decoys from the bottom of the list (or mock fallbacks)
  const decoys =
    topActors.length > 8
      ? topActors.slice(8, 11).map((actor, idx) => ({
          id: `actor-decoy-${idx}`,
          name: actor.name,
          photoUrl: actor.photoUrl || '',
          watchCount: actor.count,
          moviesWatched: [] as { id: string; title: string; rating: number; posterUrl: string }[],
        }))
      : mockActorWaitlist.slice(8, 11); // fallback decoys from mocks

  return { top8, waitlist: [...top8, ...decoys] };
}

export function ViewingHabitsOrchestration({ onGameComplete }: ViewingHabitsOrchestrationProps) {
  const [phase, setPhase] = useState<HabitsPhase>('actor');
  const [score, setScore] = useState(0);
  const userStats = useUserStore((s) => s.userStats);

  // Use real data if available, otherwise fall back to mocks
  const hasRealActors = userStats?.topActors && userStats.topActors.length > 0;
  const actorData = hasRealActors
    ? buildActorData(userStats.topActors!)
    : { top8: mockActors, waitlist: mockActorWaitlist };

  const handleActorComplete = (roundScore: number) => {
    setScore((prev) => prev + roundScore);
    setPhase('duration');
  };

  const handleDurationComplete = (roundScore: number) => {
    const finalScore = score + roundScore;
    setScore(finalScore);
    onGameComplete(finalScore);
  };

  return (
    <div className="w-full h-full bg-background relative overflow-hidden">
      <AnimatePresence mode="wait">
        {phase === 'actor' && (
          <motion.div
            key="actor-round"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.4 }}
            className="w-full h-full"
          >
            <FavoriteActorRound
              onComplete={handleActorComplete}
              currentScore={score}
              roundNumber={1}
              totalRounds={2}
              topActors={actorData.top8}
              actorWaitlist={actorData.waitlist}
            />
          </motion.div>
        )}

        {phase === 'duration' && (
          <motion.div
            key="duration-round"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.4 }}
            className="w-full h-full"
          >
            <DurationBatchRound
              onComplete={handleDurationComplete}
              currentScore={score}
              roundNumber={2}
              totalRounds={2}
              distributionGraphs={userStats?.durationDistribution}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Debug Controls - Absolute bottom left */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute bottom-4 left-4 flex gap-2 z-50">
          <button
            onClick={() => setPhase('actor')}
            className="px-3 py-1 bg-black/50 text-white text-xs rounded hover:bg-black/80"
          >
            Debug: Actor
          </button>
          <button
            onClick={() => setPhase('duration')}
            className="px-3 py-1 bg-black/50 text-white text-xs rounded hover:bg-black/80"
          >
            Debug: Duration
          </button>
        </div>
      )}
    </div>
  );
}
