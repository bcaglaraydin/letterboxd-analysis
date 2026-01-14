"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, Reorder, AnimatePresence, LayoutGroup } from "framer-motion";
import { ArrowRight, Lock, RotateCcw } from "lucide-react";
import { useGenreGameStore, genreToColor } from "@/store/genreGameStore";
import { cn } from "@/lib/utils";
import { RankingItem } from "./RankingItem";
import { ScorePanel } from "../shared/ScorePanel";
import { useRankingScore } from "@/hooks/useDistanceScore";
import { GENRE_RANKING_CONFIG } from "./constants";

export function GenreRankingGame() {
  const {
    genres,
    userRanking,
    actualRanking,
    phase,
    previousScore,
    setUserRanking,
    confirmRanking,
    resetGame,
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
      const actualOrder = mockGenres.map((g) => g.id); // Correct order is as listed
      startGame({
        genres: mockGenres,
        actualRanking: actualOrder,
        previousScore: 150,
      });
    }
  }, [genres.length, phase, startGame]);

  // Reveal animation states
  // Stage: "ranking" -> "ranking-shift" -> "slots-appear" -> "item-flying" -> "complete"
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
      // Prevent duplicate processing for same item (stops infinite loops)
      if (lastProcessedIdRef.current === genreId) return;
      lastProcessedIdRef.current = genreId;

      setFlyPosition(position);
      setFlyingPoints(genreScore);
      // Update total after a short delay for animation to show
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

    // Step 1: Start grid transition (ranking moves left)
    const shiftTimer = setTimeout(() => {
      setRevealStage("ranking-shift");
      setTotalScore(0);
    }, 100);

    // Step 2: After grid transition completes, show slots
    const slotsTimer = setTimeout(() => {
      setRevealStage("slots-appear");
    }, 2200);

    // Step 3: After slots are visible, start flying items
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
    // const actualPos = actualRanking.indexOf(genreId);
    // const itemScore = calculateItemScore(revealIndex, actualPos);

    // Phase 1: Reveal item immediately
    // Phase 1: Reveal item immediately to start entrance animation
    const revealTimer = setTimeout(() => {
      setRevealedActualIds((prev) => new Set(prev).add(genreId));
    }, 200);

    // Phase 1.5: Mark as landed after entrance animation settles
    // The entrance animation is a spring with ~1.2s-1.5s visual duration
    const landTimer = setTimeout(() => {
      setLandedItemId(genreId);
    }, 1200); // 200ms start + 800ms animation wait

    // Phase 2: Update score (Handled by LayoutItem's callback)
    // No explicit timer needed here as the sequence is driven by RankingItem's callback
    // which triggers the score update and visual feedback flow

    // Phase 3: Move to next item
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
    }, 1300); // Increased to account for the longer settle time

    return () => {
      clearTimeout(revealTimer);
      clearTimeout(landTimer);
      clearTimeout(nextTimer);
    };
  }, [revealIndex, revealStage, userRanking, actualRanking]);

  // Intro Phase
  if (phase === "intro") {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex flex-col items-center justify-center min-h-[100dvh] w-full text-center p-6 space-y-8"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <h1 className="text-3xl md:text-5xl font-serif font-bold text-foreground">
            🎬 Genre Ranking
          </h1>
          <p className="text-muted-foreground text-lg md:text-xl max-w-md mx-auto">
            Rank your top 8 genres from most to least watched. How well do you
            know your taste?
          </p>
        </motion.div>

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => nextPhase()}
          className="px-8 py-4 bg-primary text-primary-foreground font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all text-lg flex items-center gap-2"
        >
          Let&apos;s Go <ArrowRight className="w-5 h-5" />
        </motion.button>
      </motion.div>
    );
  }

  // Ranking Phase OR Reveal Phase
  if (phase === "ranking" || phase === "reveal" || phase === "complete") {
    const isRevealing = phase === "reveal" || phase === "complete";
    const showTwoColumns = isRevealing && revealStage !== "ranking";

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col h-[100dvh] md:min-h-screen md:h-auto w-full p-3 md:p-6 md:py-8 overflow-hidden md:overflow-visible"
      >
        {/* ScorePanel */}
        {isRevealing && (
          <ScorePanel
            score={totalScore}
            pointsEarned={flyingPoints}
            flyFromPosition={flyPosition}
            maxScore={GENRE_RANKING_CONFIG.MAX_SCORE}
            animationDelay={0}
            label="Score"
            size="lg"
            position="top-right"
          />
        )}

        {/* Header */}
        <motion.div
          className="text-center mb-3 md:mb-6 pt-2 md:pt-4 shrink-0"
          layout="position"
        >
          <motion.h2
            className="text-lg md:text-2xl font-serif font-bold text-foreground"
            key={isRevealing ? "reveal-header" : "ranking-header"}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {isRevealing ? "Let's See How You Did!" : "Rank Your Top Genres"}
          </motion.h2>
          {!isRevealing && (
            <motion.p
              className="text-xs md:text-sm text-muted-foreground mt-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              Drag to reorder from most to least watched
            </motion.p>
          )}
        </motion.div>

        {/* Main Content Area */}
        <div className="flex-1 w-full max-w-4xl mx-auto min-h-0 overflow-hidden md:overflow-visible flex flex-col items-center">
          <LayoutGroup>
            <motion.div
              className={`w-full grid gap-4 md:gap-6 ${showTwoColumns ? "grid-cols-2" : "grid-cols-1"}`}
              layout
              transition={{
                type: "tween",
                duration: 2,
                ease: [0.25, 0.1, 0.25, 1],
              }}
            >
              {/* User Ranking Column */}
              <motion.div
                layout
                className="max-w-md w-full relative mx-auto"
                transition={{
                  type: "tween",
                  duration: 2,
                  ease: [0.25, 0.1, 0.25, 1],
                }}
              >
                {/* Column Header */}
                {isRevealing && (
                  <motion.div
                    className="text-[10px] md:text-xs text-muted-foreground font-bold uppercase tracking-wider mb-2 text-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    Your Ranking
                  </motion.div>
                )}

                {/* Draggable List OR Static List */}
                {!isRevealing ? (
                  <Reorder.Group
                    axis="y"
                    values={userRanking}
                    onReorder={setUserRanking}
                    className="h-full flex flex-col gap-1.5 md:gap-3"
                  >
                    <AnimatePresence>
                      {userRanking.map((genreId, index) => {
                        const genre = getGenre(genreId);
                        if (!genre) return null;
                        const color = genreToColor(genre.name);

                        return (
                          <Reorder.Item
                            key={genreId}
                            value={genreId}
                            onDragStart={() => setIsDragging(genreId)}
                            onDragEnd={() => setIsDragging(null)}
                            whileDrag={{ scale: 1.02, zIndex: 50 }}
                            className="touch-none flex-1 md:flex-none"
                          >
                            <motion.div
                              layout
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.03 }}
                              className={cn(
                                "relative flex items-center gap-3 md:gap-4 p-2.5 md:p-4 rounded-lg md:rounded-xl cursor-grab active:cursor-grabbing h-full md:h-auto",
                                "border-2 border-border bg-card",
                                "shadow-sm hover:shadow-md md:shadow-md md:hover:shadow-lg transition-shadow",
                                isDragging === genreId &&
                                  "shadow-lg md:shadow-xl",
                              )}
                              style={{
                                borderLeftColor: color,
                                borderLeftWidth: "3px",
                              }}
                            >
                              <div
                                className="w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm font-bold shrink-0 text-white"
                                style={{ backgroundColor: color }}
                              >
                                {index + 1}
                              </div>
                              <span className="font-serif text-sm md:text-lg font-semibold text-foreground flex-1">
                                {genre.name}
                              </span>
                              <div className="flex flex-col gap-0.5 opacity-40">
                                <div className="w-3 md:w-4 h-0.5 bg-muted-foreground rounded" />
                                <div className="w-3 md:w-4 h-0.5 bg-muted-foreground rounded" />
                                <div className="w-3 md:w-4 h-0.5 bg-muted-foreground rounded" />
                              </div>
                            </motion.div>
                          </Reorder.Item>
                        );
                      })}
                    </AnimatePresence>
                  </Reorder.Group>
                ) : (
                  /* Reveal Phase: Static items */
                  <div className="flex flex-col gap-1.5 md:gap-3 w-full">
                    {userRanking.map((genreId, index) => {
                      const genre = getGenre(genreId);
                      if (!genre) return null;
                      return (
                        <RankingItem
                          key={`static-user-${genreId}`}
                          genre={genre}
                          index={index}
                          variant="static"
                          maxScore={GENRE_RANKING_CONFIG.MAX_SCORE}
                          itemCount={itemCount}
                        />
                      );
                    })}
                  </div>
                )}
              </motion.div>

              {/* Actual Ranking Column */}
              {(revealStage === "slots-appear" ||
                revealStage === "item-flying" ||
                revealStage === "complete" ||
                phase === "complete") && (
                <motion.div
                  layout
                  className="max-w-md w-full mx-auto"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{
                    type: "tween",
                    duration: 1.5,
                    delay: 0.3,
                  }}
                >
                  {/* Column Header */}
                  <motion.div
                    className="text-[10px] md:text-xs text-muted-foreground font-bold uppercase tracking-wider mb-2 text-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6, duration: 0.8 }}
                  >
                    Actual Order
                  </motion.div>

                  {/* Actual ranking slots */}
                  <div className="h-full flex flex-col gap-1.5 md:gap-3">
                    {actualRanking.map((genreId, index) => {
                      const genre = getGenre(genreId);
                      if (!genre) return null;

                      const isRevealed = revealedActualIds.has(genreId);
                      const userIndex = userRanking.indexOf(genreId);
                      const actualIndex = index;
                      const isCorrect = userIndex === actualIndex;
                      const hasJustLanded = landedItemId === genreId;

                      return (
                        <motion.div
                          key={`actual-slot-${index}`}
                          className="relative"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{
                            duration: 0.8,
                            delay: index * 0.15,
                            ease: "easeOut",
                          }}
                        >
                          {/* Empty Slot */}
                          <RankingItem
                            genre={genre}
                            index={index}
                            variant="actual-slot"
                            maxScore={GENRE_RANKING_CONFIG.MAX_SCORE}
                            itemCount={itemCount}
                          />

                          {/* Filled Item - Slides in from left */}
                          <AnimatePresence>
                            {isRevealed && (
                              <motion.div
                                initial={{ opacity: 0, x: -300, scale: 0.85 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                transition={{
                                  type: "spring",
                                  damping: 20,
                                  stiffness: 100,
                                  duration: 1.5,
                                }}
                                className="absolute inset-0"
                              >
                                <RankingItem
                                  genre={genre}
                                  index={index}
                                  variant="actual-filled"
                                  isRevealed={true}
                                  isCorrect={isCorrect}
                                  score={calculateItemScore(
                                    userIndex,
                                    actualIndex,
                                  )}
                                  hasJustLanded={hasJustLanded}
                                  onScorePosition={(pos, score) =>
                                    handleScorePosition(genre.id, pos, score)
                                  }
                                  maxScore={GENRE_RANKING_CONFIG.MAX_SCORE}
                                  itemCount={itemCount}
                                />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </motion.div>
          </LayoutGroup>
        </div>

        {/* Buttons */}
        <div className="pt-3 md:pt-6 pb-4 md:pb-8 flex justify-center shrink-0">
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
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-4"
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={resetGame}
                className="px-6 py-3 border-2 border-border rounded-xl font-semibold flex items-center gap-2 hover:bg-muted transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Play Again
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => nextPhase()}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold flex items-center gap-2"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </motion.button>
            </motion.div>
          )}
        </div>
      </motion.div>
    );
  }

  return null;
}
