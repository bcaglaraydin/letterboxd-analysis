import { handler } from '../getAnalysisStatusHandler.js';
import { batchGet } from '../../services/dynamoDbService.js';
import { getUserJob, updateUserJob } from '../../services/userJobService.js';
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

  it('should return "ready" when at most 5 rated films are missing metadata', async () => {
    // Mock scraped user films (from list pages)
    const mockUserFilms = [
      { slug: 'film1', userRating: 5 },
      { slug: 'film2', userRating: 4 },
      { slug: 'film3', userRating: 3 },
      { slug: 'film4', userRating: 2 },
      { slug: 'film5', userRating: 1 },
      { slug: 'film6', userRating: 5 }, // 6th pending metadata
    ];
    getUserJob.mockResolvedValue({ films: mockUserFilms });

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

    const { GameService } = await import('../../services/gameService.js');
    GameService.generateAll.mockResolvedValue({
      userStats: { totalMovies: 6 },
      ratingGame: { movies: [] },
      genreGame: {},
      genreMatchingGame: {},
      themeGame: { rounds: [], sortingRounds: [] },
    });

    const result = await handler({ queryStringParameters: { username: 'test' } });

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);

    expect(body.status).toBe('ready');
    expect(body.progress).toBeGreaterThan(0);
    expect(body.progress).toBeLessThanOrEqual(1);
    expect(GameService.generateAll).toHaveBeenCalled();
    expect(updateUserJob).toHaveBeenCalledWith(
      'test',
      expect.objectContaining({ status: 'ready', updatedAt: expect.any(Number) })
    );
  });

  it('should return "ready" when all films have metadata', async () => {
    // Mock scraped user films
    const mockUserFilms = [
      { slug: 'film1', userRating: 5 },
      { slug: 'film2', userRating: 4 },
    ];
    getUserJob.mockResolvedValue({ films: mockUserFilms });

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
    expect(updateUserJob).toHaveBeenCalledWith(
      'test',
      expect.objectContaining({ status: 'ready', updatedAt: expect.any(Number) })
    );
    expect(body.userStats).toBeDefined();
  });

  it('should return "ready" when exactly 5 rated films are missing metadata', async () => {
    const mockUserFilms = Array.from({ length: 10 }, (_, i) => ({
      slug: `film${i + 1}`,
      userRating: 5,
    }));
    getUserJob.mockResolvedValue({ films: mockUserFilms });

    batchGet.mockResolvedValue([
      { slug: 'film1', year: '2020' },
      { slug: 'film2', year: '2020' },
      { slug: 'film3', year: '2020' },
      { slug: 'film4', year: '2020' },
      { slug: 'film5', year: '2020' },
    ]);

    const { GameService } = await import('../../services/gameService.js');
    GameService.generateAll.mockResolvedValue({
      userStats: { totalMovies: 10 },
      ratingGame: { movies: [] },
      genreGame: {},
      genreMatchingGame: {},
      themeGame: { rounds: [], sortingRounds: [] },
    });

    const result = await handler({ queryStringParameters: { username: 'test' } });

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);

    expect(body.status).toBe('ready');
    expect(GameService.generateAll).toHaveBeenCalled();
    expect(GameService.generatePartialRatingGame).not.toHaveBeenCalled();
  });

  it('should return "partial_ready" if more than 5 rated films are missing but minFilms is met', async () => {
    const mockUserFilms = Array.from({ length: 11 }, (_, i) => ({
      slug: `film${i + 1}`,
      userRating: 5,
    }));
    getUserJob.mockResolvedValue({ films: mockUserFilms });

    batchGet.mockResolvedValue([
      { slug: 'film1', year: '2020' },
      { slug: 'film2', year: '2020' },
      { slug: 'film3', year: '2020' },
      { slug: 'film4', year: '2020' },
      { slug: 'film5', year: '2020' },
    ]);

    const { GameService } = await import('../../services/gameService.js');
    GameService.generatePartialRatingGame.mockResolvedValue({ movies: [] });

    const result = await handler({ queryStringParameters: { username: 'test' } });

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);

    expect(body.status).toBe('partial_ready');
    expect(body.progress).toBeLessThan(1);
    expect(GameService.generatePartialRatingGame).toHaveBeenCalled();
    expect(GameService.generateAll).not.toHaveBeenCalled();
  });

  it('should reuse cached partial rating game when job is already partial_ready for the same minFilms', async () => {
    const mockUserFilms = Array.from({ length: 11 }, (_, i) => ({
      slug: `film${i + 1}`,
      userRating: 5,
    }));
    getUserJob.mockResolvedValue({
      status: 'partial_ready',
      films: mockUserFilms,
      partialReadyMinFilms: 5,
      partialRatingGame: { movies: [{ movieId: 'film1' }] },
    });

    batchGet.mockResolvedValue([
      { slug: 'film1', year: '2020' },
      { slug: 'film2', year: '2020' },
      { slug: 'film3', year: '2020' },
      { slug: 'film4', year: '2020' },
      { slug: 'film5', year: '2020' },
    ]);

    const { GameService } = await import('../../services/gameService.js');

    const result = await handler({ queryStringParameters: { username: 'test', minFilms: '5' } });

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);

    expect(body.status).toBe('partial_ready');
    expect(body.ratingGame).toEqual({ movies: [{ movieId: 'film1' }] });
    expect(GameService.generatePartialRatingGame).not.toHaveBeenCalled();
    expect(updateUserJob).not.toHaveBeenCalled();
  });

  it('should return "processing" if not enough films have metadata', async () => {
    // Mock scraped user films
    const mockUserFilms = Array.from({ length: 8 }, (_, i) => ({
      slug: `film${i + 1}`,
      userRating: 5,
    }));
    getUserJob.mockResolvedValue({ films: mockUserFilms });

    // Only 1 has metadata
    batchGet.mockResolvedValue([{ slug: 'film1', year: '2020' }]);

    const result = await handler({ queryStringParameters: { username: 'test' } });

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);

    expect(body.status).toBe('processing');
    // GameService should not be called when not enough metadata
    const { GameService } = await import('../../services/gameService.js');
    expect(GameService.generateAll).not.toHaveBeenCalled();
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
