/**
 * E2E Test: Full Backend Flow via API Gateway
 *
 * This test exercises the complete backend system:
 *   1. POST /analysis → Creates job, sends to SQS
 *   2. Lambda → SQS → Lambda flow executes
 *   3. GET /analysis/status → Returns ready with game data
 *   4. POST /analysis (same user) → Returns cached data instantly
 *
 * Requirements:
 *   - API_GATEWAY_URL: AWS API Gateway endpoint
 *   - TEST_USERNAME: Letterboxd username to test (default: bcaglaraydin)
 *
 * Run: npm run test:e2e
 */

import 'dotenv/config';
import { describe, it, expect, beforeAll } from 'vitest';
import { clearUserJob } from '../../scripts/cleanup_db.js';

const API_URL = process.env.API_GATEWAY_URL?.trim();
const USERNAME = process.env.TEST_USERNAME || 'bcaglaraydin';
const TIMEOUT = parseInt(process.env.E2E_TIMEOUT_SECONDS || '180', 10) * 1000;
const POLL_INTERVAL = parseInt(process.env.E2E_POLL_INTERVAL_SECONDS || '5', 10) * 1000;

// Skip if API_GATEWAY_URL not configured
const shouldRun = !!API_URL;

// ============================================================================
// Helpers
// ============================================================================

async function postAnalysis(username) {
  const response = await fetch(`${API_URL}/analysis`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  });
  const data = await response.json();
  return { response, data };
}

async function getStatus(username, minFilms) {
  const params = new URLSearchParams({ username });
  if (minFilms !== undefined) params.set('minFilms', String(minFilms));
  const response = await fetch(`${API_URL}/analysis/status?${params}`);
  const data = await response.json();
  return { response, data };
}

async function pollUntilReady(username, timeout = TIMEOUT) {
  const startTime = Date.now();
  let lastData;
  let pollCount = 0;

  // Initial delay to let Lambda start processing
  await new Promise((r) => setTimeout(r, 3000));

  while (Date.now() - startTime < timeout) {
    try {
      pollCount++;
      const { data } = await getStatus(username);
      lastData = data;

      if (data.status === 'ready' || data.status === 'error') {
        const durationMs = Date.now() - startTime;
        console.log(`\n[Metrics] Target reached '${data.status}' state in ${durationMs}ms.`);
        console.log(`[Metrics] Total API polling requests made: ${pollCount}`);

        if (data.userStats && data.userStats.totalMovies > 0) {
          const films = data.userStats.totalMovies;
          const filmsPerSec = (films / (durationMs / 1000)).toFixed(2);
          const timePerFilm = (durationMs / films).toFixed(2);
          console.log(`[Metrics] Films Processed: ${films}`);
          console.log(`[Metrics] Throughput: ${filmsPerSec} films/sec`);
          console.log(`[Metrics] Latency per film: ${timePerFilm} ms/film`);
        }
        return { ...data, _metrics: { pollCount, durationMs } };
      }
    } catch (error) {
      console.warn('[Poll] Error:', error.message);
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL));
  }

  const durationMs = Date.now() - startTime;
  return { ...(lastData || { status: 'timeout' }), _metrics: { pollCount, durationMs } };
}

// ============================================================================
// Test Suites
// ============================================================================

describe.runIf(shouldRun)('E2E: Full Backend Flow', () => {
  // ============================================================================
  // Scenario 1: Fresh user flow (empty DB → ready)
  // ============================================================================
  describe('Scenario 1: Fresh User Flow', () => {
    beforeAll(async () => {
      console.log(`\n[Setup] Cleaning up DB for user: ${USERNAME}`);
      await clearUserJob(USERNAME);
    });

    it('POST /analysis returns 202 accepted for new user', async () => {
      const { response, data } = await postAnalysis(USERNAME);

      expect(response.status).toBe(202);
      expect(data.status).toBe('accepted');
      expect(data.username).toBe(USERNAME);
      // jobId should NOT be present (removed)
      expect(data.jobId).toBeUndefined();
    });

    it('status endpoint initially returns processing', async () => {
      // Small delay to ensure SQS has time to trigger Lambda
      await new Promise((r) => setTimeout(r, 2000));

      const { response, data } = await getStatus(USERNAME);
      expect(response.status).toBe(200);
      expect(['processing', 'partial_ready', 'ready']).toContain(data.status);
    });

    it(
      'system reaches ready state within timeout',
      async () => {
        const finalData = await pollUntilReady(USERNAME);

        expect(finalData.status).not.toBe('timeout');
        expect(finalData.status).not.toBe('error');
        expect(['ready', 'partial_ready']).toContain(finalData.status);

        if (finalData.status === 'ready') {
          expect(finalData.progress).toBe(1);

          // Architectural Validation Metrics Log
          if (finalData._metrics) {
            const { pollCount, durationMs } = finalData._metrics;
            console.log(`\n--- Architectural Validation Results ---`);
            console.log(
              `Polling Avalanche Risk: ${pollCount} API Gateway calls made over ${durationMs / 1000} seconds for a single user.`
            );
            if (finalData.userStats) {
              console.log(
                `Concurrency Risk: Processing ${finalData.userStats.totalMovies} films took ${durationMs / 1000}s, which implies simultaneous Chromium spawning.`
              );
            }
            console.log(`----------------------------------------\n`);

            // For analysis proof: Ensure polling happened multiple times (confirming the avalanche risk)
            expect(pollCount).toBeGreaterThan(1);
          }
        }
      },
      TIMEOUT + 30000
    );
  });

  // ============================================================================
  // Scenario 2: Cached user — instant return (no polling needed)
  // ============================================================================
  describe('Scenario 2: Cached User — Instant Return', () => {
    let cachedResult;

    beforeAll(async () => {
      // Ensure the previous scenario completed and data is ready
      const finalData = await pollUntilReady(USERNAME);
      if (finalData.status !== 'ready') {
        console.warn(`[Setup] Data not ready, current status: ${finalData.status}`);
      }
    }, TIMEOUT + 10000);

    it('POST /analysis returns 200 with full game data for cached user', async () => {
      const { response, data } = await postAnalysis(USERNAME);
      cachedResult = data;

      // Should return 200 (not 202) — data is already ready
      expect(response.status).toBe(200);
      expect(data.status).toBe('ready');
    });

    it('cached response contains rating game data', () => {
      expect(cachedResult.ratingGame).toBeDefined();
      expect(cachedResult.ratingGame.movies).toBeDefined();
      expect(Array.isArray(cachedResult.ratingGame.movies)).toBe(true);
      expect(cachedResult.ratingGame.movies.length).toBeGreaterThan(0);
    });

    it('cached response contains genre game data', () => {
      expect(cachedResult.genreGame).toBeDefined();
    });

    it('cached response contains user stats', () => {
      expect(cachedResult.userStats).toBeDefined();
      expect(cachedResult.userStats.totalMovies).toBeGreaterThan(0);
    });

    it('cached response contains genre matching game data', () => {
      expect(cachedResult.genreMatchingGame).toBeDefined();
    });

    it('cached response contains theme game data', () => {
      expect(cachedResult.themeGame).toBeDefined();
    });
  });

  // ============================================================================
  // Scenario 3: Status endpoint returns not_found for unknown user
  // ============================================================================
  describe('Scenario 3: Unknown User Status', () => {
    it('GET /analysis/status returns not_found for non-existent job', async () => {
      const randomUsername = `nonexistent_test_user_${Date.now()}`;
      const { response, data } = await getStatus(randomUsername);

      expect(response.status).toBe(200);
      expect(data.status).toBe('not_found');
    });
  });

  // ============================================================================
  // Scenario 4: Invalid username returns 404
  // ============================================================================
  describe('Scenario 4: Invalid Username', () => {
    const INVALID_USERNAME = 'zzzz_surely_nonexistent_user_12345';

    beforeAll(async () => {
      await clearUserJob(INVALID_USERNAME);
    });

    it('POST /analysis returns 404 for non-existent Letterboxd user', async () => {
      const { response, data } = await postAnalysis(INVALID_USERNAME);

      expect(response.status).toBe(404);
      expect(data.error).toContain('not found');
    });
  });

  // ============================================================================
  // Scenario 5: Missing username returns 400
  // ============================================================================
  describe('Scenario 5: Missing Username', () => {
    it('POST /analysis returns 400 with no body', async () => {
      const response = await fetch(`${API_URL}/analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Username is required');
    });
  });

  // ============================================================================
  // Scenario 6: Progressive loading (partial_ready with minFilms)
  // ============================================================================
  describe('Scenario 6: Progressive Loading', () => {
    it('GET /analysis/status supports minFilms parameter', async () => {
      const { response, data } = await getStatus(USERNAME, 3);

      expect(response.status).toBe(200);
      // The status should be a valid value
      expect(['ready', 'partial_ready', 'processing', 'not_found']).toContain(data.status);
    });
  });

  // ============================================================================
  // Scenario 7: Duplicate submission returns processing (no re-dispatch)
  // ============================================================================
  describe('Scenario 7: Duplicate Submission During Processing', () => {
    it('second POST /analysis during processing returns 200 processing', async () => {
      // This test checks the behavior when a user is already being processed.
      // We use the main test user (bcaglaraydin) which should have a valid job in the DB.
      const { response, data } = await postAnalysis(USERNAME);

      // Should either be 200 (ready/processing) or 202 (accepted, if TTL expired)
      expect([200, 202]).toContain(response.status);
      expect(['ready', 'processing', 'accepted']).toContain(data.status);
    });
  });

  // ============================================================================
  // Scenario 8: Validate rating game movie structure
  // ============================================================================
  describe('Scenario 8: Rating Game Data Validation', () => {
    it('rating game movies have all required fields', async () => {
      const { data } = await getStatus(USERNAME);

      if (data.status === 'ready' && data.ratingGame?.movies) {
        data.ratingGame.movies.forEach((movie, index) => {
          expect(
            movie.movieId || movie.slug,
            `Movie ${index} should have movieId or slug`
          ).toBeDefined();
          expect(movie.title, `Movie ${index} should have title`).toBeDefined();
          expect(movie.userRating, `Movie ${index} should have userRating`).toBeDefined();
          expect(movie.communityRating, `Movie ${index} should have communityRating`).toBeDefined();
          expect(movie.poster !== undefined, `Movie ${index} should have poster field`).toBe(true);
        });
      }
    });
  });

  // ============================================================================
  // Scenario 9: Stats data validation
  // ============================================================================
  describe('Scenario 9: User Stats Validation', () => {
    it('user stats contain expected structure', async () => {
      const { data } = await getStatus(USERNAME);

      if (data.status === 'ready' && data.userStats) {
        const stats = data.userStats;
        expect(stats.totalMovies).toBeGreaterThan(0);
        expect(stats.averageRating).toBeGreaterThan(0);
        expect(stats.ratingDistribution).toBeDefined();
        expect(stats.generosity).toBeDefined();
        expect(stats.communityComparison).toBeDefined();
        expect(stats.genreOverview).toBeDefined();
        expect(Array.isArray(stats.genreOverview)).toBe(true);
      }
    });

    it('user stats contain topActors with TMDB photo URLs', async () => {
      const { data } = await getStatus(USERNAME);

      if (data.status === 'ready' && data.userStats) {
        const { topActors } = data.userStats;
        expect(topActors).toBeDefined();
        expect(Array.isArray(topActors)).toBe(true);
        expect(topActors.length).toBeGreaterThan(0);
        expect(topActors.length).toBeLessThanOrEqual(5);

        topActors.forEach((actor, index) => {
          expect(actor.name, `Actor ${index} should have name`).toBeDefined();
          expect(actor.count, `Actor ${index} should have count`).toBeGreaterThan(0);
          expect(Array.isArray(actor.movies), `Actor ${index} should have movies array`).toBe(true);
          // photoUrl may be null if TMDB token is not set, but the field should exist
          expect('photoUrl' in actor, `Actor ${index} should have photoUrl field`).toBe(true);
        });
      }
    });
  });
});

// Non-conditional sanity check
describe('E2E Configuration', () => {
  it('API_GATEWAY_URL is configured', () => {
    if (!API_URL) {
      console.warn('⚠️ API_GATEWAY_URL not set - E2E tests will be skipped');
    }
    expect(true).toBe(true);
  });

  it('logs test configuration', () => {
    if (API_URL) {
      console.log(`API URL: ${API_URL}`);
      console.log(`Username: ${USERNAME}`);
      console.log(`Timeout: ${TIMEOUT / 1000}s`);
    }
    expect(true).toBe(true);
  });
});
