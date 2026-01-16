/**
 * Integration Test: SQS + Lambda Worker + DynamoDB Flow
 *
 * Tests the full async processing pipeline.
 * Run with: npm run test:integration (requires AWS credentials)
 *
 * Business Requirements Tested:
 * - Queue film for metadata scraping via SQS
 * - Worker scrapes and stores film data in DynamoDB
 * - Stored data includes title, director, genres, themes
 */

import 'dotenv/config';
import { describe, it, expect, beforeAll } from 'vitest';
import { sendMessageBatch } from '../src/services/sqsQueueService.js';
import { getItem, deleteItem } from '../src/services/dynamoDbService.js';

const SQS_QUEUE_URL = process.env.SQS_QUEUE_URL;
const FILMS_TABLE = process.env.FILMS_TABLE;
const TEST_SLUG = 'dune-2021';

// Skip these tests if AWS environment not configured
const shouldRun = SQS_QUEUE_URL && FILMS_TABLE;

describe.runIf(shouldRun)('Worker Pipeline', () => {
  beforeAll(async () => {
    // Clean up existing test data
    await deleteItem(FILMS_TABLE, { slug: TEST_SLUG });
  });

  it('sends message to SQS queue', async () => {
    await expect(sendMessageBatch(SQS_QUEUE_URL, [{ slug: TEST_SLUG }])).resolves.not.toThrow();
  });

  it('worker processes message within 30 seconds', async () => {
    // Poll for result
    let film = null;
    const startTime = Date.now();
    const timeout = 30000;

    while (Date.now() - startTime < timeout) {
      film = await getItem(FILMS_TABLE, { slug: TEST_SLUG });
      if (film) break;
      await new Promise((r) => setTimeout(r, 2000));
    }

    expect(film).toBeDefined();
  }, 35000);

  describe('Film Metadata', () => {
    let film;

    beforeAll(async () => {
      film = await getItem(FILMS_TABLE, { slug: TEST_SLUG });
    });

    it('has correct slug', () => {
      expect(film.slug).toBe(TEST_SLUG);
    });

    it('has title', () => {
      expect(film.title).toBeDefined();
      expect(typeof film.title).toBe('string');
    });

    it('has director', () => {
      expect(film.director).toBeDefined();
    });

    it('has genres array', () => {
      expect(Array.isArray(film.genres)).toBe(true);
    });

    it('has themes array', () => {
      expect(Array.isArray(film.themes)).toBe(true);
    });

    it('has averageRating', () => {
      expect(film.averageRating).toBeDefined();
      expect(typeof film.averageRating).toBe('number');
    });

    it('has scrapedAt timestamp', () => {
      expect(film.scrapedAt).toBeDefined();
    });

    it('has TTL for cache expiry', () => {
      expect(film.ttl).toBeDefined();
      expect(typeof film.ttl).toBe('number');
    });
  });
});

describe.skipIf(!shouldRun)('Worker Pipeline (SKIPPED - AWS not configured)', () => {
  it('skipped because SQS_QUEUE_URL or FILMS_TABLE not set', () => {
    expect(true).toBe(true); // Placeholder
  });
});
