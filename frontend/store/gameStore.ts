import { create } from "zustand";
import { calculateDistanceScore } from "@/hooks/useDistanceScore";
import { RATING_GAME_CONFIG } from "@/components/game/rating-game/constants";

export interface Movie {
  movieId: string;
  title: string;
  director: string;
  poster: string | null;
  userRating: number;
  communityRating: number;
  releaseYear: string;
  runtimeMinutes: number | null;
}

export interface GameTheme {
  name: string;
  bgGradient: string;
  accentColor: string;
  accentText: string;
  orb1Color: string;
  orb2Color: string;
  sliderColor: string;
  buttonColor: string;
}

export interface UserStats {
  totalMovies: number;
  averageRating: number;
  ratingDistribution: Record<string, number>;
  generosity: {
    median: number;
    average: number;
    stdDev: number;
  };
  communityComparison: {
    averageCommunityRating: number;
    averageUserRating: number;
  };
  communityRatingDistribution: Record<string, number>;
  guiltyPleasures: Movie[];
  controversialPicks: Movie[];
}

interface RoundResult {
  round: number;
  score: number;
}

interface GameState {
  currentRound: number;
  totalRounds: number;
  score: number;
  roundScore: number | null; // Score for the just-completed round
  history: RoundResult[];

  movies: Movie[];
  currentMovieIndex: number;
  isGameOver: boolean;

  userStats: UserStats | null;

  theme: GameTheme;

  // Actions
  setMovies: (movies: Movie[]) => void;
  setTheme: (theme: GameTheme) => void;
  submitGuess: (guess: number) => void;
  nextRound: () => void;
  resetGame: () => void;
  startGame: (data: { movies: Movie[]; userStats: UserStats }) => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  currentRound: 1,
  totalRounds: RATING_GAME_CONFIG.TOTAL_ROUNDS,
  score: 0,
  roundScore: null,
  history: [],

  movies: [],
  currentMovieIndex: 0,
  isGameOver: false,

  userStats: null,

  theme: {
    name: "Natural",
    bgGradient: "from-primary/5 via-background to-background",
    accentColor: "bg-accent",
    accentText: "text-accent",
    orb1Color: "bg-primary/20",
    orb2Color: "bg-accent/20",
    sliderColor: "bg-primary",
    buttonColor: "bg-primary hover:bg-primary/90 text-primary-foreground",
  },

  setMovies: (movies) => set({ movies }),

  setTheme: (theme) => set({ theme }),

  startGame: (data) => {
    set({
      movies: data.movies,
      userStats: data.userStats,
      currentRound: 1,
      score: 0,
      roundScore: null,
      history: [],
      currentMovieIndex: 0,
      isGameOver: false,
    });
  },

  submitGuess: (guess) => {
    const { movies, currentMovieIndex, score, history, currentRound } = get();
    const currentMovie = movies[currentMovieIndex];

    // Scoring Logic using distance-based formula
    const diff = Math.abs(guess - currentMovie.userRating);
    const points = calculateDistanceScore(
      diff,
      RATING_GAME_CONFIG.MAX_SCORE,
      RATING_GAME_CONFIG.MAX_DISTANCE,
    );

    set({
      score: score + points,
      roundScore: points,
      history: [...history, { round: currentRound, score: points }],
    });
  },

  nextRound: () => {
    const { currentRound, totalRounds, currentMovieIndex } = get();
    if (currentRound >= totalRounds) {
      set({ isGameOver: true });
    } else {
      set({
        currentRound: currentRound + 1,
        currentMovieIndex: currentMovieIndex + 1,
        roundScore: null,
      });
    }
  },

  resetGame: () =>
    set({
      currentRound: 1,
      score: 0,
      roundScore: null,
      history: [],
      currentMovieIndex: 0,
      isGameOver: false,
    }),
}));
