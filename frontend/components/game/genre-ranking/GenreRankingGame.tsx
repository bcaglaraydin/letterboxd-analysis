"use client";

import React, { useState, useEffect } from "react";
import { motion, LayoutGroup } from "framer-motion";
import { ArrowRight, Lock } from "lucide-react";
import { useGenreGameStore } from "@/store/genreGameStore";
import { RankingItem } from "./RankingItem";
import { ScorePanel } from "../shared/ScorePanel";
import { GameLayout } from "../shared/GameLayout";
import { useRankingScore } from "@/hooks/useDistanceScore";
import { GENRE_RANKING_CONFIG } from "./constants";
import { GenreIntroPhase } from "./GenreIntroPhase";
import { DraggableRankingList } from "./DraggableRankingList";
import { ActualRankingColumn } from "./ActualRankingColumn";
import { useRevealAnimation } from "./useRevealAnimation";
import { Button } from "@/components/ui/button";

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

  // Local UI state
  const [isDragging, setIsDragging] = useState<string | null>(null);

  // Reveal Animation (extracted to custom hook)
  const {
    revealStage,
    revealedActualIds,
    landedItemId,
    flyingPoints,
    flyPosition,
    totalScore,
    isComplete,
    handleScorePosition,
  } = useRevealAnimation({
    phase,
    userRanking,
    actualRanking,
    previousScore,
  });

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

  // Get genre object by ID
  const getGenre = (id: string) => genres.find((g) => g.id === id);

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
        className="w-full h-full"
      >
        <GameLayout
          className="p-3 md:p-6 md:py-8"
          top={
            <div className="w-full">
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
          }
          middle={
            <div className="w-full max-w-4xl mx-auto flex flex-col justify-center">
              <LayoutGroup>
                <motion.div
                  className={`w-full grid gap-1 md:gap-6 ${showTwoColumns ? "grid-cols-2" : "grid-cols-1 max-w-md mx-auto"}`}
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
                      /* Reveal Phase: Static items - compact block, no vertical fill */
                      <div className="flex flex-col gap-1 md:gap-3 w-full">
                        {userRanking.map((genreId, index) => {
                          const genre = getGenre(genreId);
                          if (!genre) return null;
                          return (
                            <div
                              key={`static-user-${genreId}`}
                              id={`user-item-${genreId}`}
                              className="h-10 md:h-[72px]"
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
          }
          bottom={
            <div className="flex justify-center w-full pt-2 md:pt-6 pb-2 md:pb-8 min-h-[80px] md:min-h-[100px]">
              <div className="h-12 md:h-14 flex items-center">
                {!isRevealing && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <Button
                      onClick={confirmRanking}
                      size="lg"
                      className="px-6 md:px-8 py-3 md:py-4 h-auto text-base md:text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
                    >
                      <Lock className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                      Lock It In
                    </Button>
                  </motion.div>
                )}

                {isComplete && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      onClick={() => nextPhase()}
                      size="lg"
                      className="px-6 py-3 h-auto rounded-xl font-semibold"
                    >
                      Continue <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </motion.div>
                )}
              </div>
            </div>
          }
        />
      </motion.div>
    );
  }

  return null;
}
