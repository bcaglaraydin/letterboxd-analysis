'use client';

import React, { useState } from 'react';
import { useExperienceStore } from '@/store/core/experienceStore';
import { useRatingGameStore } from '@/store/rating/ratingStore';
import { useUserStore } from '@/store/core/userStore';
import { useGenreOrchestrationStore, GenrePhase } from '@/store/genre/genreOrchestrationStore';
import { useGenreRankingStore } from '@/store/genre/rankingStore';
import { useThemeStore } from '@/store/theme/themeStore';
import { useTasteStore } from '@/store/taste/tasteStore';
import { GAME_PHASES } from '@/lib/gameTypes';
import { Bug, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { MOCK_METRICS_RESPONSE, MOCK_RATING_MOVIES } from '@/mocks/data';

export const DebugControls = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { currentPhase, startRatingGame, startGenreGame, resetExperience, startTastePositioning } =
    useExperienceStore();
  const { phase: genrePhase, setPhase: setGenrePhase } = useGenreOrchestrationStore();
  const router = useRouter();

  // Fix hydration mismatch
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isEnabled = React.useMemo(() => {
    if (typeof window === 'undefined') return false;
    return process.env.NODE_ENV === 'development';
  }, []);

  const handleAction = (action: () => void) => {
    ensureDebugState();
    action();

    // SPA mechanism: force the orchestrator to render
    useUserStore.getState().setStartedGame(true);
  };

  const ensureDebugState = () => {
    const state = useUserStore.getState();
    if (!state.username) {
      useUserStore.setState({
        username: 'debug-user',
        backgroundStatus: 'ready',
      });
    }
  };

  if (!mounted || !isEnabled) return null;

  return (
    <div id="debug-controls" className="fixed bottom-4 left-4 z-[100] font-mono text-xs">
      <div
        className="bg-black/80 text-white rounded-md overflow-hidden shadow-xl border border-white/10 backdrop-blur-sm transition-all duration-300"
        style={{ width: isOpen ? '280px' : '40px', height: isOpen ? 'auto' : '40px' }}
      >
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full h-10 flex items-center justify-center hover:bg-white/10"
        >
          {isOpen ? <ChevronDown size={16} /> : <Bug size={16} />}
        </button>

        {isOpen && (
          <div className="p-4 space-y-4">
            <div>
              <h3 className="text-gray-400 mb-2 font-bold uppercase">Game Phase</h3>
              <div className="flex flex-col gap-1">
                <div className="text-[10px] text-gray-500 mb-1">Current: {currentPhase}</div>
                <button
                  onClick={() => {
                    useGenreOrchestrationStore.getState().resetGenreGame();
                    useThemeStore.getState().resetThemeExperience();
                    resetExperience();
                    useUserStore.getState().resetUser();
                    router.push('/');
                  }}
                  className="px-2 py-1 bg-red-900/50 hover:bg-red-900/80 rounded text-left"
                >
                  Reset Experience
                </button>
                <div className="grid grid-cols-1 gap-1">
                  <button
                    onClick={() =>
                      handleAction(() => {
                        const ratingStore = useRatingGameStore.getState();
                        if (ratingStore.movies.length === 0) {
                          // Seed with mock data if empty
                          ratingStore.setMovies(MOCK_RATING_MOVIES);
                        }
                        // Reset game state
                        ratingStore.resetGame();

                        // Force Unmount/Remount cycle to reset local state (showIntro)
                        // This prevents the game from staying on the "Game Board" view if we are already in RATING phase
                        useExperienceStore.setState({ currentPhase: null });
                        setTimeout(() => {
                          startRatingGame();
                        }, 10);
                      })
                    }
                    className="px-2 py-1 bg-green-900/50 hover:bg-green-900/80 rounded text-left text-xs"
                  >
                    Skip to Rating Game (Mock Data)
                  </button>
                  <button
                    onClick={() =>
                      handleAction(() => {
                        useExperienceStore.getState().completeRatingGame(100);
                      })
                    }
                    className="px-2 py-1 bg-blue-900/50 hover:bg-blue-900/80 rounded text-left"
                  >
                    Complete Rating (Skip)
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-1 mt-1">
                  <button
                    onClick={() =>
                      handleAction(() => {
                        useExperienceStore.setState({ currentPhase: GAME_PHASES.RATING });
                        useRatingGameStore.setState({ isGameOver: true, score: 85 });
                      })
                    }
                    className="px-2 py-1 bg-purple-900/50 hover:bg-purple-900/80 rounded text-left text-[10px]"
                  >
                    Results (High)
                  </button>
                  <button
                    onClick={() =>
                      handleAction(() => {
                        useExperienceStore.setState({ currentPhase: GAME_PHASES.RATING });
                        useRatingGameStore.setState({ isGameOver: true, score: 40 });
                      })
                    }
                    className="px-2 py-1 bg-purple-900/50 hover:bg-purple-900/80 rounded text-left text-[10px]"
                  >
                    Results (Low)
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-1">
                  <button
                    onClick={() =>
                      handleAction(() => {
                        useGenreOrchestrationStore.getState().resetGenreGame();
                        const rankingStore = useGenreRankingStore.getState();
                        if (rankingStore.genres.length === 0) {
                          rankingStore.startGame({
                            genres: MOCK_METRICS_RESPONSE.genreGame?.genres || [],
                            actualRanking: MOCK_METRICS_RESPONSE.genreGame?.actualRanking || [],
                            previousScore: 0,
                          });
                        }
                        startGenreGame();
                      })
                    }
                    className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-left"
                  >
                    Start Genre
                  </button>
                  <button
                    onClick={() =>
                      handleAction(() => {
                        useExperienceStore.getState().completeGenreGame(100);
                      })
                    }
                    className="px-2 py-1 bg-blue-900/50 hover:bg-blue-900/80 rounded text-left"
                  >
                    Skip Genre
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-1">
                  <button
                    onClick={() =>
                      handleAction(() => {
                        useThemeStore.getState().resetThemeExperience();
                        useExperienceStore.getState().startThemeExperience();
                      })
                    }
                    className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-left"
                  >
                    Start Theme
                  </button>
                  <button
                    onClick={() =>
                      handleAction(() => {
                        useExperienceStore.getState().completeThemeExperience(0);
                      })
                    }
                    className="px-2 py-1 bg-blue-900/50 hover:bg-blue-900/80 rounded text-left"
                  >
                    Skip Theme
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-1">
                  <button
                    onClick={() =>
                      handleAction(() => {
                        useTasteStore.getState().resetTasteGame();
                        startTastePositioning();
                      })
                    }
                    className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-left"
                  >
                    Start Taste
                  </button>
                  <button
                    onClick={() =>
                      handleAction(() => {
                        useExperienceStore.getState().completeTastePositioning(100);
                      })
                    }
                    className="px-2 py-1 bg-blue-900/50 hover:bg-blue-900/80 rounded text-left"
                  >
                    Skip Taste
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-1">
                  <button
                    onClick={() =>
                      handleAction(() => {
                        const { initThemeGame, sortingRounds } = useThemeStore.getState();
                        if (sortingRounds.length === 0) {
                          initThemeGame([], MOCK_METRICS_RESPONSE.themeGame?.sortingRounds || []);
                        }
                        useThemeStore.setState({ phase: 'sorting' });
                        useExperienceStore.setState({ currentPhase: GAME_PHASES.THEME });
                      })
                    }
                    className="px-2 py-1 bg-purple-900/50 hover:bg-purple-900/80 rounded text-left"
                  >
                    Jump to Theme Sorting
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-1 mt-2">
                  <button
                    onClick={() =>
                      handleAction(() => {
                        useExperienceStore.setState({ currentPhase: GAME_PHASES.HABITS });
                      })
                    }
                    className="px-2 py-1 bg-orange-900/50 hover:bg-orange-900/80 rounded text-left"
                  >
                    Jump to Viewing Habits
                  </button>
                </div>
              </div>
            </div>

            {currentPhase === GAME_PHASES.GENRE && (
              <div>
                <h3 className="text-gray-400 mb-2 font-bold uppercase">Genre Phase</h3>
                <div className="flex flex-col gap-1">
                  <div className="text-[10px] text-gray-500 mb-1">Current: {genrePhase}</div>
                  {(['ranking', 'matching', 'post-game'] as GenrePhase[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => {
                        handleAction(() => setGenrePhase(p));
                      }}
                      className={`px-2 py-1 rounded text-left ${
                        genrePhase === p
                          ? 'bg-green-900/50 text-green-200'
                          : 'bg-gray-800 hover:bg-gray-700'
                      }`}
                    >
                      Jump to {p}
                    </button>
                  ))}

                  {genrePhase === 'post-game' && (
                    <div className="mt-2 pl-2 border-l border-gray-700 space-y-1">
                      <div className="text-[10px] text-gray-500">Post-Game View</div>
                      <button
                        onClick={() => {
                          handleAction(() => {
                            setGenrePhase('post-game');
                            useGenreOrchestrationStore.getState().setPostGameStep(0);
                          });
                        }}
                        className="w-full px-2 py-1 bg-blue-900/40 hover:bg-blue-900/60 rounded text-left text-xs"
                      >
                        ↳ Bubbles
                      </button>
                      <button
                        onClick={() => {
                          handleAction(() => {
                            setGenrePhase('post-game');
                            useGenreOrchestrationStore.getState().setPostGameStep(1);
                          });
                        }}
                        className="w-full px-2 py-1 bg-blue-900/40 hover:bg-blue-900/60 rounded text-left text-xs"
                      >
                        ↳ Taste Gap
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {currentPhase === GAME_PHASES.THEME && (
              <div>
                <h3 className="text-gray-400 mb-2 font-bold uppercase mt-4 border-t border-gray-700 pt-3">
                  Theme Phase
                </h3>
                <div className="flex flex-col gap-1">
                  <div className="text-[10px] text-gray-500 mb-1">
                    Current: {useThemeStore.getState().phase}
                  </div>
                  {(['intro', 'guessing', 'sorting', 'results'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => handleAction(() => useThemeStore.setState({ phase: p }))}
                      className="px-2 py-1 rounded text-left bg-gray-800 hover:bg-gray-700"
                    >
                      Jump to {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {currentPhase === GAME_PHASES.TASTE_POSITIONING && (
              <div>
                <h3 className="text-gray-400 mb-2 font-bold uppercase mt-4 border-t border-gray-700 pt-3">
                  Taste Phase
                </h3>
                <div className="flex flex-col gap-1">
                  <div className="text-[10px] text-gray-500 mb-1">
                    Current Step: {useTasteStore.getState().step}
                  </div>
                  {([1, 2, 3] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => handleAction(() => useTasteStore.getState().setStep(s))}
                      className="px-2 py-1 rounded text-left bg-gray-800 hover:bg-gray-700"
                    >
                      Jump to Step {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {currentPhase === GAME_PHASES.HABITS && (
              <div>
                <h3 className="text-gray-400 mb-2 font-bold uppercase mt-4 border-t border-gray-700 pt-3">
                  Habits Phase
                </h3>
                <div className="flex flex-col gap-1">
                  <div className="text-[10px] text-gray-500 mb-1">
                    Current: {useExperienceStore.getState().habitsPhase}
                  </div>
                  {(['intro', 'actor', 'duration', 'map-intro', 'map'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() =>
                        handleAction(() =>
                          useExperienceStore.setState({
                            currentPhase: GAME_PHASES.HABITS,
                            habitsPhase: p,
                          }),
                        )
                      }
                      className="px-2 py-1 rounded text-left bg-gray-800 hover:bg-gray-700"
                    >
                      Jump to {p}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
