import { describe, it, expect } from 'vitest';
import { generateGenreGame } from '../genreGame.js';

describe('generateGenreGame', () => {
  // ============================================================
  // Core Functionality
  // ============================================================
  describe('core functionality', () => {
    it('returns correct structure with genres and actualRanking', () => {
      const films = [
        { genres: ['Action', 'Drama'] },
        { genres: ['Action', 'Comedy'] },
        { genres: ['Drama', 'Romance'] },
      ];
      const result = generateGenreGame(films);

      expect(result).toHaveProperty('genres');
      expect(result).toHaveProperty('actualRanking');
      expect(Array.isArray(result.genres)).toBe(true);
      expect(Array.isArray(result.actualRanking)).toBe(true);
    });

    it('genres have id, name and averageRating properties', () => {
      const films = [{ genres: ['Action', 'Drama'], userRating: 4.0 }];
      const result = generateGenreGame(films);

      result.genres.forEach((genre) => {
        expect(genre).toHaveProperty('id');
        expect(genre).toHaveProperty('name');
        expect(genre).toHaveProperty('averageRating');
        expect(genre.id).toBe(genre.name); // id = name for genres
        expect(typeof genre.averageRating).toBe('number');
      });
    });

    it('ranks genres by average rating (highest rated first)', () => {
      const films = [
        { genres: ['Action'], userRating: 2.0 },
        { genres: ['Action'], userRating: 2.0 },
        { genres: ['Action'], userRating: 3.0 }, // Avg: ~2.33
        { genres: ['Drama'], userRating: 5.0 },
        { genres: ['Drama'], userRating: 5.0 }, // Avg: 5.0
        { genres: ['Comedy'], userRating: 1.0 }, // Avg: 1.0
      ];
      const result = generateGenreGame(films);

      expect(result.actualRanking[0]).toBe('Drama');
      expect(result.actualRanking[1]).toBe('Action');
      expect(result.actualRanking[2]).toBe('Comedy');
    });

    it('selects Popular (Top 50%) first, then Niche, both sorted by Rating', () => {
      // Counts: A=10, B=10, C=10 (Popular, Median=10)
      //         D=1, E=1 (Niche)
      const films = [];
      // Popular (Count 10)
      for (let i = 0; i < 10; i++) films.push({ genres: ['A'], userRating: 2.0 }); // Avg 2.0
      for (let i = 0; i < 10; i++) films.push({ genres: ['B'], userRating: 4.0 }); // Avg 4.0
      for (let i = 0; i < 10; i++) films.push({ genres: ['C'], userRating: 3.0 }); // Avg 3.0

      // Niche (Count 1) - But very high rated!
      films.push({ genres: ['D'], userRating: 5.0 }); // Avg 5.0
      films.push({ genres: ['E'], userRating: 1.0 }); // Avg 1.0

      // All Genres:
      // A (Count 10, Rate 2.0)
      // B (Count 10, Rate 4.0)
      // C (Count 10, Rate 3.0)
      // D (Count 1, Rate 5.0)
      // E (Count 1, Rate 1.0)

      // Counts: 10, 10, 10, 1, 1. Sorted: 1, 1, 10, 10, 10.
      // Median (index 2 of 5) = 10.
      // Threshold = 10.
      // Popular: A, B, C.
      // Niche: D, E.

      // Case 1: Limit 2. Should pick Top 2 Popular (by Rating): B (4.0) and C (3.0).
      // Note: logic is "Pop sorted by Rate" + "Niche sorted by Rate".
      // Pop sorted: B(4.0), C(3.0), A(2.0).
      // Niche sorted: D(5.0), E(1.0).
      // Combined: B, C, A, D, E.

      let result = generateGenreGame(films, { limit: 2 });
      let names = result.genres.map((g) => g.name);
      // Wait, once selected (B, C), actual ranking is B(4.0), C(3.0).
      expect(names).toContain('B');
      expect(names).toContain('C');
      expect(names).not.toContain('A');
      expect(names).not.toContain('D'); // D is 5.0 but niche, so skipped in favor of popular C

      // Case 2: Limit 4. Should pick all 3 Popular (B, C, A) + 1 Niche (D).
      result = generateGenreGame(films, { limit: 4 });
      names = result.genres.map((g) => g.name);
      expect(names).toContain('B'); // Pop 1
      expect(names).toContain('C'); // Pop 2
      expect(names).toContain('A'); // Pop 3
      expect(names).toContain('D'); // Niche 1 (High rate)
      expect(names).not.toContain('E');

      // Ranking Check for Case 2: D(5.0), B(4.0), C(3.0), A(2.0).
      // Even though D was picked last (Tier 2), it is ranked #1 because it has highest rating.
      const ranking = result.actualRanking;
      expect(ranking[0]).toBe('D');
      expect(ranking[1]).toBe('B');
      expect(ranking[2]).toBe('C');
      expect(ranking[3]).toBe('A');
    });
  });

  // ============================================================
  // Limit Option
  // ============================================================
  describe('limit option', () => {
    it('respects custom limit', () => {
      const films = [];
      for (let i = 0; i < 20; i++) {
        films.push({ genres: [`Genre${i}`] });
      }

      const result = generateGenreGame(films, { limit: 5 });

      expect(result.genres).toHaveLength(5);
      expect(result.actualRanking).toHaveLength(5);
    });

    it('defaults to 8 genres', () => {
      const films = [];
      for (let i = 0; i < 20; i++) {
        films.push({ genres: [`Genre${i}`] });
      }

      const result = generateGenreGame(films);

      expect(result.genres).toHaveLength(8);
    });

    it('returns fewer if not enough genres exist', () => {
      const films = [{ genres: ['Action'] }, { genres: ['Drama'] }, { genres: ['Comedy'] }];

      const result = generateGenreGame(films, { limit: 10 });

      expect(result.genres).toHaveLength(3);
    });
  });

  // ============================================================
  // Shuffling
  // ============================================================
  describe('shuffling', () => {
    it('shuffles genres (order differs from actualRanking)', () => {
      // Create many genres to make shuffle very likely to change order
      const films = [];
      for (let i = 0; i < 10; i++) {
        for (let j = 0; j <= i; j++) {
          films.push({ genres: [`Genre${i}`] });
        }
      }

      // Run multiple times to verify shuffling
      let orderDiffers = false;
      for (let attempt = 0; attempt < 10; attempt++) {
        const result = generateGenreGame(films, { limit: 8 });
        const genreOrder = result.genres.map((g) => g.id);

        if (JSON.stringify(genreOrder) !== JSON.stringify(result.actualRanking.slice(0, 8))) {
          orderDiffers = true;
          break;
        }
      }

      expect(orderDiffers).toBe(true);
    });

    it('actualRanking remains in correct order (not shuffled)', () => {
      const films = [{ genres: ['Action'] }, { genres: ['Action'] }, { genres: ['Drama'] }];

      // Run multiple times to ensure consistency
      for (let i = 0; i < 5; i++) {
        const result = generateGenreGame(films);
        expect(result.actualRanking).toEqual(['Action', 'Drama']);
      }
    });
  });

  // ============================================================
  // Edge Cases
  // ============================================================
  describe('edge cases', () => {
    it('handles films with no genres', () => {
      const films = [{ genres: [] }, { title: 'No genres field' }];

      const result = generateGenreGame(films);

      expect(result.genres).toEqual([]);
      expect(result.actualRanking).toEqual([]);
    });

    it('handles empty films array', () => {
      const result = generateGenreGame([]);

      expect(result.genres).toEqual([]);
      expect(result.actualRanking).toEqual([]);
    });

    it('handles films with undefined genres', () => {
      const films = [{ title: 'Movie without genres' }];

      const result = generateGenreGame(films);

      expect(result.genres).toEqual([]);
    });
  });
});
