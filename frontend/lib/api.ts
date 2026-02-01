/**
 * API client for Letterboxd Analysis backend
 */

const getApiUrl = () => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Types for API responses
export interface RatingGameMovie {
  movieId: string;
  title: string;
  director: string;
  poster: string | null;
  userRating: number;
  communityRating: number;
  releaseYear: string;
  runtimeMinutes: number | null;
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
  guiltyPleasures: RatingGameMovie[];
  controversialPicks: RatingGameMovie[];
  genreOverview: GenreStat[];
}

export interface GenreStat {
  id: string;
  name: string;
  userAvgRating: number;
  communityAvgRating: number;
  userWatchCount: number;
  exampleMovies: {
    title: string;
    posterUrl: string;
  }[];
}

export interface Genre {
  id: string;
  name: string;
  averageRating?: number;
}

export interface GenreGameData {
  genres: Genre[];
  actualRanking: string[];
}

export interface RatingGameData {
  movies: RatingGameMovie[];
}

export type MetricsStatus = 'accepted' | 'processing' | 'partial_ready' | 'ready' | 'error';

export interface GenreMatchingRound {
  id: string;
  slug: string;
  title: string;
  posterUrl: string;
  year: number;
  correctGenres: string[];
  genreScoring: Record<string, { correct: number; penalty: number; missed?: number }>;
  theoreticalMax: number;
  director?: string;
}

export interface ScoringConfig {
  WEIGHTS: Record<string, number>;
  PENALTY_FACTOR: number;
}

export interface GenreMatchingGameData {
  rounds: GenreMatchingRound[];
  rarityMap: Record<string, string>;
  scoring: ScoringConfig;
  maxScorePerMovie: number;
}

export interface MetricsResponse {
  status: MetricsStatus;
  progress?: number;
  message?: string;
  ratingGame?: RatingGameData;
  genreGame?: GenreGameData;
  genreMatchingGame?: GenreMatchingGameData;
  userStats?: UserStats;
}

/**
 * Trigger metrics analysis for a username
 */
export async function triggerMetrics(username: string): Promise<MetricsResponse> {
  const shouldUseMock = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true';

  if (shouldUseMock) {
    const { triggerMetrics: mockTrigger } = await import('./mockApi');
    return mockTrigger(username);
  }

  const response = await fetch(`${getApiUrl()}/analysis`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: username.trim() }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch data');
  }

  return data;
}

/**
 * Poll for metrics status
 */
export async function pollMetricsStatus(
  username: string,
  minFilms: number = 5,
): Promise<MetricsResponse> {
  const shouldUseMock = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true';

  if (shouldUseMock) {
    const { pollMetricsStatus: mockPoll } = await import('./mockApi');
    return mockPoll(username, minFilms);
  }

  const response = await fetch(
    `${getApiUrl()}/analysis/status?username=${username}&minFilms=${minFilms}`,
  );
  const data = await response.json();
  return data;
}

/**
 * Fetch full stats (for PostGameScreen)
 */
export async function fetchFullStats(username: string): Promise<MetricsResponse> {
  const shouldUseMock = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true';

  if (shouldUseMock) {
    const { fetchFullStats: mockFetch } = await import('./mockApi');
    return mockFetch(username);
  }

  const response = await fetch(`${getApiUrl()}/analysis/status?username=${username}`);
  const data = await response.json();
  return data;
}
