/**
 * @file test_full_system_load.js
 * @description Simulates a full user flow under load.
 * 1. Clears the DynamoDB Films table.
 * 2. Triggers a scrape (POST /).
 * 3. Waits for background workers.
 * 4. Fetches Metrics (POST /metrics).
 *
 * Usage: node backend/tests/manual/test_full_system_load.js
 */

import 'dotenv/config';
import { DynamoDBClient, ScanCommand, BatchWriteItemCommand } from '@aws-sdk/client-dynamodb';
import axios from 'axios';

const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const endpoint = process.env.API_URL;
const TABLE_NAME = process.env.FILMS_TABLE;

async function requestAxios(path, method, body) {
  const response = await axios({
    method: method,
    url: endpoint + path,
    data: body,
    validateStatus: () => true, // Don't throw on 4xx/5xx
  });
  return { status: response.status, data: response.data };
}

async function clearTable() {
  console.log(`Clearing table ${TABLE_NAME}...`);
  // 1. Scan for all keys
  let items = [];
  let lastEvaluatedKey = undefined;
  do {
    const command = new ScanCommand({
      TableName: TABLE_NAME,
      ProjectionExpression: 'slug',
      ExclusiveStartKey: lastEvaluatedKey,
    });
    const response = await client.send(command);
    if (response.Items) {
      items = items.concat(response.Items);
    }
    lastEvaluatedKey = response.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  if (items.length === 0) {
    console.log('Table is empty.');
    return;
  }

  console.log(`Found ${items.length} items. Deleting in batches of 25...`);

  // 2. Batch Delete
  const chunks = [];
  for (let i = 0; i < items.length; i += 25) {
    chunks.push(items.slice(i, i + 25));
  }

  let deletedCount = 0;
  for (const chunk of chunks) {
    const deleteRequests = chunk.map((item) => ({
      DeleteRequest: { Key: item },
    }));

    const command = new BatchWriteItemCommand({
      RequestItems: {
        [TABLE_NAME]: deleteRequests,
      },
    });

    try {
      await client.send(command);
      deletedCount += chunk.length;
      process.stdout.write(`\rDeleted ${deletedCount}/${items.length}`);
    } catch (err) {
      console.error('\nBatch delete failed:', err.message);
    }
  }
  console.log('\nTable cleared.');
}

async function run() {
  console.log('Starting Load Test...');

  await clearTable();

  const start = Date.now();

  // Test Scrape Trigger
  try {
    console.log('Triggering Scrape...');
    const res = await requestAxios('/', 'POST', { username: 'bcaglaraydin' });
    console.log('Scrape Response:', res.status, res.data);
  } catch (e) {
    console.error('Scrape Failed:', e);
  }

  // Wait a bit for workers to process
  console.log('Waiting 5s for workers...');
  await new Promise((r) => setTimeout(r, 5000));

  // Test Metrics
  try {
    console.log('Fetching Metrics...');
    const res = await requestAxios('/metrics', 'POST', {
      users: [
        {
          username: 'bcaglaraydin',
          films: [
            { slug: 'dune-2021', rating: 4 },
            { slug: 'the-batman', rating: 5 },
          ],
        },
      ],
    });
    console.log('Metrics Response:', res.status, res.data);
  } catch (e) {
    console.error('Metrics Failed:', e);
  }

  console.log('Load Test Completed in', Date.now() - start, 'ms');
}

run();
