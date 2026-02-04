import { handler } from '../getAnalysisStatusHandler.js';
import { batchGet } from '../../services/dynamoDbService.js';
import { getUserJob } from '../../services/userJobService.js';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/userJobService.js');
vi.mock('../../services/dynamoDbService.js');
vi.mock('../../games/genreGame.js', () => ({
  generateGenreGame: vi.fn(),
}));
vi.mock('../../services/gameService.js', () => ({
  GameService: {
    generateAll: vi.fn(),
    generatePartialRatingGame: vi.fn(),
  },
}));

describe('getAnalysisStatusHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.FILMS_TABLE = 'test-table';
  });

  it('should return "partial_ready" when enough films have metadata but not all', async () => {
    // Mock scraped user films (from list pages)
    const mockUserFilms = [
      { slug: 'film1', userRating: 5 },
      { slug: 'film2', userRating: 4 },
      { slug: 'film3', userRating: 3 },
      { slug: 'film4', userRating: 2 },
      { slug: 'film5', userRating: 1 },
      { slug: 'film6', userRating: 5 }, // 6th pending metadata
    ];
    getUserJob.mockResolvedValue({ films: mockUserFilms, jobId: 'job-123' });

    // Mock Metadata: 5 ready, 1 missing
    const mockDbItems = [
      { slug: 'film1', year: '2020' },
      { slug: 'film2', year: '2021' },
      { slug: 'film3', year: '2022' },
      { slug: 'film4', year: '2023' },
      { slug: 'film5', year: '2024' },
      // film6 missing
    ];
    batchGet.mockResolvedValue(mockDbItems);

    // Mock GameService.generatePartialRatingGame
    const { GameService } = await import('../../services/gameService.js');
    GameService.generatePartialRatingGame.mockResolvedValue({ movies: [] });

    const result = await handler({ queryStringParameters: { username: 'test' } });

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);

    expect(body.status).toBe('partial_ready');
    expect(body.progress).toBeLessThan(1);
    expect(GameService.generatePartialRatingGame).toHaveBeenCalled();
  });

  it('should return "ready" when all films have metadata', async () => {
    // Mock scraped user films
    const mockUserFilms = [
      { slug: 'film1', userRating: 5 },
      { slug: 'film2', userRating: 4 },
    ];
    getUserJob.mockResolvedValue({ films: mockUserFilms, jobId: 'job-123' });

    // Mock Metadata: All ready
    const mockDbItems = [
      { slug: 'film1', year: '2020' },
      { slug: 'film2', year: '2021' },
    ];
    batchGet.mockResolvedValue(mockDbItems);

    const mockGameData = {
      userStats: { totalMovies: 2 },
      ratingGame: {},
      genreGame: {},
      genreMatchingGame: {},
    };

    // Import GameService to mock its method return
    const { GameService } = await import('../../services/gameService.js');
    GameService.generateAll.mockResolvedValue(mockGameData);

    const result = await handler({ queryStringParameters: { username: 'test' } });

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);

    expect(body.status).toBe('ready');
    expect(body.progress).toBe(1);
    expect(GameService.generateAll).toHaveBeenCalled();
    expect(body.userStats).toBeDefined();
  });

  it('should return "processing" if not enough films have metadata', async () => {
    // Mock scraped user films
    const mockUserFilms = [
      { slug: 'film1', userRating: 5 },
      { slug: 'film2', userRating: 5 },
      { slug: 'film3', userRating: 5 },
    ];
    getUserJob.mockResolvedValue({ films: mockUserFilms, jobId: 'job-456' });

    // Only 1 has metadata
    batchGet.mockResolvedValue([{ slug: 'film1', year: '2020' }]);

    const result = await handler({ queryStringParameters: { username: 'test' } });

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);

    expect(body.status).toBe('processing');
    // GameService should not be called when not enough metadata
    const { GameService } = await import('../../services/gameService.js');
    expect(GameService.generatePartialRatingGame).not.toHaveBeenCalled();
  });

  it('should return "not_found" when no job exists', async () => {
    getUserJob.mockResolvedValue(null);

    const result = await handler({ queryStringParameters: { username: 'test' } });

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.status).toBe('not_found');
    expect(body.message).toContain('No active analysis');
  });
});
