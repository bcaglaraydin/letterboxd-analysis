'use client';

import React, { useState } from 'react';
import { motion, LayoutGroup } from 'framer-motion';
import { ArrowRight, Lock } from 'lucide-react';
import { useGenreRankingStore } from '@/store/genre/rankingStore';
import { RankingItem } from './RankingItem';
import { ScorePanel } from '@/components/game/shared/ScorePanel';
import { GameRoundIndicator } from '@/components/game/shared/GameRoundIndicator';
import { GameLayout } from '@/components/game/shared/GameLayout';
import { useRankingScore } from '@/hooks/useDistanceScore';
import { GENRE_RANKING_CONFIG } from './constants';
import { GenreIntroPhase } from './GenreIntroPhase';
import { DraggableRankingList } from './DraggableRankingList';
import { ActualRankingColumn } from './ActualRankingColumn';
import { useRevealAnimation } from './useRevealAnimation';
import { Button } from '@/components/ui/button';

interface GenreRankingGameProps {
  onGameComplete: (score: number) => void;
}

export function GenreRankingGame({ onGameComplete }: GenreRankingGameProps) {
  const {
    genres,
    userRanking,
    actualRanking,
    phase,
    previousScore,
    setUserRanking,
    confirmRanking,
    nextPhase,
  } = useGenreRankingStore();

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
  // Initialize with mock data on mount (for development)
  /*
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
  */

  // Get genre object by ID
  const getGenre = (id: string) => genres.find((g) => g.id === id);

  // Intro Phase - Use extracted component
  if (phase === 'intro') {
    return <GenreIntroPhase onStart={nextPhase} />;
  }

  // Ranking Phase OR Reveal Phase
  if (phase === 'ranking' || phase === 'reveal' || phase === 'complete') {
    const isRevealing = phase === 'reveal' || phase === 'complete';
    const showTwoColumns = isRevealing && revealStage !== 'ranking';
    const showActualColumn =
      revealStage === 'slots-appear' ||
      revealStage === 'item-flying' ||
      revealStage === 'complete' ||
      phase === 'complete';

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full h-full">
        <GameLayout
          className="p-3 md:p-6 md:py-8"
          top={
            <div className="w-full relative">
              <div className="absolute left-0 top-1 md:top-0">
                <GameRoundIndicator currentRound={1} totalRounds={1} />
              </div>
              {isRevealing ? (
                /* Score display during reveal - flows in layout on mobile, fixed on desktop */
                <div className="flex justify-end mb-2 md:mb-0">
                  <ScorePanel
                    score={totalScore}
                    pointsEarned={flyingPoints}
                    flyFromPosition={flyPosition}
                    maxScore={GENRE_RANKING_CONFIG.MAX_SCORE}
                    /* pointsPerAction removed from API, using maxPositivePoint */
                    maxPositivePoint={GENRE_RANKING_CONFIG.POINTS_PER_ITEM}
                    maxNegativePoint={0}
                    showMaxScore={true}
                    animationDelay={0}
                    label="Score"
                    size="md"
                    position="static"
                  />
                </div>
              ) : null}
            </div>
          }
          middle={
            <div className="w-full max-w-[57.5rem] mx-auto flex flex-col justify-center h-full md:h-auto">
              {/* Header: Moved to Middle for better proximity */}
              {!isRevealing && (
                <motion.div className="text-center mb-6 md:mb-10" layout="position">
                  <motion.h2
                    className="text-2xl md:text-4xl font-serif font-bold text-foreground drop-shadow-sm"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    Rank Your Top Genres
                  </motion.h2>
                  <motion.div
                    className="flex items-center justify-center gap-2 text-muted-foreground mt-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <div className="h-px w-8 bg-border/50" />
                    <p className="text-xs md:text-sm font-medium uppercase tracking-wider">
                      Drag to reorder
                    </p>
                    <div className="h-px w-8 bg-border/50" />
                  </motion.div>
                </motion.div>
              )}

              <LayoutGroup>
                <motion.div
                  className={`w-full h-full md:h-auto grid gap-1 md:gap-6 ${showTwoColumns ? 'grid-cols-2' : 'grid-cols-1 max-w-md mx-auto'}`}
                  layout
                  transition={{
                    type: 'tween',
                    duration: 2,
                    ease: [0.25, 0.1, 0.25, 1],
                  }}
                >
                  <motion.div
                    layout
                    className="w-full h-full md:h-auto flex flex-col relative"
                    transition={{
                      type: 'tween',
                      duration: 2,
                      ease: [0.25, 0.1, 0.25, 1],
                    }}
                  >
                    {/* Column Header */}
                    {isRevealing && (
                      <motion.div
                        className="text-[10px] md:text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1 md:mb-2 text-center shrink-0"
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
                      <div className="flex flex-col gap-1 md:gap-3 w-full h-full">
                        {userRanking.map((genreId, index) => {
                          const genre = getGenre(genreId);
                          if (!genre) return null;
                          return (
                            <div
                              key={`static-user-${genreId}`}
                              id={`user-item-${genreId}`}
                              className="flex-1 min-h-0 md:flex-none md:h-[72px]"
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

              {/* Desktop: Buttons grouped with content */}
              <div className="hidden md:flex justify-center mt-8 shrink-0">
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
                      className="px-8 py-4 h-auto text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
                    >
                      <Lock className="w-5 h-5 mr-2" />
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
                      onClick={() => onGameComplete(totalScore)}
                      size="lg"
                      className="px-6 py-3 h-auto rounded-xl font-semibold"
                    >
                      Return to Hub <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </motion.div>
                )}
              </div>
            </div>
          }
          bottom={
            <div className="md:hidden flex justify-center w-full pt-2 pb-2 min-h-[60px]">
              <div className="h-12 flex items-center">
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
                      className="px-6 py-3 h-auto text-base font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
                    >
                      <Lock className="w-4 h-4 mr-2" />
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
                      onClick={() => onGameComplete(totalScore)}
                      size="lg"
                      className="px-6 py-3 h-auto rounded-xl font-semibold"
                    >
                      Return to Hub <ArrowRight className="w-4 h-4 ml-2" />
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
