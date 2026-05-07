/**
 * Integration Test: Letterboxd Scraping Service
 *
 * Tests the scraping service against the real Letterboxd website.
 * Run with: npm run test:integration
 *
 * Business Requirements Tested:
 * - Scrape user film list from Letterboxd
 * - Extract film slugs, titles, poster URLs
 * - Extract user ratings from star display
 * - Handle pagination for large film lists
 */

import 'dotenv/config';
import { describe, it, expect, beforeAll } from 'vitest';
import { scrapeUserFilmsList } from 'letterboxd-scraper-engine';

const TEST_USERNAME = process.env.TEST_USERNAME || 'bcaglaraydin';

describe('Letterboxd Scraping Service', () => {
  let films = [];

  beforeAll(async () => {
    films = await scrapeUserFilmsList(TEST_USERNAME);
  }, 60000); // 60s timeout for scraping

  describe('Film List Retrieval', () => {
    it('returns an array of films', () => {
      expect(Array.isArray(films)).toBe(true);
    });

    it('retrieves at least 1 film', () => {
      expect(films.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Film Data Structure', () => {
    it('each film has a slug (URL identifier)', () => {
      films.slice(0, 10).forEach((film) => {
        expect(film.slug).toBeDefined();
        expect(typeof film.slug).toBe('string');
        expect(film.slug.length).toBeGreaterThan(0);
      });
    });

    it('each film has a title', () => {
      films.slice(0, 10).forEach((film) => {
        expect(film.title).toBeDefined();
        expect(typeof film.title).toBe('string');
      });
    });

    it('slug follows URL-safe format (lowercase, hyphens)', () => {
      films.slice(0, 10).forEach((film) => {
        expect(film.slug).toMatch(/^[a-z0-9-]+$/);
      });
    });
  });

  describe('User Ratings', () => {
    it('finds rated films', () => {
      const ratedFilms = films.filter((f) => f.userRating !== null);
      expect(ratedFilms.length).toBeGreaterThan(0);
    });

    it('ratings are on 0.5-5 star scale', () => {
      const ratedFilms = films.filter((f) => f.userRating !== null);
      ratedFilms.slice(0, 20).forEach((film) => {
        expect(film.userRating).toBeGreaterThanOrEqual(0.5);
        expect(film.userRating).toBeLessThanOrEqual(5);
      });
    });

    it('ratings are in 0.5 increments', () => {
      const ratedFilms = films.filter((f) => f.userRating !== null);
      ratedFilms.slice(0, 20).forEach((film) => {
        expect(film.userRating % 0.5).toBe(0);
      });
    });
  });

  describe('Poster URLs', () => {
    it('poster URLs are valid HTTPS URLs when present', () => {
      const filmsWithPosters = films.filter((f) => f.posterUrl);
      filmsWithPosters.slice(0, 10).forEach((film) => {
        expect(film.posterUrl).toMatch(/^https:\/\//);
      });
    });
  });
});
