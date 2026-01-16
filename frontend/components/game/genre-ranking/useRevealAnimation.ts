"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { REVEAL_ANIMATION_TIMING } from "./constants";

export type RevealStage =
  | "ranking"
  | "ranking-shift"
  | "slots-appear"
  | "item-flying"
  | "complete";

interface UseRevealAnimationOptions {
  /** Current game phase */
  phase: string;
  /** User's ranking of genre IDs */
  userRanking: string[];
  /** Actual correct ranking of genre IDs */
  actualRanking: string[];
  /** Previous score (used to reset on change) */
  previousScore: number;
}

interface RevealAnimationState {
  /** Current stage of the reveal animation */
  revealStage: RevealStage;
  /** Index of the item currently being revealed (-1 if not started) */
  revealIndex: number;
  /** Set of genre IDs that have been revealed in the actual column */
  revealedActualIds: Set<string>;
  /** ID of the item that has just landed (for animation trigger) */
  landedItemId: string | null;
  /** Points currently flying to score panel */
  flyingPoints: number | null;
  /** Position of flying points animation */
  flyPosition: { top: string; right: string } | undefined;
  /** Current total score during reveal */
  totalScore: number;
  /** Whether the reveal animation is complete */
  isComplete: boolean;
  /** Handler for when an item reports its score position */
  handleScorePosition: (
    genreId: string,
    position: { top: string; right: string },
    genreScore: number,
  ) => void;
}

/**
 * Custom hook that manages the reveal animation state machine for the genre ranking game.
 *
 * The animation progresses through these stages:
 * 1. "ranking" - Initial state, user is ranking
 * 2. "ranking-shift" - Columns shift to make room for actual ranking
 * 3. "slots-appear" - Empty slots appear in actual ranking column
 * 4. "item-flying" - Items fly into their actual positions one by one
 * 5. "complete" - Animation complete, show continue button
 */
export function useRevealAnimation({
  phase,
  userRanking,
  actualRanking,
  previousScore,
}: UseRevealAnimationOptions): RevealAnimationState {
  // Reveal animation states
  const [revealStage, setRevealStage] = useState<RevealStage>("ranking");
  const [revealIndex, setRevealIndex] = useState(-1);
  const [revealedActualIds, setRevealedActualIds] = useState<Set<string>>(
    new Set(),
  );
  const [landedItemId, setLandedItemId] = useState<string | null>(null);
  const [flyingPoints, setFlyingPoints] = useState<number | null>(null);
  const [flyPosition, setFlyPosition] = useState<
    { top: string; right: string } | undefined
  >(undefined);
  const [totalScore, setTotalScore] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const lastProcessedIdRef = useRef<string | null>(null);

  // Handler for when RankingItem reports its score badge position
  const handleScorePosition = useCallback(
    (
      genreId: string,
      position: { top: string; right: string },
      genreScore: number,
    ) => {
      if (lastProcessedIdRef.current === genreId) return;
      lastProcessedIdRef.current = genreId;

      setFlyPosition(position);
      setFlyingPoints(genreScore);
      setTimeout(() => {
        setTotalScore((prev) => prev + genreScore);
      }, 600);
    },
    [],
  );

  // Reset states when going back to ranking phase
  useEffect(() => {
    if (phase === "ranking" || phase === "intro") {
      const resetTimer = setTimeout(() => {
        setRevealStage("ranking");
        setRevealIndex(-1);
        setRevealedActualIds(new Set());
        setLandedItemId(null);
        setFlyingPoints(null);
        setFlyPosition(undefined);
        setTotalScore(0);
        lastProcessedIdRef.current = null;
        setIsComplete(false);
      }, 0);
      return () => clearTimeout(resetTimer);
    }
  }, [phase, previousScore]);

  // Master Orchestrator for Reveal Sequence
  useEffect(() => {
    if (phase !== "reveal") return;

    const shiftTimer = setTimeout(() => {
      setRevealStage("ranking-shift");
      setTotalScore(0);
    }, REVEAL_ANIMATION_TIMING.SHIFT_DELAY);

    const slotsTimer = setTimeout(() => {
      setRevealStage("slots-appear");
    }, REVEAL_ANIMATION_TIMING.SLOTS_APPEAR_DELAY);

    const flyTimer = setTimeout(() => {
      setRevealStage("item-flying");
      setRevealIndex(0);
    }, REVEAL_ANIMATION_TIMING.ITEM_FLYING_DELAY);

    return () => {
      clearTimeout(shiftTimer);
      clearTimeout(slotsTimer);
      clearTimeout(flyTimer);
    };
  }, [phase, previousScore]);

  // Sequential item-by-item reveal animation
  useEffect(() => {
    if (revealStage !== "item-flying") return;
    if (revealIndex < 0 || revealIndex >= actualRanking.length) return;

    const genreId = userRanking[revealIndex];
    let completionTimer: ReturnType<typeof setTimeout> | null = null;

    const revealTimer = setTimeout(() => {
      setRevealedActualIds((prev) => new Set(prev).add(genreId));
    }, REVEAL_ANIMATION_TIMING.ITEM_REVEAL_DELAY);

    const landTimer = setTimeout(() => {
      setLandedItemId(genreId);
    }, REVEAL_ANIMATION_TIMING.ITEM_LAND_DELAY);

    const nextTimer = setTimeout(() => {
      setLandedItemId(null);
      setFlyingPoints(null);
      setFlyPosition(undefined);
      if (revealIndex < actualRanking.length - 1) {
        setRevealIndex((prev) => prev + 1);
      } else {
        completionTimer = setTimeout(() => {
          setRevealStage("complete");
          setIsComplete(true);
        }, REVEAL_ANIMATION_TIMING.COMPLETION_DELAY);
      }
    }, REVEAL_ANIMATION_TIMING.NEXT_ITEM_DELAY);

    return () => {
      clearTimeout(revealTimer);
      clearTimeout(landTimer);
      clearTimeout(nextTimer);
      if (completionTimer) clearTimeout(completionTimer);
    };
  }, [revealIndex, revealStage, userRanking, actualRanking]);

  return {
    revealStage,
    revealIndex,
    revealedActualIds,
    landedItemId,
    flyingPoints,
    flyPosition,
    totalScore,
    isComplete,
    handleScorePosition,
  };
}
