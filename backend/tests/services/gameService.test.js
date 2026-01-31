import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameService } from '../../src/services/gameService.js';
import * as genreGame from '../../src/games/genreGame.js';
import * as ratingGame from '../../src/games/ratingGame.js';
import * as genreMatchingGame from '../../src/games/genreMatchingGame.js';
import * as statsService from '../../src/services/statsService.js';

describe('GameService', () => {
  const mockUserFilms = [
    { slug: 'film-1', userRating: 4, posterUrl: 'url1', title: 'Film 1' },
    { slug: 'film-2', userRating: 5, posterUrl: 'url2', title: 'Film 2' },
  ];

  const mockMetadataMap = new Map([
    ['film-1', { year: '2020', genres: ['Action'] }],
    ['film-2', { year: '2021', genres: ['Drama'] }],
  ]);

  const minFilms = 5;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should generate all games and stats', async () => {
    // Mock dependencies
    vi.spyOn(genreGame, 'generateGenreGame').mockReturnValue({ genres: [] });
    vi.spyOn(ratingGame, 'generateRatingGame').mockResolvedValue({ movies: [] });
    vi.spyOn(genreMatchingGame, 'generateGenreMatchingGame').mockReturnValue({ rounds: [] });

    vi.spyOn(statsService, 'calculateRatingDistribution').mockReturnValue({});
    vi.spyOn(statsService, 'calculateBasicStats').mockReturnValue({
      average: 4.5,
      median: 4.5,
      stdDev: 0.5,
    });
    vi.spyOn(statsService, 'calculateCommunityComparison').mockReturnValue({});
    vi.spyOn(statsService, 'findGuiltyPleasure').mockReturnValue({
      guiltyPleasures: [],
      controversialPicks: [],
    });

    // Execute
    const result = await GameService.generateAll(mockUserFilms, mockMetadataMap, minFilms);

    // Verify structure
    expect(result).toHaveProperty('userStats');
    expect(result).toHaveProperty('ratingGame');
    expect(result).toHaveProperty('genreGame');
    expect(result).toHaveProperty('genreMatchingGame');

    // Verify userStats structure
    expect(result.userStats).toEqual({
      totalMovies: 2,
      averageRating: 4.5,
      ratingDistribution: {},
      generosity: {
        median: 4.5,
        average: 4.5,
        stdDev: 0.5,
      },
      communityComparison: {},
      communityRatingDistribution: {},
      guiltyPleasures: [],
      controversialPicks: [],
    });

    // Verify calls
    expect(genreGame.generateGenreGame).toHaveBeenCalled();
    expect(ratingGame.generateRatingGame).toHaveBeenCalledWith(mockUserFilms, mockMetadataMap, {
      minRatedFilms: minFilms,
    });
    expect(genreMatchingGame.generateGenreMatchingGame).toHaveBeenCalled();
  });
});
