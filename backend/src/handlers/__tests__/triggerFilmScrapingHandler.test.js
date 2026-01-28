import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler } from '../triggerFilmScrapingHandler.js';
import { scrapeUserFilmsList } from '../../services/letterboxdScrapingService.js';
import { sendMessageBatch } from '../../services/sqsQueueService.js';
import { batchGet } from '../../services/dynamoDbService.js';

vi.mock('../../services/letterboxdScrapingService.js');
vi.mock('../../services/sqsQueueService.js');
vi.mock('../../services/dynamoDbService.js');

describe('triggerFilmScrapingHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SQS_QUEUE_URL = 'test-queue-url';
    process.env.FILMS_TABLE = 'test-table';
    vi.mocked(sendMessageBatch).mockResolvedValue({});
  });

  it('should return film list after scraping', async () => {
    const mockFilms = Array.from({ length: 10 }, (_, i) => ({
      slug: `film-${i}`,
      userRating: 4,
    }));
    vi.mocked(scrapeUserFilmsList).mockResolvedValue(mockFilms);
    vi.mocked(batchGet).mockResolvedValue([]);

    const result = await handler({ body: JSON.stringify({ username: 'testuser' }) });

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.totalFilms).toBe(10);
    expect(body.films).toHaveLength(10);
    expect(scrapeUserFilmsList).toHaveBeenCalledWith('testuser');
  });

  it('should skip queueing for already cached films', async () => {
    const mockFilms = Array.from({ length: 10 }, (_, i) => ({
      slug: `film-${i}`,
      userRating: 4,
    }));
    vi.mocked(scrapeUserFilmsList).mockResolvedValue(mockFilms);
    // All films already cached with valid metadata
    vi.mocked(batchGet).mockResolvedValue(mockFilms.map((f) => ({ slug: f.slug, year: '2024' })));

    const result = await handler({ body: JSON.stringify({ username: 'testuser' }) });

    expect(result.statusCode).toBe(200);
    // Should not queue any films when all cached
    expect(sendMessageBatch).not.toHaveBeenCalled();
  });

  it('should return error for non-existent user', async () => {
    vi.mocked(scrapeUserFilmsList).mockRejectedValue(
      new Error('User not found or profile is private')
    );

    const result = await handler({ body: JSON.stringify({ username: 'baduser' }) });

    // Handler returns 500 for generic errors, 404 only for explicit "Page not found (404)"
    expect(result.statusCode).toBe(500);
    const body = JSON.parse(result.body);
    expect(body.error).toBeDefined();
  });

  it('should handle empty film list', async () => {
    vi.mocked(scrapeUserFilmsList).mockResolvedValue([]);

    const result = await handler({ body: JSON.stringify({ username: 'emptyuser' }) });

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.message).toContain('No films found');
  });
});
