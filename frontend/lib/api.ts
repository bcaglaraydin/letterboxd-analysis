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

export type MetricsStatus = 'processing' | 'partial_ready' | 'ready' | 'error';

export interface MetricsResponse {
  status: MetricsStatus;
  progress?: number;
  message?: string;
  ratingGame?: RatingGameData;
  genreGame?: GenreGameData;
  userStats?: UserStats;
}

/**
 * Trigger metrics analysis for a username
 */
export async function triggerMetrics(username: string): Promise<MetricsResponse> {
  const response = await fetch(`${getApiUrl()}/metrics`, {
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
  const response = await fetch(
    `${getApiUrl()}/metrics/status?username=${username}&minFilms=${minFilms}`,
  );
  const data = await response.json();
  return data;
}

/**
 * Fetch full stats (for PostGameScreen)
 */
export async function fetchFullStats(username: string): Promise<MetricsResponse> {
  const response = await fetch(`${getApiUrl()}/metrics/status?username=${username}`);
  const data = await response.json();
  return data;
}
