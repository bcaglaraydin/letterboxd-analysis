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

    it('genres have id and name properties', () => {
      const films = [{ genres: ['Action', 'Drama'] }];
      const result = generateGenreGame(films);

      result.genres.forEach((genre) => {
        expect(genre).toHaveProperty('id');
        expect(genre).toHaveProperty('name');
        expect(genre.id).toBe(genre.name); // id = name for genres
      });
    });

    it('ranks genres by count (most watched first)', () => {
      const films = [
        { genres: ['Action'] }, // Action: 3
        { genres: ['Action'] },
        { genres: ['Action'] },
        { genres: ['Drama'] }, // Drama: 2
        { genres: ['Drama'] },
        { genres: ['Comedy'] }, // Comedy: 1
      ];
      const result = generateGenreGame(films);

      expect(result.actualRanking[0]).toBe('Action');
      expect(result.actualRanking[1]).toBe('Drama');
      expect(result.actualRanking[2]).toBe('Comedy');
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
