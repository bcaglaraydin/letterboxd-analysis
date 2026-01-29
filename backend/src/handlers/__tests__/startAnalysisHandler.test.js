import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handler } from '../startAnalysisHandler.js';
import { sendMessage } from '../../services/sqsQueueService.js';
import { putUserJob, getUserJob } from '../../services/userJobService.js';

vi.mock('../../services/sqsQueueService.js', () => ({
  sendMessage: vi.fn().mockResolvedValue({}),
  sendMessageBatch: vi.fn().mockResolvedValue({}),
}));

vi.mock('../../services/userJobService.js', () => ({
  putUserJob: vi.fn(),
  getUserJob: vi.fn(),
  updateUserJob: vi.fn(),
}));

describe('startAnalysisHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SQS_LIST_QUEUE_URL = 'https://sqs.eu-west-1.amazonaws.com/123/list-queue';
  });

  it('should return 400 if username is missing', async () => {
    const event = { body: JSON.stringify({}) };
    const result = await handler(event);
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toBe('Username is required');
  });

  it('should reuse existing fresh job if available', async () => {
    getUserJob.mockResolvedValue({
      jobId: 'existing-job',
      createdAt: Math.floor(Date.now() / 1000),
    });

    const event = { body: JSON.stringify({ username: 'testuser' }) };
    const result = await handler(event);

    expect(result.statusCode).toBe(202);
    expect(JSON.parse(result.body).jobId).toBe('existing-job');
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('should create new job and dispatch to SQS list queue if no job exists', async () => {
    getUserJob.mockResolvedValue(null);
    putUserJob.mockResolvedValue('new-job-123');

    const event = { body: JSON.stringify({ username: 'testuser' }) };
    const result = await handler(event);

    expect(result.statusCode).toBe(202);
    expect(putUserJob).toHaveBeenCalledWith('testuser', [], { status: 'pending' });
    expect(sendMessage).toHaveBeenCalledWith(process.env.SQS_LIST_QUEUE_URL, {
      action: 'scrape_user_list',
      username: 'testuser',
      jobId: 'new-job-123',
    });
  });

  it('should return 500 if SQS_LIST_QUEUE_URL is not set', async () => {
    delete process.env.SQS_LIST_QUEUE_URL;
    getUserJob.mockResolvedValue(null);
    putUserJob.mockResolvedValue('new-job-123');

    const event = { body: JSON.stringify({ username: 'testuser' }) };
    const result = await handler(event);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body).error).toBe('Configuration error');
  });
});
