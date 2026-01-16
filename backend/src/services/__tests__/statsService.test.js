import { describe, it, expect } from 'vitest';
import {
  calculateRatingDistribution,
  calculateBasicStats,
  calculateCommunityComparison,
  findGuiltyPleasure,
} from '../statsService.js';

describe('statsService', () => {
  // ============================================================
  // calculateRatingDistribution
  // ============================================================
  describe('calculateRatingDistribution', () => {
    it('correctly buckets ratings into 0.5 increments', () => {
      const ratings = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0];
      const result = calculateRatingDistribution(ratings);

      expect(result['0-0.5']).toBe(1);
      expect(result['0.5-1']).toBe(1);
      expect(result['1-1.5']).toBe(1);
      expect(result['1.5-2']).toBe(1);
      expect(result['2-2.5']).toBe(1);
      expect(result['2.5-3']).toBe(1);
      expect(result['3-3.5']).toBe(1);
      expect(result['3.5-4']).toBe(1);
      expect(result['4-4.5']).toBe(1);
      expect(result['4.5-5']).toBe(1);
    });

    it('handles empty array', () => {
      const result = calculateRatingDistribution([]);

      // All buckets should be 0
      Object.values(result).forEach((count) => {
        expect(count).toBe(0);
      });
    });

    it('handles multiple ratings in same bucket', () => {
      // 4.5 is <= 4.5 so goes to '4-4.5', only 4.6-5.0 go to '4.5-5'
      const ratings = [4.6, 4.7, 4.8, 4.9, 5.0];
      const result = calculateRatingDistribution(ratings);

      expect(result['4.5-5']).toBe(5);
    });
  });

  // ============================================================
  // calculateBasicStats
  // ============================================================
  describe('calculateBasicStats', () => {
    it('calculates average correctly', () => {
      const ratings = [1, 2, 3, 4, 5]; // Average = 3
      const result = calculateBasicStats(ratings);

      expect(result.average).toBe(3);
    });

    it('calculates median for odd-length array', () => {
      const ratings = [1, 2, 3, 4, 5]; // Median = 3
      const result = calculateBasicStats(ratings);

      expect(result.median).toBe(3);
    });

    it('calculates median for even-length array', () => {
      const ratings = [1, 2, 3, 4]; // Median = (2+3)/2 = 2.5
      const result = calculateBasicStats(ratings);

      expect(result.median).toBe(2.5);
    });

    it('calculates standard deviation', () => {
      const ratings = [2, 4, 4, 4, 5, 5, 7, 9]; // StdDev ≈ 2.0
      const result = calculateBasicStats(ratings);

      expect(result.stdDev).toBe(2);
    });

    it('returns zeros for empty array', () => {
      const result = calculateBasicStats([]);

      expect(result.average).toBe(0);
      expect(result.median).toBe(0);
      expect(result.stdDev).toBe(0);
    });
  });

  // ============================================================
  // calculateCommunityComparison
  // ============================================================
  describe('calculateCommunityComparison', () => {
    it('calculates user vs community average ratings', () => {
      const films = [
        { userRating: 4.0, averageRating: 3.5 },
        { userRating: 5.0, averageRating: 4.0 },
        { userRating: 3.0, averageRating: 3.0 },
      ];
      const result = calculateCommunityComparison(films);

      expect(result.averageUserRating).toBe(4); // (4+5+3)/3
      expect(result.averageCommunityRating).toBe(3.5); // (3.5+4+3)/3
    });

    it('filters out films without both ratings', () => {
      const films = [
        { userRating: 4.0, averageRating: 3.5 },
        { userRating: null, averageRating: 4.0 }, // No user rating
        { userRating: 3.0, averageRating: 0 }, // Zero community rating
      ];
      const result = calculateCommunityComparison(films);

      // Only first film should be counted
      expect(result.averageUserRating).toBe(4);
      expect(result.averageCommunityRating).toBe(3.5);
    });

    it('returns zeros when no valid films', () => {
      const result = calculateCommunityComparison([]);

      expect(result.averageUserRating).toBe(0);
      expect(result.averageCommunityRating).toBe(0);
    });
  });

  // ============================================================
  // findGuiltyPleasure
  // ============================================================
  describe('findGuiltyPleasure', () => {
    describe('guilty pleasures (user loves, community meh)', () => {
      it('identifies movies user rated high but community rated low', () => {
        const movies = [
          { title: 'Bad Movie I Love', userRating: 4.5, communityRating: 2.5 }, // +2.0 diff
          { title: 'Normal Movie', userRating: 3.5, communityRating: 3.5 }, // 0 diff
        ];
        const result = findGuiltyPleasure(movies);

        expect(result.guiltyPleasures).toHaveLength(1);
        expect(result.guiltyPleasures[0].title).toBe('Bad Movie I Love');
      });

      it('requires user rating >= 3.5', () => {
        const movies = [
          { title: 'Meh Movie', userRating: 3.0, communityRating: 2.0 }, // Not guilty pleasure
        ];
        const result = findGuiltyPleasure(movies);

        expect(result.guiltyPleasures).toHaveLength(0);
      });

      it('requires community rating < 3.7', () => {
        const movies = [
          { title: 'Good Movie', userRating: 4.5, communityRating: 3.8 }, // Not guilty pleasure
        ];
        const result = findGuiltyPleasure(movies);

        expect(result.guiltyPleasures).toHaveLength(0);
      });
    });

    describe('controversial picks (user loves good movie WAY more)', () => {
      it('identifies movies where user rates significantly higher', () => {
        const movies = [
          { title: 'Underrated Gem', userRating: 5.0, communityRating: 3.8 }, // +1.2 diff
        ];
        const result = findGuiltyPleasure(movies);

        expect(result.controversialPicks).toHaveLength(1);
        expect(result.controversialPicks[0].title).toBe('Underrated Gem');
      });

      it('requires community rating >= 3.7 and < 4.0', () => {
        const movies = [
          { title: 'Beloved Classic', userRating: 5.0, communityRating: 4.2 }, // Too high
        ];
        const result = findGuiltyPleasure(movies);

        expect(result.controversialPicks).toHaveLength(0);
      });
    });

    describe('edge cases', () => {
      it('handles empty array', () => {
        const result = findGuiltyPleasure([]);

        expect(result).toEqual([]);
      });

      it('handles null/undefined input', () => {
        expect(findGuiltyPleasure(null)).toEqual([]);
        expect(findGuiltyPleasure(undefined)).toEqual([]);
      });

      it('sorts by difference descending', () => {
        const movies = [
          { title: 'A', userRating: 4.0, communityRating: 3.0 }, // +1.0
          { title: 'B', userRating: 5.0, communityRating: 2.5 }, // +2.5
          { title: 'C', userRating: 4.5, communityRating: 2.8 }, // +1.7
        ];
        const result = findGuiltyPleasure(movies);

        expect(result.guiltyPleasures[0].title).toBe('B');
        expect(result.guiltyPleasures[1].title).toBe('C');
        expect(result.guiltyPleasures[2].title).toBe('A');
      });
    });
  });
});
