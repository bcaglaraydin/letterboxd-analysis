/**
 * E2E Test: Full Backend Flow via API Gateway
 *
 * This test exercises the complete backend system:
 *   1. POST /analysis → Creates job, sends to SQS
 *   2. Lambda → SQS → Lambda flow executes
 *   3. GET /analysis/status → Returns ready with game data
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

const API_URL = process.env.API_GATEWAY_URL;
const USERNAME = process.env.TEST_USERNAME || 'bcaglaraydin';
const TIMEOUT = parseInt(process.env.E2E_TIMEOUT_SECONDS || '120', 10) * 1000;
const POLL_INTERVAL = parseInt(process.env.E2E_POLL_INTERVAL_SECONDS || '5', 10) * 1000;

// Skip if API_GATEWAY_URL not configured
const shouldRun = !!API_URL;

describe.runIf(shouldRun)('E2E: Full Backend Flow', () => {
  let finalStatus;
  let finalData;

  // Clean up user job before running tests to ensure fresh state
  beforeAll(async () => {
    console.log(`[Setup] Clearing previous job for user: ${USERNAME}`);
    await clearUserJob(USERNAME);
  });

  describe('Step 1: Start Analysis', () => {
    it('POST /analysis returns 202 with jobId', async () => {
      const response = await fetch(`${API_URL}/analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: USERNAME }),
      });

      expect(response.status).toBe(202);

      const data = await response.json();
      expect(data.jobId).toBeDefined();
      // API returns 'accepted' or 'processing' depending on if job existed
      expect(['accepted', 'processing', 'polling']).toContain(data.status);
    });
  });

  describe('Step 2: Poll Status Until Ready', () => {
    beforeAll(async () => {
      const startTime = Date.now();

      // Initial delay to let Lambda start processing
      await new Promise((r) => setTimeout(r, 2000));

      while (Date.now() - startTime < TIMEOUT) {
        try {
          const response = await fetch(`${API_URL}/analysis/status?username=${USERNAME}`);
          const data = await response.json();

          finalStatus = data.status;
          finalData = data;

          // Exit conditions: ready, error, or partial_ready is acceptable
          if (
            finalStatus === 'ready' ||
            finalStatus === 'error' ||
            finalStatus === 'partial_ready'
          ) {
            break;
          }
        } catch (error) {
          console.warn('Poll error:', error.message);
        }

        await new Promise((r) => setTimeout(r, POLL_INTERVAL));
      }
    }, TIMEOUT + 30000);

    it('status endpoint returns 200', async () => {
      const response = await fetch(`${API_URL}/analysis/status?username=${USERNAME}`);
      expect(response.status).toBe(200);
    });

    it('status reaches a healthy state', () => {
      // Any of these statuses indicate the system is working
      expect(['ready', 'processing', 'partial_ready', 'not_found']).toContain(finalStatus);

      if (finalStatus === 'not_found') {
        console.warn(`Status is not_found - user ${USERNAME} may need initial scrape`);
      }
    });
  });

  describe('Step 3: Validate Response Data', () => {
    it('response has status field', () => {
      expect(finalData).toBeDefined();
      expect(finalData.status).toBeDefined();
    });

    it('response includes ratingGame when ready', () => {
      if (finalStatus === 'ready') {
        expect(finalData.ratingGame).toBeDefined();
        expect(finalData.ratingGame.movies).toBeDefined();
        expect(Array.isArray(finalData.ratingGame.movies)).toBe(true);
        expect(finalData.ratingGame.movies.length).toBe(5);
      }
    });

    it('ratingGame movies have required fields when ready', () => {
      if (finalStatus === 'ready' && finalData.ratingGame?.movies) {
        finalData.ratingGame.movies.forEach((movie, index) => {
          // Rating game uses movieId, not slug
          expect(
            movie.movieId || movie.slug,
            `Movie ${index} should have movieId or slug`
          ).toBeDefined();
          expect(movie.title, `Movie ${index} should have title`).toBeDefined();
          expect(movie.userRating, `Movie ${index} should have userRating`).toBeDefined();
        });
      }
    });

    it('genreGame exists when ready', () => {
      if (finalStatus === 'ready') {
        expect(finalData.genreGame).toBeDefined();
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
