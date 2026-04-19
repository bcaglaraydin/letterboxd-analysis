/**
 * API client for Letterboxd Analysis backend
 */

const getApiUrl = () => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const shouldUseMock = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true';

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

export interface GenreInsight {
  type: string;
  text: string;
  genreId?: string;
}

export interface TopActor {
  name: string;
  count: number;
  movies: { title: string; posterUrl: string }[];
  photoUrl: string | null;
}

export interface DurationBatch {
  id: string;
  label: string;
  avgRating: number;
  watchCount: number;
  minDuration: number;
  maxDuration: number | null;
}

export interface DurationDistributionGraph {
  id: string;
  isActual: boolean;
  batches: DurationBatch[];
}

export interface CountryStat {
  name: string;
  slug: string;
  watchCount: number;
  avgRating: number;
  topMovies: { title: string; posterUrl: string }[];
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
  hotTakes: RatingGameMovie[];
  skepticPicks: RatingGameMovie[];
  comparisonMovies?: RatingGameMovie[];
  genreOverview: GenreStat[];
  genreInsights?: GenreInsight[];
  topActors?: TopActor[];
  durationDistribution?: DurationDistributionGraph[];
  countryStats?: CountryStat[];
}

export type GenreBubbleTagType = 'hidden_gem' | 'comfort_zone' | 'true_love';

export interface GenreBubbleTag {
  type: GenreBubbleTagType;
  label: string;
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
  /** Optional tag for interesting bubbles - provided by backend */
  tag?: GenreBubbleTag;
}

export interface Genre {
  id: string;
  name: string;
  averageRating?: number;
  tier: GenreTier;
}

// Keep explicit types here to avoid circular dependency with components
export type GenreTier = 'niche' | 'mid-tier' | 'popular';

export interface GenreGameData {
  genres: Genre[];
  actualRanking: string[];
}

export interface RatingGameData {
  movies: RatingGameMovie[];
}

export type MetricsStatus =
  | 'accepted'
  | 'processing'
  | 'partial_ready'
  | 'ready'
  | 'error'
  | 'not_found';

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

export interface ThemeGameRound {
  id: string;
  themes: string[];
  userRating: number | null;
  genres: string[];
  correctMovie: {
    title: string;
    year: number;
    director: string;
    posterUrl: string;
  };
}
export type ThemeSortingType = 'favorite' | 'least_favorite';

export interface ThemeSortingRound {
  id: string;
  theme: string;
  averageRating: number;
  type: ThemeSortingType;
  topMovies?: {
    title: string;
    posterUrl: string;
  }[];
}

export interface TasteMovieData {
  id: string;
  title: string;
  posterUrl: string;
  popularity: number;
  userRating: number;
  communityRating: number;
  ratingDiff: number;
  divergence: number;
}

export interface TasteGameData {
  movies: TasteMovieData[];
  actualPopularity: number;
  actualAlignment: number;
}

export interface ThemeGameData {
  rounds: ThemeGameRound[];
  sortingRounds: ThemeSortingRound[];
}

export interface MetricsResponse {
  status: MetricsStatus;
  progress?: number;
  message?: string;
  ratingGame?: RatingGameData;
  genreGame?: GenreGameData;
  genreMatchingGame?: GenreMatchingGameData;
  themeGame?: ThemeGameData;
  tasteGame?: TasteGameData;
  userStats?: UserStats;
}

// Define the interface for our Data Provider
interface DataProvider {
  triggerMetrics(username: string): Promise<MetricsResponse>;
  pollMetricsStatus(username: string, minFilms?: number): Promise<MetricsResponse>;
  fetchFullStats(username: string): Promise<MetricsResponse>;
}

// Real API Implementation
const RealApiProvider: DataProvider = {
  async triggerMetrics(username: string) {
    // 1. Handshake: Get short-lived token
    let token = '';
    try {
      const authResponse = await fetch(`${getApiUrl()}/auth/token`);
      if (authResponse.ok) {
        const authData = await authResponse.json();
        token = authData.token;
      }
    } catch (err) {
      console.warn('Auth handshake failed, proceeding without token...', err);
    }

    // 2. Main Request: POST /analysis with token
    const response = await fetch(`${getApiUrl()}/analysis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ username: username.trim() }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch data');
    }

    return data;
  },

  async pollMetricsStatus(username: string, minFilms: number = 5) {
    const response = await fetch(
      `${getApiUrl()}/analysis/status?username=${username}&minFilms=${minFilms}`,
    );
    const data = await response.json();
    return data;
  },

  async fetchFullStats(username: string) {
    const response = await fetch(`${getApiUrl()}/analysis/status?username=${username}`);
    const data = await response.json();
    return data;
  },
};

// Mock API Loader (lazy loaded to save bundle size in prod)
const getMockProvider = async (): Promise<DataProvider> => {
  const mockApi = await import('./mockApi');
  return {
    triggerMetrics: mockApi.triggerMetrics,
    pollMetricsStatus: mockApi.pollMetricsStatus,
    fetchFullStats: mockApi.fetchFullStats,
  };
};

// Facade Methodology
export async function triggerMetrics(username: string): Promise<MetricsResponse> {
  if (shouldUseMock) {
    const provider = await getMockProvider();
    return provider.triggerMetrics(username);
  }
  return RealApiProvider.triggerMetrics(username);
}

export async function pollMetricsStatus(
  username: string,
  minFilms: number = 5,
): Promise<MetricsResponse> {
  if (shouldUseMock) {
    const provider = await getMockProvider();
    return provider.pollMetricsStatus(username, minFilms);
  }
  return RealApiProvider.pollMetricsStatus(username, minFilms);
}

export async function fetchFullStats(username: string): Promise<MetricsResponse> {
  if (shouldUseMock) {
    const provider = await getMockProvider();
    return provider.fetchFullStats(username);
  }
  return RealApiProvider.fetchFullStats(username);
}
