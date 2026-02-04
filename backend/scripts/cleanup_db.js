/**
 * Database Cleanup Utilities
 *
 * Provides functions to clean up DynamoDB tables for testing.
 * Used by integration and E2E tests to ensure clean state.
 */

import 'dotenv/config';
import { DynamoDBClient, ScanCommand, BatchWriteItemCommand } from '@aws-sdk/client-dynamodb';

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'eu-west-1' });

const FILMS_TABLE = process.env.FILMS_TABLE || 'Films';
const USER_JOBS_TABLE = process.env.USER_JOBS_TABLE || 'UserJobs';

/**
 * Truncates all items from a DynamoDB table
 * @param {string} tableName - Table to truncate
 * @param {string} keyName - Primary key attribute name
 */
export async function truncateTable(tableName, keyName) {
  console.log(`[Cleanup] Scanning table ${tableName}...`);
  let items = [];
  let lastEvaluatedKey = undefined;

  try {
    do {
      const command = new ScanCommand({
        TableName: tableName,
        ExclusiveStartKey: lastEvaluatedKey,
        ProjectionExpression: keyName,
      });
      const response = await client.send(command);
      if (response.Items) {
        items = items.concat(response.Items);
      }
      lastEvaluatedKey = response.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    console.log(`[Cleanup] Found ${items.length} items to delete in ${tableName}.`);

    if (items.length === 0) return;

    // Batch Delete (25 max per batch)
    const batches = [];
    while (items.length > 0) {
      batches.push(items.splice(0, 25));
    }

    for (const batch of batches) {
      const deleteRequests = batch.map((item) => ({
        DeleteRequest: {
          Key: item,
        },
      }));

      const command = new BatchWriteItemCommand({
        RequestItems: {
          [tableName]: deleteRequests,
        },
      });

      await client.send(command);
    }

    console.log(`[Cleanup] Deleted all items from ${tableName}.`);
  } catch (err) {
    console.error(`[Cleanup] Error truncating ${tableName}:`, err);
    throw err;
  }
}

/**
 * Clears the Films table
 */
export async function clearFilmsTable() {
  await truncateTable(FILMS_TABLE, 'slug');
}

/**
 * Clears the UserJobs table
 */
export async function clearUserJobsTable() {
  await truncateTable(USER_JOBS_TABLE, 'username');
}

/**
 * Clears a specific user's job from UserJobs table
 * @param {string} username - Username to clear
 */
export async function clearUserJob(username) {
  const { DeleteItemCommand } = await import('@aws-sdk/client-dynamodb');
  try {
    await client.send(
      new DeleteItemCommand({
        TableName: USER_JOBS_TABLE,
        Key: { username: { S: username } },
      })
    );
    console.log(`[Cleanup] Deleted job for user: ${username}`);
  } catch (err) {
    // Ignore if item doesn't exist
    if (err.name !== 'ResourceNotFoundException') {
      console.warn(`[Cleanup] Could not delete job for ${username}:`, err.message);
    }
  }
}

/**
 * Full cleanup - clears both tables
 */
export async function cleanupAll() {
  await clearFilmsTable();
  await clearUserJobsTable();
}

// Run if called directly (node scripts/cleanup_db.js)
const isDirectRun = process.argv[1]?.includes('cleanup_db.js');
if (isDirectRun) {
  cleanupAll().then(() => console.log('[Cleanup] Complete.'));
}
