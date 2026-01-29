/**
 * @file manual_worker_scrape.js
 * @description Manually triggers the Worker Lambda logic for film metadata scraping.
 * This is useful for debugging locally.
 *
 * Usage: node backend/scripts/debug/manual_worker_scrape.js <slug1> <slug2> ...
 * Example: node backend/scripts/debug/manual_worker_scrape.js the-godfather inception
 */

import 'dotenv/config';
import { handler } from '../../src/handlers/filmScraperWorker.js';

const slugs = process.argv.slice(2);

if (slugs.length === 0) {
  console.error('Error: At least one film slug is required.');
  console.error('Usage: node backend/scripts/debug/manual_worker_scrape.js <slug1> <slug2> ...');
  process.exit(1);
}

if (!process.env.FILMS_TABLE) {
  console.warn('WARNING: FILMS_TABLE not set in .env. DB writes may fail.');
}

async function run() {
  console.log(`--- Starting Manual Worker Execution for slugs: ${slugs.join(', ')} ---`);

  // Construct a Mock SQS Event
  const mockEvent = {
    Records: [
      {
        messageId: 'manual-debug-123',
        receiptHandle: 'mock-handle',
        body: JSON.stringify({
          action: 'scrape_batch',
          slugs: slugs,
        }),
        eventSource: 'aws:sqs',
        region: process.env.AWS_REGION || 'eu-west-1',
      },
    ],
  };

  try {
    console.log('Invoking handler...');
    const result = await handler(mockEvent);
    console.log('Handler Result:', JSON.stringify(result, null, 2));

    if (result.batchItemFailures && result.batchItemFailures.length > 0) {
      console.error('❌ Worker reported failures:', result.batchItemFailures);
    } else {
      console.log('✅ Worker execution successful.');
      console.log('Check DynamoDB Films table for scraped metadata.');
    }
  } catch (error) {
    console.error('❌ Script Fatal Error:', error);
  }
}

run();
