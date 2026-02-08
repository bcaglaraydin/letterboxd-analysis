import { create } from 'zustand';
import { genreToColor, calculateRankingScore } from '@/lib/gameUtils';

export interface Genre {
  id: string;
  name: string;
  averageRating?: number;
}

interface GenreGameState {
  // Game flow
  phase: 'ranking' | 'confirming' | 'reveal' | 'complete';

  // Genres
  genres: Genre[];
  userRanking: string[]; // Genre IDs in user's ranked order
  actualRanking: string[]; // Correct order (from backend)

  // Score
  previousScore: number; // Score from previous games
  currentScore: number; // Score for this game (0-100)

  // Actions
  startGame: (data: { genres: Genre[]; actualRanking: string[]; previousScore: number }) => void;
  setUserRanking: (ranking: string[]) => void;
  moveGenre: (fromIndex: number, toIndex: number) => void;
  confirmRanking: () => void;
  nextPhase: () => void;
  resetGame: () => void;
}

// Re-export utility function for backwards compatibility
export { genreToColor };

export const useGenreRankingStore = create<GenreGameState>((set, get) => ({
  phase: 'ranking',
  genres: [],
  userRanking: [],
  actualRanking: [],
  previousScore: 0,
  currentScore: 0,

  startGame: (data) => {
    // Shuffle genres for initial display
    const shuffled = [...data.genres].sort(() => Math.random() - 0.5);
    set({
      phase: 'ranking',
      genres: data.genres,
      userRanking: shuffled.map((g) => g.id), // Start with shuffled order
      actualRanking: data.actualRanking,
      previousScore: data.previousScore,
      currentScore: 0,
    });
  },

  setUserRanking: (ranking) => set({ userRanking: ranking }),

  moveGenre: (fromIndex, toIndex) => {
    const { userRanking } = get();
    const newRanking = [...userRanking];
    const [removed] = newRanking.splice(fromIndex, 1);
    newRanking.splice(toIndex, 0, removed);
    set({ userRanking: newRanking });
  },

  confirmRanking: () => {
    const { userRanking, actualRanking } = get();
    const score = calculateRankingScore(userRanking, actualRanking);
    set({
      phase: 'reveal',
      currentScore: score,
    });
  },

  nextPhase: () => {
    const { phase } = get();
    if (phase === 'ranking') set({ phase: 'confirming' });
    else if (phase === 'confirming') set({ phase: 'reveal' });
    else if (phase === 'reveal') set({ phase: 'complete' });
  },

  resetGame: () =>
    set({
      phase: 'ranking',
      genres: [],
      userRanking: [],
      actualRanking: [],
      currentScore: 0,
    }),
}));
