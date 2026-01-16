/**
 * Integration Test: Metrics API Endpoint
 *
 * Tests the /metrics endpoint with pre-defined film data.
 * Run with: npm run test:integration
 *
 * Business Requirements Tested:
 * - Accept user film list with ratings
 * - Compute top genres from film metadata
 * - Compute top directors from film metadata
 * - Calculate average rating
 */

import 'dotenv/config';
import { describe, it, expect, beforeAll } from 'vitest';
import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:4000';

const TEST_PAYLOAD = {
  users: [
    {
      username: 'testuser',
      films: [
        { slug: 'dune-2021', userRating: 4.5 },
        { slug: 'the-godfather', userRating: 5.0 },
        { slug: 'parasite-2019', userRating: 4.0 },
      ],
    },
  ],
};

describe('Metrics API', () => {
  let response;
  let metrics;

  beforeAll(async () => {
    response = await axios.post(`${API_URL}/metrics`, TEST_PAYLOAD);
    metrics = response.data.metrics[0];
  });

  describe('API Response', () => {
    it('returns HTTP 200', () => {
      expect(response.status).toBe(200);
    });

    it('returns metrics array', () => {
      expect(Array.isArray(response.data.metrics)).toBe(true);
      expect(response.data.metrics.length).toBeGreaterThan(0);
    });
  });

  describe('User Metrics', () => {
    it('includes username', () => {
      expect(metrics.username).toBe('testuser');
    });

    it('counts total films correctly', () => {
      expect(metrics.totalFilms).toBe(3);
    });

    it('calculates average rating', () => {
      expect(metrics.averageRating).toBeGreaterThan(0);
      expect(metrics.averageRating).toBeLessThanOrEqual(5);
    });
  });

  describe('Top Genres', () => {
    it('returns topGenres array', () => {
      expect(Array.isArray(metrics.topGenres)).toBe(true);
    });

    it('each genre has name and count', () => {
      metrics.topGenres.forEach((genre) => {
        expect(genre.name).toBeDefined();
        expect(typeof genre.count).toBe('number');
      });
    });
  });

  describe('Top Directors', () => {
    it('returns topDirectors array', () => {
      expect(Array.isArray(metrics.topDirectors)).toBe(true);
    });

    it('each director has name and count', () => {
      metrics.topDirectors.forEach((director) => {
        expect(director.name).toBeDefined();
        expect(typeof director.count).toBe('number');
      });
    });
  });
});
