import { handler } from '../triggerFilmScrapingHandler.js';
import { scrapeUserFilmsList } from '../../services/letterboxdScrapingService.js';
import { sendMessageBatch } from '../../services/sqsQueueService.js';
import { batchGet, putItem } from '../../services/dynamoDbService.js';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/letterboxdScrapingService.js');
vi.mock('../../services/sqsQueueService.js');
vi.mock('../../services/dynamoDbService.js');

describe('triggerFilmScrapingHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SQS_QUEUE_URL = 'test-queue-url';
    process.env.FILMS_TABLE = 'test-table';
  });

  it('should prioritize the first 5 films in a separate SQS batch (default)', async () => {
    // Mock 20 films
    const mockFilms = Array.from({ length: 20 }, (_, i) => ({
      slug: `film-${i}`,
      userRating: 4,
    }));
    scrapeUserFilmsList.mockResolvedValue(mockFilms);
    batchGet.mockResolvedValue([]); // No existing films in DB
    putItem.mockResolvedValue({});

    const event = {
      body: JSON.stringify({ username: 'testuser' }), // No minFilms => default 5
    };

    const result = await handler(event);

    expect(result.statusCode).toBe(200);

    expect(sendMessageBatch).toHaveBeenCalledTimes(2);

    // Check Priority Batch
    const firstCallArgs = sendMessageBatch.mock.calls[0];
    const firstBatchMessages = firstCallArgs[1];
    expect(firstBatchMessages).toHaveLength(1);
    expect(firstBatchMessages[0].slugs).toHaveLength(5); // Default priority count is 5
    expect(firstBatchMessages[0].slugs).toEqual(['film-0', 'film-1', 'film-2', 'film-3', 'film-4']);

    // Check Background Batch
    const secondCallArgs = sendMessageBatch.mock.calls[1];
    const secondBatchMessages = secondCallArgs[1];
    // Remaining 15 items: 10 + 5
    expect(secondBatchMessages).toHaveLength(2);
    expect(secondBatchMessages[0].slugs).toHaveLength(10);
    expect(secondBatchMessages[1].slugs).toHaveLength(5);
  });

  it('should respect custom minFilms for priority batch', async () => {
    const mockFilms = Array.from({ length: 20 }, (_, i) => ({
      slug: `film-${i}`,
      userRating: 4,
    }));
    scrapeUserFilmsList.mockResolvedValue(mockFilms);
    batchGet.mockResolvedValue([]);
    putItem.mockResolvedValue({});

    const event = {
      body: JSON.stringify({ username: 'testuser', minFilms: 8 }),
    };

    await handler(event);

    // Expect priority batch to be 8
    const firstCallArgs = sendMessageBatch.mock.calls[0];
    const firstBatchMessages = firstCallArgs[1];
    expect(firstBatchMessages[0].slugs).toHaveLength(8);
  });

  it('should handle less than 6 films correctly', async () => {
    const mockFilms = Array.from({ length: 3 }, (_, i) => ({ slug: `film-${i}` }));
    scrapeUserFilmsList.mockResolvedValue(mockFilms);
    batchGet.mockResolvedValue([]);

    await handler({ body: JSON.stringify({ username: 'testuser' }) });

    // Should only send priority batch
    expect(sendMessageBatch).toHaveBeenCalledTimes(1);
    const msgs = sendMessageBatch.mock.calls[0][1];
    expect(msgs[0].slugs).toHaveLength(3);
  });
});
