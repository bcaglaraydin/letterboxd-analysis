import { create } from 'zustand';

export type GenrePhase = 'hub-intro' | 'ranking' | 'matching-intro' | 'matching' | 'post-game';

interface GenreOrchestrationState {
  phase: GenrePhase;
  rankingScore: number;
  matchingScore: number;
  postGameStep: number;

  // Actions
  setPhase: (phase: GenrePhase) => void;
  setRankingScore: (score: number) => void;
  setMatchingScore: (score: number) => void;
  setPostGameStep: (step: number) => void;
  resetGenreGame: () => void;
}

export const useGenreOrchestrationStore = create<GenreOrchestrationState>((set) => ({
  phase: 'hub-intro',
  rankingScore: 0,
  matchingScore: 0,
  postGameStep: 0,

  setPhase: (phase) => set({ phase }),
  setRankingScore: (rankingScore) => set({ rankingScore }),
  setMatchingScore: (matchingScore) => set({ matchingScore }),
  setPostGameStep: (postGameStep) => set({ postGameStep }),

  resetGenreGame: () =>
    set({
      phase: 'hub-intro',
      rankingScore: 0,
      matchingScore: 0,
      postGameStep: 0,
    }),
}));
