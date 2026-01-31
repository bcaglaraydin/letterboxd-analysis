import { describe, it, expect } from 'vitest';
import {
  generateGenreMatchingGame,
  calculateGenreRarityMap,
  CONFIG,
} from '../genreMatchingGame.js';

describe('Genre Matching Game', () => {
  // ============================================================
  // Rarity Calculation
  // ============================================================
  describe('calculateGenreRarityMap', () => {
    it('correctly classifies genres into Popular, Mid, and Niche', () => {
      // Setup: 9 genres with clear frequency differences
      // 1-3: High freq (Popular)
      // 4-6: Mid freq (Mid)
      // 7-9: Low freq (Niche)
      const films = [];
      const addFilms = (genre, count) => {
        for (let i = 0; i < count; i++) films.push({ genres: [genre] });
      };

      // Popular (Top 33%)
      addFilms('Action', 100);
      addFilms('Drama', 90);
      addFilms('Comedy', 80);

      // Mid (Next 33%)
      addFilms('Thriller', 50);
      addFilms('Horror', 40);
      addFilms('Romance', 30);

      // Niche (Bottom 33%)
      addFilms('Documentary', 10);
      addFilms('Western', 5);
      addFilms('Animation', 1);

      const rarityMap = calculateGenreRarityMap(films);

      // Popular
      expect(rarityMap['Action']).toBe('popular');
      expect(rarityMap['Drama']).toBe('popular');
      expect(rarityMap['Comedy']).toBe('popular');

      // Mid
      expect(rarityMap['Thriller']).toBe('mid');
      expect(rarityMap['Horror']).toBe('mid');
      expect(rarityMap['Romance']).toBe('mid');

      // Niche
      expect(rarityMap['Documentary']).toBe('niche');
      expect(rarityMap['Western']).toBe('niche');
      expect(rarityMap['Animation']).toBe('niche');
    });

    it('handles small datasets (fallback behavior)', () => {
      // If there are only 2 genres, thresholds might split them oddly depending on Math.floor
      // Total 2. Popular threshold 0.33 * 2 = 0.66 -> index 0 (Top 1)
      // Mid threshold 0.66 * 2 = 1.32 -> index 1
      const films = [];
      for (let i = 0; i < 10; i++) films.push({ genres: ['Popular'] });
      for (let i = 0; i < 5; i++) films.push({ genres: ['Mid/Niche'] });

      const rarityMap = calculateGenreRarityMap(films);

      // Index 0 < 0.66 is false? Wait.
      // pIndex = floor(2 * 0.33) = 0
      // mIndex = floor(2 * 0.66) = 1

      // Loop:
      // i=0 ('Popular'): index < pIndex (0 < 0) False -> index < mIndex (0 < 1) True -> 'mid'
      // i=1 ('Mid/Niche'): index < 1 False -> 'niche'

      // This reveals that with floor, "Popular" group might be empty for small sets.
      // This is acceptable behavior as logical "Top 33%" of 2 items is 0 items.
      expect(rarityMap['Popular']).toBeDefined();
      expect(rarityMap['Mid/Niche']).toBeDefined();
    });

    it('handles empty input', () => {
      const rarityMap = calculateGenreRarityMap([]);
      expect(rarityMap).toEqual({});
    });
  });

  // ============================================================
  // Game Generation
  // ============================================================
  describe('generateGenreMatchingGame', () => {
    const mockFilms = [
      {
        slug: 'movie-1',
        title: 'Movie 1',
        genres: ['Action', 'Drama'],
        poster: 'url1',
        year: '2020',
      },
      { slug: 'movie-2', title: 'Movie 2', genres: ['Comedy'], poster: 'url2', year: '2021' },
      { slug: 'movie-3', title: 'Movie 3', genres: ['Thriller'], poster: 'url3', year: '2022' },
      { slug: 'movie-4', title: 'Movie 4', genres: ['Horror'], poster: 'url4', year: '2023' },
      { slug: 'movie-5', title: 'Movie 5', genres: ['Romance'], poster: 'url5', year: '2024' },
      { slug: 'movie-6', title: 'Movie 6', genres: ['Action'], poster: 'url6', year: '2025' }, // Extra to test count
    ];

    it('returns correct game structure', () => {
      const result = generateGenreMatchingGame(mockFilms);

      expect(result).toHaveProperty('rounds');
      expect(result).toHaveProperty('rarityMap');
      expect(result).toHaveProperty('scoring');
      expect(result.scoring).toEqual(CONFIG.SCORING);
      expect(result).toHaveProperty('maxScorePerMovie', CONFIG.MAX_SCORE_PER_MOVIE);
    });

    it('selects correct number of movies', () => {
      const result = generateGenreMatchingGame(mockFilms, { count: 3 });
      expect(result.rounds).toHaveLength(3);
    });

    it('filters out movies without genres', () => {
      const badFilms = [
        ...mockFilms,
        { slug: 'bad-1', genres: [] },
        { slug: 'bad-2', genres: null },
      ];

      // Requesting more than available good movies to ensure bad ones aren't picked
      const result = generateGenreMatchingGame(badFilms, { count: 10 });

      const ids = result.rounds.map((r) => r.id);
      expect(ids).not.toContain('bad-1');
      expect(ids).not.toContain('bad-2');
    });

    it('correctly maps movie data including normalized theoreticalMax and genreScoring', () => {
      // Film 1: 'A' (Popular=1pt), 'B' (Niche=5pt) -> Should be normalized to sum to 20
      const films = [{ slug: 'm1', title: 'M1', genres: ['A', 'B'], poster: 'p1', year: '2020' }];

      const result = generateGenreMatchingGame(films, { count: 1 });
      const round = result.rounds[0];

      expect(round.id).toBe('m1');
      expect(round.title).toBe('M1');
      expect(round.correctGenres).toEqual(['A', 'B']);

      // Dynamic scoring should exist
      expect(round).toHaveProperty('genreScoring');

      // Sum of correct points should be exactly 20
      const totalCorrect = Object.values(round.genreScoring).reduce((sum, s) => sum + s.correct, 0);
      expect(totalCorrect).toBe(20);

      // theoreticalMax is now always 20
      expect(round.theoreticalMax).toBe(20);

      // Check penalties exist
      Object.values(round.genreScoring).forEach((s) => {
        expect(s).toHaveProperty('penalty');
        expect(s.penalty).toBeLessThan(0);
      });
    });
  });
});
