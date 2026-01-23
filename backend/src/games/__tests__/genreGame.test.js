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
      // Create enough films so genres are in popular group (top 50% by count)
      const films = [
        { genres: ['Action'], userRating: 2.0 },
        { genres: ['Action'], userRating: 2.0 },
        { genres: ['Action'], userRating: 3.0 }, // Avg: ~2.33, Count: 3
        { genres: ['Drama'], userRating: 5.0 },
        { genres: ['Drama'], userRating: 5.0 }, // Avg: 5.0, Count: 2
        { genres: ['Comedy'], userRating: 1.0 },
        { genres: ['Comedy'], userRating: 1.0 }, // Avg: 1.0, Count: 2
      ];
      // Sorted by count: Action(3), Drama(2), Comedy(2)
      // midPoint = ceil(3/2) = 2, so popular = [Action, Drama]
      // Only popular genres selected, Comedy is in niche group
      const result = generateGenreGame(films);

      // actualRanking should be sorted by rating: Drama(5.0), Action(2.33)
      expect(result.actualRanking[0]).toBe('Drama');
      expect(result.actualRanking[1]).toBe('Action');
      // Comedy is NOT included (it's in the niche group)
      expect(result.actualRanking).not.toContain('Comedy');
    });

    it('selects only Popular (Top 50% by count) genres, sorted by Rating', () => {
      // Current implementation ONLY picks from popular genres (top 50% by count)
      const films = [];
      // Popular (Count 10) - These will be selected
      for (let i = 0; i < 10; i++) films.push({ genres: ['A'], userRating: 2.0 }); // Avg 2.0
      for (let i = 0; i < 10; i++) films.push({ genres: ['B'], userRating: 4.0 }); // Avg 4.0
      for (let i = 0; i < 10; i++) films.push({ genres: ['C'], userRating: 3.0 }); // Avg 3.0

      // Niche (Count 1) - These will NOT be selected
      films.push({ genres: ['D'], userRating: 5.0 }); // Avg 5.0
      films.push({ genres: ['E'], userRating: 1.0 }); // Avg 1.0

      // Sorted by count: A(10), B(10), C(10), D(1), E(1)
      // midPoint = ceil(5/2) = 3, so popular = [A, B, C]
      // Niche = [D, E] (not selected at all)

      // Case 1: Limit 2. Should pick from Popular sorted by Rating: B(4.0), A(2.0)
      // Using selectEvenly which picks indices 0 and length-1
      let result = generateGenreGame(films, { limit: 2 });
      let names = result.genres.map((g) => g.name);
      expect(names).toContain('B'); // Highest rated popular
      expect(names).toContain('A'); // Lowest rated popular (via selectEvenly)
      expect(names).not.toContain('D'); // D is niche, not selected
      expect(names).not.toContain('E');

      // Case 2: Limit 3. Should pick all 3 Popular: B(4.0), C(3.0), A(2.0)
      result = generateGenreGame(films, { limit: 3 });
      names = result.genres.map((g) => g.name);
      expect(names).toContain('B');
      expect(names).toContain('C');
      expect(names).toContain('A');
      expect(names).not.toContain('D'); // Still niche

      // Ranking for Case 2: B(4.0), C(3.0), A(2.0)
      const ranking = result.actualRanking;
      expect(ranking[0]).toBe('B');
      expect(ranking[1]).toBe('C');
      expect(ranking[2]).toBe('A');
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

    it('returns fewer if not enough popular genres exist', () => {
      // 3 genres total, but only top 50% (2 genres) are "popular"
      const films = [
        { genres: ['Action'] },
        { genres: ['Action'] }, // Count: 2
        { genres: ['Drama'] }, // Count: 1
        { genres: ['Comedy'] }, // Count: 1
      ];
      // Sorted by count: Action(2), Drama(1), Comedy(1)
      // midPoint = ceil(3/2) = 2, popular = [Action, Drama]
      // Only 2 popular genres, so we get 2 even with limit 10

      const result = generateGenreGame(films, { limit: 10 });

      expect(result.genres).toHaveLength(2);
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
      // Need 4+ genres so popular group has at least 2
      // With 4 genres: midPoint = ceil(4/2) = 2, so popular = top 2 by count
      const films = [];
      // Action: 4 films, Avg 3.0
      for (let i = 0; i < 4; i++) films.push({ genres: ['Action'], userRating: 3.0 });
      // Drama: 4 films, Avg 4.0
      for (let i = 0; i < 4; i++) films.push({ genres: ['Drama'], userRating: 4.0 });
      // Comedy: 1 film (niche)
      films.push({ genres: ['Comedy'], userRating: 5.0 });
      // Horror: 1 film (niche)
      films.push({ genres: ['Horror'], userRating: 1.0 });

      // Sorted by count: Action(4), Drama(4), Comedy(1), Horror(1)
      // midPoint = ceil(4/2) = 2, popular = [Action, Drama]

      // Run multiple times to ensure consistency
      for (let i = 0; i < 5; i++) {
        const result = generateGenreGame(films);
        // Drama has higher rating (4.0), so it should be first
        expect(result.actualRanking).toEqual(['Drama', 'Action']);
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
