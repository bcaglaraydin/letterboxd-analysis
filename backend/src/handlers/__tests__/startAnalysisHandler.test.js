import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handler } from '../startAnalysisHandler.js';
import { sendMessage } from '../../services/sqsQueueService.js';
import { putUserJob, getUserJob } from '../../services/userJobService.js';
import { batchGet } from '../../services/dynamoDbService.js';
import { GameService } from '../../services/gameService.js';

vi.mock('../../services/sqsQueueService.js', () => ({
  sendMessage: vi.fn().mockResolvedValue({}),
  sendMessageBatch: vi.fn().mockResolvedValue({}),
}));

vi.mock('../../services/userJobService.js', () => ({
  putUserJob: vi.fn(),
  getUserJob: vi.fn(),
  updateUserJob: vi.fn(),
}));

vi.mock('../../services/dynamoDbService.js', () => ({
  batchGet: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../services/gameService.js', () => ({
  GameService: {
    generateAll: vi.fn().mockResolvedValue({
      userStats: { totalMovies: 2 },
      ratingGame: { movies: [] },
      genreGame: { genres: [] },
    }),
  },
}));

describe('startAnalysisHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SQS_LIST_QUEUE_URL = 'https://sqs.eu-west-1.amazonaws.com/123/list-queue';
    process.env.FILMS_TABLE = 'Films';
  });

  it('should return 400 if username is missing', async () => {
    const event = { body: JSON.stringify({}) };
    const result = await handler(event);
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toBe('Username is required');
  });

  it('should return full game data immediately when job is ready', async () => {
    const mockFilms = [
      { slug: 'film1', userRating: 5 },
      { slug: 'film2', userRating: 4 },
    ];
    getUserJob.mockResolvedValue({
      status: 'ready',
      films: mockFilms,
      createdAt: Math.floor(Date.now() / 1000),
    });

    batchGet.mockResolvedValue([
      { slug: 'film1', title: 'Film 1', year: '2020' },
      { slug: 'film2', title: 'Film 2', year: '2021' },
    ]);

    const mockGameData = {
      userStats: { totalMovies: 2 },
      ratingGame: { movies: [] },
      genreGame: { genres: [] },
    };
    GameService.generateAll.mockResolvedValue(mockGameData);

    const event = { body: JSON.stringify({ username: 'testuser' }) };
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.status).toBe('ready');
    expect(body.userStats).toBeDefined();
    expect(body.ratingGame).toBeDefined();
    expect(sendMessage).not.toHaveBeenCalled(); // No SQS dispatch
  });

  it('should return processing when job is pending (no dispatch)', async () => {
    getUserJob.mockResolvedValue({
      status: 'pending',
      createdAt: Math.floor(Date.now() / 1000),
    });

    const event = { body: JSON.stringify({ username: 'testuser' }) };
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.status).toBe('processing');
    expect(sendMessage).not.toHaveBeenCalled(); // No SQS dispatch for existing pending job
  });

  it('should return processing when job is processing (no dispatch)', async () => {
    getUserJob.mockResolvedValue({
      status: 'processing',
      createdAt: Math.floor(Date.now() / 1000),
    });

    const event = { body: JSON.stringify({ username: 'testuser' }) };
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.status).toBe('processing');
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('should create new job and dispatch to SQS when no job exists', async () => {
    getUserJob.mockResolvedValue(null);
    putUserJob.mockResolvedValue(true); // conditional write succeeded

    const event = { body: JSON.stringify({ username: 'testuser' }) };
    const result = await handler(event);

    expect(result.statusCode).toBe(202);
    const body = JSON.parse(result.body);
    expect(body.status).toBe('accepted');
    expect(body.username).toBe('testuser');
    expect(putUserJob).toHaveBeenCalledWith('testuser', [], { status: 'pending' });
    expect(sendMessage).toHaveBeenCalledWith(
      process.env.SQS_LIST_QUEUE_URL,
      {
        action: 'scrape_user_list',
        username: 'testuser',
      },
      expect.objectContaining({
        correlationId: expect.objectContaining({
          DataType: 'String',
          StringValue: expect.any(String),
        }),
      })
    );
  });

  it('should restart when previous job failed', async () => {
    getUserJob.mockResolvedValueOnce({ status: 'failed', error: 'some error' });
    putUserJob.mockResolvedValue(true);

    const event = { body: JSON.stringify({ username: 'testuser' }) };
    const result = await handler(event);

    expect(result.statusCode).toBe(202);
    expect(putUserJob).toHaveBeenCalled();
    expect(sendMessage).toHaveBeenCalled();
  });

  it('should handle race condition when putUserJob returns false', async () => {
    getUserJob
      .mockResolvedValueOnce(null) // First check: no job
      .mockResolvedValueOnce({ status: 'processing', createdAt: Math.floor(Date.now() / 1000) }); // Re-read after race
    putUserJob.mockResolvedValue(false); // Conditional write failed

    const event = { body: JSON.stringify({ username: 'testuser' }) };
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.status).toBe('processing');
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('should return 500 if SQS_LIST_QUEUE_URL is not set', async () => {
    delete process.env.SQS_LIST_QUEUE_URL;
    getUserJob.mockResolvedValue(null);
    putUserJob.mockResolvedValue(true);

    const event = { body: JSON.stringify({ username: 'testuser' }) };
    const result = await handler(event);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body).error).toBe('Configuration error');
  });
});
