'use client';

import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FavoriteActorRound } from './FavoriteActorRound';
import { DurationBatchRound } from './DurationBatchRound';
import { WorldMapRound } from './WorldMapRound';
import { HabitsIntroDialogue } from './HabitsIntroDialogue';
import { useUserStore } from '@/store/core/userStore';
import { useExperienceStore } from '@/store/core/experienceStore';
import type { TopActor } from '@/lib/api';
import { MapIntroDialogue } from './MapIntroDialogue';

interface ViewingHabitsOrchestrationProps {
  onGameComplete: (totalScore: number) => void;
}

export type HabitsPhase = 'intro' | 'actor' | 'duration' | 'map-intro' | 'map';

function shuffleActors<T>(actors: T[]) {
  const shuffled = [...actors];

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

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

  // Build waitlist: top8 + decoys strictly from remaining real actors (no mock actors)
  const decoys =
    topActors.length > 8
      ? topActors.slice(8, 12).map((actor, idx) => ({
          id: `actor-decoy-${idx}`,
          name: actor.name,
          photoUrl: actor.photoUrl || '',
          watchCount: actor.count,
          moviesWatched: [] as { id: string; title: string; rating: number; posterUrl: string }[],
        }))
      : [];

  return { top8, waitlist: shuffleActors([...top8, ...decoys]) };
}

export function ViewingHabitsOrchestration({ onGameComplete }: ViewingHabitsOrchestrationProps) {
  const [score, setScore] = useState(0);
  const userStats = useUserStore((s) => s.userStats);
  const { habitsPhase: phase, setHabitsPhase: setPhase } = useExperienceStore();

  // If actors cannot be fetched or not enough actors exist for a question, skip the actor round completely.
  // Mock actors must NEVER be shown.
  const hasRealActors = Boolean(userStats?.topActors && userStats.topActors.length >= 4);
  const actorData = hasRealActors ? buildActorData(userStats!.topActors!) : null;

  // Auto-skip actor phase if reached without sufficient real actors
  useEffect(() => {
    if (phase === 'actor' && !hasRealActors) {
      setPhase('duration');
    }
  }, [phase, hasRealActors, setPhase]);

  const handleLevelComplete = () => {
    if (hasRealActors) {
      setPhase('actor');
    } else {
      setPhase('duration');
    }
  };

  const handleActorComplete = (roundScore: number) => {
    setScore((prev) => prev + roundScore);
    setPhase('duration');
  };

  // Adjust total rounds and numbering dynamically if actor round is skipped
  const totalRounds = hasRealActors ? 3 : 2;
  const durationRoundNumber = hasRealActors ? 2 : 1;
  const mapRoundNumber = hasRealActors ? 3 : 2;

  const handleDurationComplete = (roundScore: number) => {
    const newScore = score + roundScore;
    setScore(newScore);
    setPhase('map-intro');
  };

  const handleMapIntroComplete = () => {
    setPhase('map');
  };

  const handleMapComplete = () => {
    onGameComplete(score);
  };

  return (
    <div className="w-full h-full bg-background relative overflow-hidden">
      <AnimatePresence mode="wait">
        {phase === 'intro' && (
          <motion.div
            key="intro-round"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.4 }}
            className="w-full h-full flex flex-col items-center justify-center relative z-10"
          >
            <HabitsIntroDialogue onComplete={handleLevelComplete} />
          </motion.div>
        )}

        {phase === 'actor' && hasRealActors && actorData && (
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
              totalRounds={totalRounds}
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
              roundNumber={durationRoundNumber}
              totalRounds={totalRounds}
              distributionGraphs={userStats?.durationDistribution}
            />
          </motion.div>
        )}

        {phase === 'map-intro' && (
          <motion.div
            key="map-intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.4 }}
            className="w-full h-full flex flex-col items-center justify-center relative z-10"
          >
            <MapIntroDialogue onComplete={handleMapIntroComplete} />
          </motion.div>
        )}

        {phase === 'map' && (
          <motion.div
            key="map-round"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.4 }}
            className="w-full h-full"
          >
            <WorldMapRound
              onComplete={handleMapComplete}
              currentScore={score}
              roundNumber={mapRoundNumber}
              totalRounds={totalRounds}
              countryStats={userStats?.countryStats || []}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
