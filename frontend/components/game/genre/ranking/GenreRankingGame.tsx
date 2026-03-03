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

import { DraggableRankingList } from './DraggableRankingList';
import { ActualRankingColumn } from './ActualRankingColumn';
import { useRevealAnimation } from './useRevealAnimation';
import { Button } from '@/components/ui/button';
// import { MOCK_GENRE_STATS } from '@/mocks/data';

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
  /*
  useEffect(() => {
    if (genres.length === 0 && phase === "intro") {
      const mockGenres = MOCK_GENRE_STATS.map(g => ({ id: g.id, name: g.name }));
      const actualOrder = MOCK_GENRE_STATS.map((g) => g.id); // Or utilize actualRanking from mock if available
      startGame({
        genres: mockGenres,
        actualRanking: actualOrder,
        previousScore: 150,
      });
    }
  }, [genres.length, phase, startGame]);
  */
  // Ranking Phase OR Reveal Phase
  const getGenre = (id: string) => genres.find((g) => g.id === id);

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
          className="w-full max-w-7xl mx-auto"
          top={
            <div className="flex justify-between items-start p-4 md:p-8 w-full relative z-[60]">
              <GameRoundIndicator major={1} majorTotal={2} />
              {isRevealing ? (
                /* Score display during reveal */
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
                  className="mb-0"
                />
              ) : (
                /* Spacer to maintain height if needed, or just empty */
                <div />
              )}
            </div>
          }
          middle={
            <div className="w-full max-w-[57.5rem] flex-1 min-h-0 mx-auto flex flex-col justify-center px-4 md:px-8 py-2 md:py-6">
              {/* Header: Moved to Middle for better proximity */}
              {!isRevealing && (
                <motion.div className="text-center mb-6 md:mb-10" layout="position">
                  <motion.h2
                    className="text-2xl md:text-4xl font-serif font-bold text-foreground drop-shadow-sm"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    How would you rank your genres?
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
                  className={`w-full grid gap-1.5 md:gap-6 ${showTwoColumns ? 'grid-cols-2' : 'grid-cols-1 max-w-md mx-auto'}`}
                  layout
                  transition={{
                    type: 'tween',
                    duration: 2,
                    ease: [0.25, 0.1, 0.25, 1],
                  }}
                >
                  <motion.div
                    layout
                    className="w-full flex flex-col relative"
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
                      <div className="flex flex-col gap-1.5 md:gap-3 w-full">
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
                      className="w-full md:w-auto h-12 md:h-14 px-8 md:px-12 rounded-xl text-base md:text-lg font-bold tracking-widest uppercase shadow-lg hover:shadow-xl hover:-translate-y-0.5 md:hover:-translate-y-1 transform duration-200"
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
                      className="w-full md:w-auto h-12 md:h-14 px-8 md:px-12 rounded-xl text-base md:text-lg font-bold tracking-widest uppercase shadow-lg hover:shadow-xl hover:-translate-y-0.5 md:hover:-translate-y-1 transform duration-200"
                    >
                      Continue <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </motion.div>
                )}
              </div>
            </div>
          }
          bottom={
            <div className="md:hidden w-full max-w-sm mx-auto px-4 pb-6 pt-2">
              <div className="w-full">
                {!isRevealing && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <Button
                      onClick={confirmRanking}
                      className="w-full h-12 md:h-14 px-8 md:px-12 rounded-xl text-base md:text-lg font-bold tracking-widest uppercase shadow-lg hover:shadow-xl hover:-translate-y-0.5 md:hover:-translate-y-1 transform duration-200"
                    >
                      <Lock className="w-4 h-4 mr-2" />
                      Lock It In
                    </Button>
                  </motion.div>
                )}

                {isComplete && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <Button
                      onClick={() => onGameComplete(totalScore)}
                      className="w-full h-12 md:h-14 px-8 md:px-12 rounded-xl text-base md:text-lg font-bold tracking-widest uppercase shadow-lg hover:shadow-xl hover:-translate-y-0.5 md:hover:-translate-y-1 transform duration-200"
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
