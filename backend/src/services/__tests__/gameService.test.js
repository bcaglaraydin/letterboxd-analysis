import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameService } from '../gameService.js';
import { generateRatingGame } from '../../games/ratingGame.js';
import { generateGenreGame } from '../../games/genreGame.js';
import { generateGenreMatchingGame } from '../../games/genreMatchingGame.js';
import { generateThemeGame } from '../../games/themeGame.js';
import {
  calculateRatingDistribution,
  calculateBasicStats,
  calculateCommunityComparison,
  findRatingDeviations,
  calculateGenreStats,
  calculateTopActors,
  calculateDurationDistribution,
  calculateCountryStats,
} from '../statsService.js';

// Mock all dependencies
vi.mock('../../games/ratingGame.js');
vi.mock('../../games/genreGame.js');
vi.mock('../../games/genreMatchingGame.js');
vi.mock('../../games/themeGame.js');
vi.mock('../statsService.js');

describe('GameService', () => {
  const mockUserFilms = [{ slug: 'film-1', userRating: 4 }];
  const mockMetadataMap = new Map([['film-1', { title: 'Film 1', year: '2020' }]]);
  const minFilms = 5;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateAll', () => {
    it('calls all game generators and stats service', async () => {
      // Setup mock returns
      mockResolved(generateRatingGame, { movies: ['rating'] });
      mockReturnValue(generateGenreGame, { genres: ['genre'] });
      mockReturnValue(generateGenreMatchingGame, { rounds: ['matching'] });
      mockReturnValue(generateThemeGame, { rounds: ['themeRounds'], sortingRounds: ['sorting'] });

      // Mock stats functions
      mockReturnValue(calculateRatingDistribution, { 5: 1 }); // used for both user and community
      mockReturnValue(calculateBasicStats, { average: 4.5, median: 4, stdDev: 0.5 });
      mockReturnValue(calculateCommunityComparison, { diff: 0 });
      mockReturnValue(calculateGenreStats, ['genreStats']);
      mockResolved(calculateTopActors, [{ name: 'Test Actor' }]);
      mockReturnValue(findRatingDeviations, {
        guiltyPleasures: [],
        controversialPicks: [],
        hotTakes: [],
        skepticPicks: [],
      });
      mockReturnValue(calculateDurationDistribution, { graphs: [] });
      mockReturnValue(calculateCountryStats, []);

      const result = await GameService.generateAll(mockUserFilms, mockMetadataMap, minFilms);

      // Verify correct orchestration
      // Rating Game uses raw userFilms + metadataMap
      expect(generateRatingGame).toHaveBeenCalledWith(mockUserFilms, mockMetadataMap, {
        minRatedFilms: minFilms,
      });

      // Genre Game uses "allFilmsWithMeta"
      // We can check the first argument has the merged structure
      expect(generateGenreGame).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            slug: 'film-1',
            title: 'Film 1', // from metadata
            year: '2020', // from metadata
          }),
        ]),
        { limit: 8 }
      );

      expect(generateGenreMatchingGame).toHaveBeenCalledWith(expect.any(Array));

      // Verify result structure
      expect(result).toEqual({
        ratingGame: { movies: ['rating'] },
        genreGame: { genres: ['genre'] },
        genreMatchingGame: { rounds: ['matching'] },
        themeGame: { rounds: ['themeRounds'], sortingRounds: ['sorting'] },
        userStats: expect.objectContaining({
          totalMovies: 1,
          averageRating: 4.5,
          ratingDistribution: { 5: 1 },
          genreOverview: ['genreStats'],
          topActors: [{ name: 'Test Actor' }],
        }),
      });
    });

    it('handles errors gracefully', async () => {
      generateRatingGame.mockRejectedValue(new Error('Game failed'));
      await expect(
        GameService.generateAll(mockUserFilms, mockMetadataMap, minFilms)
      ).rejects.toThrow('Game failed');
    });
  });
});

// Helper to handle mixed sync/async mocks if needed (though vitest handles promises well)
function mockResolved(fn, val) {
  fn.mockResolvedValue(val);
}

function mockReturnValue(fn, val) {
  fn.mockReturnValue(val);
}
