/**
 * @file manual_worker_scrape.js
 * @description Manually triggers the Worker Lambda logic for "User List Scraping".
 * This is useful for debugging "Stuck in Processing" issues locally.
 *
 * Usage: node backend/scripts/debug/manual_worker_scrape.js <username>
 * Example: node backend/scripts/debug/manual_worker_scrape.js bcaglaraydin
 */

import 'dotenv/config';
import { handler } from '../../src/handlers/processFilmMetadataHandler.js';

const username = process.argv[2];

if (!username) {
  console.error('Error: Username is required.');
  console.error('Usage: node backend/scripts/debug/manual_worker_scrape.js <username>');
  process.exit(1);
}

if (!process.env.FILMS_TABLE) {
  console.warn('WARNING: FILMS_TABLE not set in .env. DB writes may fail.');
}
if (!process.env.SQS_QUEUE_URL) {
  console.warn('WARNING: SQS_QUEUE_URL not set in .env. Task dispatch will fail.');
}

async function run() {
  console.log(`--- Starting Manual Worker Execution for: ${username} ---`);

  // Construct a Mock SQS Event
  const mockEvent = {
    Records: [
      {
        messageId: 'manual-debug-123',
        receiptHandle: 'mock-handle',
        body: JSON.stringify({
          action: 'scrape_user_list', // This triggers the list scraping logic
          username: username,
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
      console.log('Check DynamoDB for USER# item and SQS for dispatched film tasks.');
    }
  } catch (error) {
    console.error('❌ Script Fatal Error:', error);
  }
}

run();
