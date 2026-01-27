import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the external dependencies
vi.mock('../../services/dynamoDbService.js', () => ({
  batchWrite: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../services/letterboxdScrapingService.js', () => ({
  scrapeFilmDetails: vi.fn(),
}));

import { generateRatingGame } from '../ratingGame.js';

describe('generateRatingGame', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress console output during tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  // ============================================================
  // Validation
  // ============================================================
  describe('validation', () => {
    it('throws error if user has fewer than 5 rated films', async () => {
      const userFilms = [
        { slug: 'movie-1', userRating: 4.0 },
        { slug: 'movie-2', userRating: 3.5 },
        { slug: 'movie-3', userRating: 5.0 },
        { slug: 'movie-4', userRating: 2.5 },
        // Only 4 rated films
      ];
      const metadataMap = new Map();

      await expect(generateRatingGame(userFilms, metadataMap)).rejects.toThrow(
        'User needs at least 5 rated films'
      );
    });

    it('ignores unrated films when counting', async () => {
      const userFilms = [
        { slug: 'movie-1', userRating: 4.0 },
        { slug: 'movie-2', userRating: 3.5 },
        { slug: 'movie-3', userRating: null }, // Not rated
        { slug: 'movie-4', userRating: 5.0 },
        { slug: 'movie-5', userRating: null }, // Not rated
        { slug: 'movie-6', userRating: 2.5 },
        // Only 4 rated films
      ];
      const metadataMap = new Map();

      await expect(generateRatingGame(userFilms, metadataMap)).rejects.toThrow(
        'User needs at least 5 rated films'
      );
    });
  });

  // ============================================================
  // Core Functionality
  // ============================================================
  describe('core functionality', () => {
    it('returns exactly 5 movies', async () => {
      const userFilms = createMockFilms(10);
      const metadataMap = createMockMetadataMap(userFilms);

      const result = await generateRatingGame(userFilms, metadataMap);

      expect(result.movies).toHaveLength(5);
    });

    it('movies have correct structure', async () => {
      const userFilms = createMockFilms(5);
      const metadataMap = createMockMetadataMap(userFilms);

      const result = await generateRatingGame(userFilms, metadataMap);

      result.movies.forEach((movie) => {
        expect(movie).toHaveProperty('movieId');
        expect(movie).toHaveProperty('userRating');
        expect(movie).toHaveProperty('communityRating');
        expect(movie).toHaveProperty('releaseYear');
        expect(movie).toHaveProperty('title');
        expect(movie).toHaveProperty('director');
        expect(movie).toHaveProperty('poster');
      });
    });

    it('uses metadata from map when available', async () => {
      const userFilms = [
        { slug: 'dune-2021', userRating: 5.0, posterUrl: 'original-poster.jpg' },
        ...createMockFilms(4, 2), // 4 more films starting from index 2
      ];
      const metadataMap = new Map([
        [
          'dune-2021',
          {
            title: 'Dune',
            year: '2021',
            director: 'Denis Villeneuve',
            averageRating: 4.1,
            posterUrl: 'metadata-poster.jpg',
            runtime: 155,
          },
        ],
        ...createMockMetadataEntries(createMockFilms(4, 2)),
      ]);

      const result = await generateRatingGame(userFilms, metadataMap);
      const duneMovie = result.movies.find((m) => m.movieId === 'dune-2021');

      if (duneMovie) {
        expect(duneMovie.title).toBe('Dune');
        expect(duneMovie.director).toBe('Denis Villeneuve');
        expect(duneMovie.communityRating).toBe(4.1);
      }
    });
  });

  // ============================================================
  // Scraping Fallback
  // ============================================================

  // ============================================================
  // Randomness
  // ============================================================
  describe('randomness', () => {
    it('selects different movies on multiple calls', async () => {
      const userFilms = createMockFilms(20);
      const metadataMap = createMockMetadataMap(userFilms);

      const results = [];
      for (let i = 0; i < 5; i++) {
        const result = await generateRatingGame(userFilms, metadataMap);
        results.push(
          result.movies
            .map((m) => m.movieId)
            .sort()
            .join(',')
        );
      }

      // At least some selections should differ
      const uniqueSelections = new Set(results);
      expect(uniqueSelections.size).toBeGreaterThan(1);
    });
  });
});

// ============================================================
// Test Helpers
// ============================================================

function createMockFilms(count, startIndex = 1) {
  return Array.from({ length: count }, (_, i) => ({
    slug: `movie-${startIndex + i}`,
    userRating: 3.0 + (i % 5) * 0.5,
    posterUrl: `poster-${startIndex + i}.jpg`,
  }));
}

function createMockMetadataMap(films) {
  return new Map(createMockMetadataEntries(films));
}

function createMockMetadataEntries(films) {
  return films.map((f) => [
    f.slug,
    {
      title: `Title for ${f.slug}`,
      year: '2023',
      director: 'Test Director',
      averageRating: 3.5,
      posterUrl: f.posterUrl,
      runtime: 120,
    },
  ]);
}
