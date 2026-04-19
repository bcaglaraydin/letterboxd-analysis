import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { docClient } from './dynamoDbService.js';
import { Logger } from '../utils/logger.js';

const QUOTAS_TABLE = process.env.QUOTAS_TABLE || 'letterboxd-analysis-quotas-dev';
const GLOBAL_USAGE_TABLE = process.env.GLOBAL_USAGE_TABLE || 'letterboxd-analysis-global-usage-dev';

const ADMIN_IPS = (process.env.ADMIN_IPS || '')
  .split(',')
  .map((ip) => ip.trim())
  .filter(Boolean);

// Configurable Limits
const IP_LIMIT = parseInt(process.env.LIMIT_IP_DAILY || '5', 10);
const GLOBAL_LIMIT = parseInt(process.env.LIMIT_GLOBAL_DAILY || '200', 10);
const WINDOW_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Checks both IP and Global quotas using native DynamoDB atomic updates.
 * This replaces rate-limiter-flexible to avoid Lambda runtime crashes.
 * @param {string} ip - Requester's source IP
 * @throws Error with statusCode 429 if quota exceeded
 */
export async function checkQuotas(ip) {
  // 0. Whitelist Bypass
  if (ADMIN_IPS.includes(ip)) {
    Logger.info(`[Quota Bypass] Admin IP detected: ${ip}. Skipping quota check.`);
    return;
  }

  const now = Date.now();
  // Round to the current 24h window start
  const windowId = Math.floor(now / WINDOW_DURATION_MS).toString();

  try {
    // 1. Check Global Limit (Fail fast)
    await consumeQuota(GLOBAL_USAGE_TABLE, { window_id: windowId }, GLOBAL_LIMIT, 'System-wide');

    // 2. Check Per-IP Limit
    await consumeQuota(QUOTAS_TABLE, { ip, window_id: windowId }, IP_LIMIT, 'Your IP');

    Logger.info(`[Quota] Check passed for ${ip}`);
  } catch (error) {
    if (error.statusCode === 429) throw error;

    // Fail-closed: reject request if quota check fails to prevent abuse
    Logger.error('[Quota] DynamoDB error during quota check. Failing closed.', error);
    const failError = new Error('Service temporarily unavailable. Please try again.');
    failError.statusCode = 429;
    throw failError;
  }
}

/**
 * Common helper to atomically increment and check a quota point.
 */
async function consumeQuota(tableName, key, limit, label) {
  try {
    const command = new UpdateCommand({
      TableName: tableName,
      Key: key,
      UpdateExpression: 'SET points = if_not_exists(points, :zero) + :one',
      ConditionExpression: 'attribute_not_exists(points) OR points < :limit',
      ExpressionAttributeValues: {
        ':zero': 0,
        ':one': 1,
        ':limit': limit,
      },
      ReturnValues: 'UPDATED_NEW',
    });

    await docClient.send(command);
  } catch (err) {
    if (err.name === 'ConditionalCheckFailedException') {
      Logger.warn(`[Quota] ${label} limit reached: ${limit}`);
      const error = new Error(`${label} daily limit reached (${limit}/24h). Try again tomorrow.`);
      error.statusCode = 429;
      throw error;
    }
    throw err;
  }
}
