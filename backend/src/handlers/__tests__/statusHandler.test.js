import { handler } from '../statusHandler.js';
import { scrapeUserFilmsList } from '../../services/letterboxdScrapingService.js';
import { batchGet } from '../../services/dynamoDbService.js';
import { generateRatingGame } from '../../games/ratingGame.js';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/letterboxdScrapingService.js');
vi.mock('../../services/dynamoDbService.js');
vi.mock('../../games/ratingGame.js');
vi.mock('../../games/genreGame.js', () => ({
  generateGenreGame: vi.fn(),
}));
vi.mock('../../services/statsService.js', () => ({
  calculateRatingDistribution: vi.fn(),
  calculateBasicStats: vi.fn(),
  calculateCommunityComparison: vi.fn(),
  findGuiltyPleasure: vi.fn(() => ({})),
}));

describe('statusHandler', () => {
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
    scrapeUserFilmsList.mockResolvedValue(mockUserFilms);

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

    generateRatingGame.mockResolvedValue({ movies: [] });

    const result = await handler({ queryStringParameters: { username: 'test' } });

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);

    expect(body.status).toBe('partial_ready');
    expect(body.progress).toBeLessThan(1);
    expect(generateRatingGame).toHaveBeenCalled();
  });

  it('should return "processing" if not enough films have metadata', async () => {
    // Mock scraped user films
    const mockUserFilms = [
      { slug: 'film1', userRating: 5 },
      { slug: 'film2', userRating: 5 },
      { slug: 'film3', userRating: 5 },
    ];
    scrapeUserFilmsList.mockResolvedValue(mockUserFilms);

    // Only 1 has metadata
    batchGet.mockResolvedValue([{ slug: 'film1', year: '2020' }]);

    const result = await handler({ queryStringParameters: { username: 'test' } });

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);

    expect(body.status).toBe('processing');
    expect(generateRatingGame).not.toHaveBeenCalled();
  });

  it('should handle user not found error gracefully', async () => {
    scrapeUserFilmsList.mockRejectedValue(new Error('User not found or profile is private'));

    const result = await handler({ queryStringParameters: { username: 'test' } });

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.status).toBe('error');
    expect(body.message).toContain('private');
  });
});
