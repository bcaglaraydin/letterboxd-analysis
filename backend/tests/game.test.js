/**
 * Integration Test: Game API Endpoint
 *
 * Tests the game endpoint that generates rating and genre ranking games.
 * Run with: npm run test:integration
 *
 * Business Requirements Tested:
 * - Rating Game: Returns 5 random movies with user and community ratings
 * - Genre Game: Returns shuffled genres with correct ranking
 * - User Stats: Total movies, average rating, rating distribution
 * - Guilty Pleasures: Movies user rated higher than community
 */

import 'dotenv/config';
import { describe, it, expect, beforeAll } from 'vitest';
import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:4000';
const TEST_USERNAME = process.env.TEST_USERNAME || 'bcaglaraydin';

describe('Game API', () => {
  let response;
  let data;

  beforeAll(async () => {
    response = await axios.post(`${API_URL}/metrics`, { username: TEST_USERNAME });
    data = response.data;
  }, 60000);

  describe('API Response', () => {
    it('returns HTTP 200', () => {
      expect(response.status).toBe(200);
    });

    it('includes username in response', () => {
      expect(data.username).toBe(TEST_USERNAME);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RATING GAME - "Guess your rating"
  // Business: User sees movie poster/title, guesses their own rating
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Rating Game', () => {
    it('returns ratingGame object', () => {
      expect(data.ratingGame).toBeDefined();
      expect(typeof data.ratingGame).toBe('object');
    });

    it('contains exactly 5 movies', () => {
      expect(data.ratingGame.movies).toHaveLength(5);
    });

    describe('Movie Data', () => {
      it('each movie has movieId (slug)', () => {
        data.ratingGame.movies.forEach((movie) => {
          expect(movie.movieId).toBeDefined();
          expect(typeof movie.movieId).toBe('string');
        });
      });

      it('each movie has title', () => {
        data.ratingGame.movies.forEach((movie) => {
          expect(movie.title).toBeDefined();
          expect(typeof movie.title).toBe('string');
        });
      });

      it('each movie has userRating (0.5-5 scale)', () => {
        data.ratingGame.movies.forEach((movie) => {
          expect(movie.userRating).toBeGreaterThanOrEqual(0.5);
          expect(movie.userRating).toBeLessThanOrEqual(5);
        });
      });

      it('each movie has communityRating (0-5 scale)', () => {
        data.ratingGame.movies.forEach((movie) => {
          expect(movie.communityRating).toBeGreaterThanOrEqual(0);
          expect(movie.communityRating).toBeLessThanOrEqual(5);
        });
      });

      it('each movie has releaseYear', () => {
        data.ratingGame.movies.forEach((movie) => {
          expect(movie.releaseYear).toBeDefined();
        });
      });

      it('each movie has poster URL', () => {
        data.ratingGame.movies.forEach((movie) => {
          expect(movie.poster).toBeDefined();
        });
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GENRE GAME - "Rank your top genres"
  // Business: User ranks their most-watched genres, compares to actual ranking
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Genre Game', () => {
    it('returns genreGame object', () => {
      expect(data.genreGame).toBeDefined();
      expect(typeof data.genreGame).toBe('object');
    });

    it('contains genres array', () => {
      expect(Array.isArray(data.genreGame.genres)).toBe(true);
      expect(data.genreGame.genres.length).toBeGreaterThan(0);
    });

    it('contains actualRanking array', () => {
      expect(Array.isArray(data.genreGame.actualRanking)).toBe(true);
    });

    it('genres and actualRanking have same length', () => {
      expect(data.genreGame.genres.length).toBe(data.genreGame.actualRanking.length);
    });

    describe('Genre Data', () => {
      it('each genre has id', () => {
        data.genreGame.genres.forEach((genre) => {
          expect(genre.id).toBeDefined();
          expect(typeof genre.id).toBe('string');
        });
      });

      it('each genre has name', () => {
        data.genreGame.genres.forEach((genre) => {
          expect(genre.name).toBeDefined();
          expect(typeof genre.name).toBe('string');
        });
      });

      it('actualRanking contains valid genre ids', () => {
        const genreIds = data.genreGame.genres.map((g) => g.id);
        data.genreGame.actualRanking.forEach((id) => {
          expect(genreIds).toContain(id);
        });
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // USER STATS - Profile statistics
  // Business: Shows user's watching habits and rating patterns
  // ═══════════════════════════════════════════════════════════════════════════
  describe('User Stats', () => {
    it('returns userStats object', () => {
      expect(data.userStats).toBeDefined();
      expect(typeof data.userStats).toBe('object');
    });

    describe('Basic Stats', () => {
      it('totalMovies is positive number', () => {
        expect(data.userStats.totalMovies).toBeGreaterThan(0);
        expect(typeof data.userStats.totalMovies).toBe('number');
      });

      it('averageRating is between 0 and 5', () => {
        expect(data.userStats.averageRating).toBeGreaterThanOrEqual(0);
        expect(data.userStats.averageRating).toBeLessThanOrEqual(5);
      });
    });

    describe('Rating Distribution', () => {
      it('has ratingDistribution object', () => {
        expect(data.userStats.ratingDistribution).toBeDefined();
        expect(typeof data.userStats.ratingDistribution).toBe('object');
      });

      it('distribution has 10 buckets (0.5 steps)', () => {
        const buckets = Object.keys(data.userStats.ratingDistribution);
        expect(buckets.length).toBe(10);
      });

      it('each bucket has non-negative count', () => {
        Object.values(data.userStats.ratingDistribution).forEach((count) => {
          expect(count).toBeGreaterThanOrEqual(0);
        });
      });
    });

    describe('Generosity Stats', () => {
      it('has generosity object', () => {
        expect(data.userStats.generosity).toBeDefined();
      });

      it('generosity includes median, average, stdDev', () => {
        expect(data.userStats.generosity.median).toBeDefined();
        expect(data.userStats.generosity.average).toBeDefined();
        expect(data.userStats.generosity.stdDev).toBeDefined();
      });
    });

    describe('Community Comparison', () => {
      it('has communityComparison object', () => {
        expect(data.userStats.communityComparison).toBeDefined();
      });

      it('includes user vs community average', () => {
        expect(data.userStats.communityComparison.averageUserRating).toBeDefined();
        expect(data.userStats.communityComparison.averageCommunityRating).toBeDefined();
      });
    });

    describe('Guilty Pleasures', () => {
      it('has guiltyPleasures array', () => {
        expect(Array.isArray(data.userStats.guiltyPleasures)).toBe(true);
      });

      it('has controversialPicks array', () => {
        expect(Array.isArray(data.userStats.controversialPicks)).toBe(true);
      });
    });
  });
});
