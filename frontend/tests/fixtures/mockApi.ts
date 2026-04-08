import { Page, Route } from '@playwright/test';

// Common mock payloads
export const MOCK_USER_STATS = {
  totalMovies: 156,
  averageRating: 3.4,
  ratingDistribution: { '1': 0, '2': 10, '3': 50, '4': 70, '5': 26 },
  generosity: { median: 3.5, average: 3.4, stdDev: 0.8 },
  communityComparison: { averageCommunityRating: 3.6, averageUserRating: 3.4 },
  communityRatingDistribution: {},
  guiltyPleasures: [],
  controversialPicks: [],
  hotTakes: [],
  skepticPicks: [],
};

export const MOCK_RATING_MOVIES = [
  {
    movieId: '1',
    title: 'The Godfather',
    director: 'F.F. Coppola',
    poster: null,
    userRating: 4.5,
    communityRating: 4.6,
    releaseYear: '1972',
    runtimeMinutes: 175,
  },
  {
    movieId: '2',
    title: 'Inception',
    director: 'C. Nolan',
    poster: null,
    userRating: 4.0,
    communityRating: 4.2,
    releaseYear: '2010',
    runtimeMinutes: 148,
  },
];

/**
 * Mocks the `triggerMetrics` API
 */
export async function mockTriggerMetrics(
  page: Page,
  type: 'success' | 'user_not_found' | 'processing' | 'generic_error',
) {
  // Use regex to catch /analysis with or without trailing slash/query
  await page.route(/\/analysis(\/|\?|$)/, async (route: Route) => {
    switch (type) {
      case 'success':
        return route.fulfill({
          status: 200,
          json: {
            status: 'ready',
            ratingGame: { movies: MOCK_RATING_MOVIES },
            userStats: MOCK_USER_STATS,
          },
        });
      case 'user_not_found':
        return route.fulfill({
          status: 404,
          json: { status: 'error', error: 'User not found. Check if the profile is public.' },
        });
      case 'processing':
        return route.fulfill({
          status: 202,
          json: { status: 'accepted', message: 'Scraping started' },
        });
      case 'generic_error':
        return route.fulfill({
          status: 500,
          json: { status: 'error', error: 'An unexpected error occurred' },
        });
    }
  });
}

/**
 * Mocks the background polling endpoint `GET /api/analysis/status`
 */
export async function mockPollingStatus(
  page: Page,
  sequence: ('processing' | 'partial_ready' | 'ready')[],
) {
  let callCount = 0;
  await page.route(/\/analysis\/status(\/|\?|$)/, async (route: Route) => {
    const status = sequence[Math.min(callCount, sequence.length - 1)];
    callCount++;

    if (status === 'processing') {
      return route.fulfill({ status: 200, json: { status: 'processing' } });
    }
    if (status === 'partial_ready') {
      return route.fulfill({
        status: 200,
        json: {
          status: 'partial_ready',
          ratingGame: { movies: MOCK_RATING_MOVIES },
        },
      });
    }
    if (status === 'ready') {
      return route.fulfill({
        status: 200,
        json: {
          status: 'ready',
          userStats: MOCK_USER_STATS,
        },
      });
    }
  });
}
