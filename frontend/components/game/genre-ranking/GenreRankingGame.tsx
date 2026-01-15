"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, LayoutGroup } from "framer-motion";
import { ArrowRight, Lock } from "lucide-react";
import { useGenreGameStore } from "@/store/genreGameStore";
import { RankingItem } from "./RankingItem";
import { ScorePanel } from "../shared/ScorePanel";
import { useRankingScore } from "@/hooks/useDistanceScore";
import { GENRE_RANKING_CONFIG } from "./constants";
import { GenreIntroPhase } from "./GenreIntroPhase";
import { DraggableRankingList } from "./DraggableRankingList";
import { ActualRankingColumn } from "./ActualRankingColumn";

export function GenreRankingGame() {
  const {
    genres,
    userRanking,
    actualRanking,
    phase,
    previousScore,
    setUserRanking,
    confirmRanking,
    nextPhase,
    startGame,
  } = useGenreGameStore();

  const itemCount = userRanking.length || GENRE_RANKING_CONFIG.ITEM_COUNT;

  // Scoring Logic
  const { calculateItemScore } = useRankingScore({
    maxScore: GENRE_RANKING_CONFIG.MAX_SCORE,
    itemCount: itemCount,
  });

  // Local UI states
  const [isDragging, setIsDragging] = useState<string | null>(null);

  // Initialize with mock data on mount (for development)
  useEffect(() => {
    if (genres.length === 0 && phase === "intro") {
      const mockGenres = [
        { id: "drama", name: "Drama" },
        { id: "comedy", name: "Comedy" },
        { id: "action", name: "Action" },
        { id: "romance", name: "Romance" },
        { id: "thriller", name: "Thriller" },
        { id: "horror", name: "Horror" },
        { id: "scifi", name: "Sci-Fi" },
        { id: "documentary", name: "Documentary" },
      ];
      const actualOrder = mockGenres.map((g) => g.id);
      startGame({
        genres: mockGenres,
        actualRanking: actualOrder,
        previousScore: 150,
      });
    }
  }, [genres.length, phase, startGame]);

  // Reveal animation states
  const [revealStage, setRevealStage] = useState<
    "ranking" | "ranking-shift" | "slots-appear" | "item-flying" | "complete"
  >("ranking");
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

  // Get genre object by ID
  const getGenre = (id: string) => genres.find((g) => g.id === id);

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
    }, 100);

    const slotsTimer = setTimeout(() => {
      setRevealStage("slots-appear");
    }, 2200);

    const flyTimer = setTimeout(() => {
      setRevealStage("item-flying");
      setRevealIndex(0);
    }, 3200);

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

    const revealTimer = setTimeout(() => {
      setRevealedActualIds((prev) => new Set(prev).add(genreId));
    }, 200);

    const landTimer = setTimeout(() => {
      setLandedItemId(genreId);
    }, 1200);

    const nextTimer = setTimeout(() => {
      setLandedItemId(null);
      setFlyingPoints(null);
      setFlyPosition(undefined);
      if (revealIndex < actualRanking.length - 1) {
        setRevealIndex((prev) => prev + 1);
      } else {
        setTimeout(() => {
          setRevealStage("complete");
          setIsComplete(true);
        }, 1000);
      }
    }, 1300);

    return () => {
      clearTimeout(revealTimer);
      clearTimeout(landTimer);
      clearTimeout(nextTimer);
    };
  }, [revealIndex, revealStage, userRanking, actualRanking]);

  // Intro Phase - Use extracted component
  if (phase === "intro") {
    return <GenreIntroPhase onStart={nextPhase} />;
  }

  // Ranking Phase OR Reveal Phase
  if (phase === "ranking" || phase === "reveal" || phase === "complete") {
    const isRevealing = phase === "reveal" || phase === "complete";
    const showTwoColumns = isRevealing && revealStage !== "ranking";
    const showActualColumn =
      revealStage === "slots-appear" ||
      revealStage === "item-flying" ||
      revealStage === "complete" ||
      phase === "complete";

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col h-[100dvh] md:min-h-screen md:h-auto w-full p-3 md:p-6 md:py-8 overflow-hidden md:overflow-visible"
      >
        {/* SECTION 1: Top Section - Score or Header (shrink-0) */}
        <div className="shrink-0">
          {isRevealing ? (
            /* Score display during reveal - flows in layout on mobile, fixed on desktop */
            <div className="flex justify-end mb-2 md:mb-0">
              <ScorePanel
                score={totalScore}
                pointsEarned={flyingPoints}
                flyFromPosition={flyPosition}
                maxScore={GENRE_RANKING_CONFIG.MAX_SCORE}
                pointsPerAction={GENRE_RANKING_CONFIG.POINTS_PER_ITEM}
                showMaxScore={true}
                animationDelay={0}
                label="Score"
                size="md"
                position="static"
                className="md:fixed md:top-6 md:right-6 md:z-[55]"
              />
            </div>
          ) : (
            /* Header during ranking phase */
            <motion.div
              className="text-center mb-2 md:mb-6 pt-2 md:pt-4"
              layout="position"
            >
              <motion.h2
                className="text-lg md:text-2xl font-serif font-bold text-foreground"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                Rank Your Top Genres
              </motion.h2>
              <motion.p
                className="text-xs md:text-sm text-muted-foreground mt-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                Drag to reorder from most to least watched
              </motion.p>
            </motion.div>
          )}
        </div>

        {/* SECTION 2: Game Area - fills remaining space (flex-1) */}
        <div className="flex-1 w-full max-w-4xl mx-auto min-h-0 overflow-hidden md:overflow-visible flex flex-col">
          <LayoutGroup>
            <motion.div
              className={`w-full h-full grid gap-1 md:gap-6 ${showTwoColumns ? "grid-cols-2" : "grid-cols-1 max-w-md mx-auto"}`}
              layout
              transition={{
                type: "tween",
                duration: 2,
                ease: [0.25, 0.1, 0.25, 1],
              }}
            >
              <motion.div
                layout
                className="w-full h-full flex flex-col relative"
                transition={{
                  type: "tween",
                  duration: 2,
                  ease: [0.25, 0.1, 0.25, 1],
                }}
              >
                {/* Column Header */}
                {isRevealing && (
                  <motion.div
                    className="text-[10px] md:text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1 md:mb-2 text-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 2.0 }}
                  >
                    Your Ranking
                  </motion.div>
                )}

                {/* Draggable List OR Static List */}
                {!isRevealing ? (
                  <DraggableRankingList
                    genres={genres}
                    userRanking={userRanking}
                    onReorder={setUserRanking}
                    isDragging={isDragging}
                    onDragStart={setIsDragging}
                    onDragEnd={() => setIsDragging(null)}
                  />
                ) : (
                  /* Reveal Phase: Static items - flex container for items to fill */
                  <div className="flex flex-col gap-1 md:gap-3 w-full h-full">
                    {userRanking.map((genreId, index) => {
                      const genre = getGenre(genreId);
                      if (!genre) return null;
                      return (
                        <div
                          key={`static-user-${genreId}`}
                          id={`user-item-${genreId}`}
                          className="flex-1"
                        >
                          <RankingItem
                            genre={genre}
                            index={index}
                            variant="static"
                            maxScore={GENRE_RANKING_CONFIG.MAX_SCORE}
                            itemCount={itemCount}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>

              {/* Actual Ranking Column */}
              {showActualColumn && (
                <ActualRankingColumn
                  genres={genres}
                  actualRanking={actualRanking}
                  userRanking={userRanking}
                  revealedActualIds={revealedActualIds}
                  landedItemId={landedItemId}
                  itemCount={itemCount}
                  calculateItemScore={calculateItemScore}
                  onScorePosition={handleScorePosition}
                />
              )}
            </motion.div>
          </LayoutGroup>
        </div>

        {/* SECTION 3: Buttons (shrink-0) */}
        <div className="pt-2 md:pt-6 pb-2 md:pb-8 flex justify-center shrink-0">
          {!isRevealing && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={confirmRanking}
              className="px-6 md:px-8 py-3 md:py-4 bg-primary text-primary-foreground font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all text-base md:text-lg flex items-center gap-2"
            >
              <Lock className="w-4 h-4 md:w-5 md:h-5" />
              Lock It In
            </motion.button>
          )}

          {isComplete && (
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => nextPhase()}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold flex items-center gap-2"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </motion.button>
          )}
        </div>
      </motion.div>
    );
  }

  return null;
}
