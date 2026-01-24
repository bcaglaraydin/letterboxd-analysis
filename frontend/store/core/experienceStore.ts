import { create } from 'zustand';
import { UserStats } from '../rating/ratingStore';
import { Genre } from '../genre/rankingStore';

export type GamePhase = 'rating-game' | 'hub' | 'genre-game';

interface GenreGameData {
  genres: Genre[];
  actualRanking: string[];
}

interface ExperienceState {
  currentPhase: GamePhase;
  scores: {
    rating: number;
    genre: number;
  };
  unlockedGames: string[];
  completedGames: string[];
  backgroundStatus: 'idle' | 'processing' | 'ready';
  username: string | null;

  // Actions
  completeRatingGame: (score: number) => void;
  startGenreGame: () => void;
  startRatingGame: () => void;
  completeGenreGame: (score: number) => void;
  resetExperience: () => void;
  setProcessing: (username: string) => void;
  setReady: () => void;
  pollBackgroundStatus: () => Promise<any>; // Returns full payload or null
  fetchFullStats: () => Promise<{ userStats: UserStats; genreGame: GenreGameData }>;
}

export const useExperienceStore = create<ExperienceState>((set, get) => ({
  currentPhase: 'rating-game',
  scores: {
    rating: 0,
    genre: 0,
  },
  unlockedGames: ['rating-game'],
  completedGames: [],
  backgroundStatus: 'idle',
  username: null,

  completeRatingGame: (score) =>
    set((state) => ({
      scores: { ...state.scores, rating: score },
      unlockedGames: [...new Set([...state.unlockedGames, 'genre-game'])],
      completedGames: [...new Set([...state.completedGames, 'rating-game'])],
      currentPhase: 'hub',
    })),

  startGenreGame: () =>
    set({
      currentPhase: 'genre-game',
    }),

  startRatingGame: () =>
    set({
      currentPhase: 'rating-game',
    }),

  completeGenreGame: (score) =>
    set((state) => ({
      scores: { ...state.scores, genre: score },
      completedGames: [...new Set([...state.completedGames, 'genre-game'])],
      currentPhase: 'hub',
    })),

  resetExperience: () =>
    set({
      currentPhase: 'rating-game',
      scores: { rating: 0, genre: 0 },
      unlockedGames: ['rating-game'],
      completedGames: [],
      backgroundStatus: 'idle',
      username: null,
    }),

  setProcessing: (username) => set({ backgroundStatus: 'processing', username }),
  setReady: () => set({ backgroundStatus: 'ready' }),

  pollBackgroundStatus: async () => {
    const { username, backgroundStatus } = get();
    if (!username || backgroundStatus !== 'processing') return null;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/metrics/status?username=${username}`);
      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Failed to check status:', err);
      return null;
    }
  },

  fetchFullStats: async () => {
    const { username } = get();
    if (!username) throw new Error('No username');

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const response = await fetch(`${apiUrl}/metrics/status?username=${username}`);
    const data = await response.json();
    return data;
  },
}));
