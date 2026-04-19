'use client';

import { useEffect } from 'react';
import { useExperienceStore } from '@/store/core/experienceStore';
import { useUserStore } from '@/store/core/userStore';
import { useRatingGameStore } from '@/store/rating/ratingStore';
import { useGenreOrchestrationStore } from '@/store/genre/genreOrchestrationStore';
import { useGenreRankingStore } from '@/store/genre/rankingStore';
import { useThemeStore } from '@/store/theme/themeStore';
import { GAME_PHASES } from '@/lib/gameTypes';
import { MOCK_RATING_MOVIES, MOCK_METRICS_RESPONSE } from '@/mocks/data';

/**
 * TestHarness Component
 *
 * Provides a professional API for E2E tests to "teleport" the application
 * into specific states without manual navigation.
 *
 * Only active in non-production environments or when ?debug=true is present.
 */
export const StateBridge = () => {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
      console.log('🧪 TEST HARNESS: Initialized');

      // Locally define the augmented window type to satisfy linter without global pollution if possible,
      // though global augmentation is already in the spec for Playwright.
      const harnessWindow = window as unknown as {
        __experience_store: typeof useExperienceStore;
        __user_store: typeof useUserStore;
        __rating_store: typeof useRatingGameStore;
        __genre_store: typeof useGenreOrchestrationStore;
        __theme_store: typeof useThemeStore;
        __test_harness: {
          reset: () => void;
          teleportToHub: (mode: 'empty' | 'partial' | 'full') => void;
          teleportToRating: (round?: number) => void;
          teleportToGenreResults: (step?: number) => void;
          teleportToGenreRanking: () => void;
        };
      };

      // Expose Raw Stores for low-level access
      harnessWindow.__experience_store = useExperienceStore;
      harnessWindow.__user_store = useUserStore;
      harnessWindow.__rating_store = useRatingGameStore;
      harnessWindow.__genre_store = useGenreOrchestrationStore;
      harnessWindow.__theme_store = useThemeStore;

      // Expose High-Level Teleportation API
      harnessWindow.__test_harness = {
        /**
         * Resets everything to a clean state
         */
        reset: () => {
          useExperienceStore.getState().resetExperience();
          useUserStore.getState().resetUser();
          useRatingGameStore.getState().resetGame();
          useGenreOrchestrationStore.getState().resetGenreGame();
          useThemeStore.getState().resetThemeExperience();
        },

        /**
         * Jumps to the Hub with various completion levels
         */
        teleportToHub: (mode: 'empty' | 'partial' | 'full' = 'partial') => {
          useUserStore.setState({
            username: 'test-harness-user',
            backgroundStatus: 'ready',
            hasStartedGame: true,
            userStats: MOCK_METRICS_RESPONSE.userStats || null,
          });

          if (mode === 'empty') {
            useExperienceStore.setState({
              currentPhase: GAME_PHASES.HUB,
              unlockedGames: [GAME_PHASES.RATING],
              completedGames: [],
            });
          } else if (mode === 'partial') {
            useExperienceStore.setState({
              currentPhase: GAME_PHASES.HUB,
              unlockedGames: [GAME_PHASES.RATING, GAME_PHASES.GENRE],
              completedGames: [GAME_PHASES.RATING],
              scores: { rating: 85, genre: 0, theme: 0, taste: 0, habits: 0 },
            });
          } else {
            useExperienceStore.setState({
              currentPhase: GAME_PHASES.HUB,
              unlockedGames: Object.values(GAME_PHASES),
              completedGames: Object.values(GAME_PHASES).filter((p) => p !== GAME_PHASES.HUB),
              scores: { rating: 85, genre: 70, theme: 90, taste: 80, habits: 60 },
            });
          }
        },

        /**
         * Jumps into the Rating Game
         */
        teleportToRating: (round: number = 1) => {
          useUserStore.setState({
            username: 'test-harness-user',
            backgroundStatus: 'ready',
            hasStartedGame: true,
          });

          useRatingGameStore.setState({
            movies: MOCK_RATING_MOVIES,
            currentRound: round,
            currentMovieIndex: round - 1,
            isGameOver: false,
          });

          useExperienceStore.setState({ currentPhase: GAME_PHASES.RATING });
        },

        /**
         * Jumps into Genre Game results
         */
        teleportToGenreResults: (step: number = 0) => {
          useUserStore.setState({
            username: 'test-harness-user',
            backgroundStatus: 'ready',
            hasStartedGame: true,
            hasSeenFakeScorePrank: true, // Bypass intro prank
            hasSeenSuccessDialog: true, // Bypass success dialog
            userStats: MOCK_METRICS_RESPONSE.userStats || null,
          });

          useGenreOrchestrationStore.setState({
            phase: 'post-game',
            postGameStep: step,
          });

          useExperienceStore.setState({ currentPhase: GAME_PHASES.GENRE });
        },

        /**
         * Jumps directly to Genre Ranking phase
         */
        teleportToGenreRanking: () => {
          useUserStore.setState({
            username: 'test-harness-user',
            backgroundStatus: 'ready',
            hasStartedGame: true,
          });
          useGenreRankingStore.getState().startGame({
            genres: [
              { id: '1', name: 'Action' },
              { id: '2', name: 'Comedy' },
              { id: '3', name: 'Drama' },
              { id: '4', name: 'Horror' },
              { id: '5', name: 'Sci-Fi' },
            ],
            actualRanking: ['1', '2', '3', '4', '5'],
            previousScore: 0,
          });

          useGenreOrchestrationStore.setState({
            phase: 'ranking',
          });

          useExperienceStore.setState({ currentPhase: GAME_PHASES.GENRE });
        },
      };
    }
  }, []);

  return null;
};
