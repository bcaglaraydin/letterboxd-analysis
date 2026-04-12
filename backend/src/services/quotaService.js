import { RateLimiterDynamo } from 'rate-limiter-flexible';
import { client } from './dynamoDbService.js';

const QUOTAS_TABLE = process.env.QUOTAS_TABLE || 'letterboxd-analysis-quotas-dev';
const GLOBAL_USAGE_TABLE = process.env.GLOBAL_USAGE_TABLE || 'letterboxd-analysis-global-usage-dev';

// Per-IP Quota: 5 requests per 24 hours
const ipRateLimiter = new RateLimiterDynamo({
  storeClient: client,
  tableName: QUOTAS_TABLE,
  points: 5,
  duration: 24 * 60 * 60, // 24 hours in seconds
  keyPrefix: 'ip',
  tableMapping: {
    partitionKeyName: 'ip',
    sortKeyName: 'window_id',
  },
});

// Global Quota: 100 requests per 24 hours
const globalRateLimiter = new RateLimiterDynamo({
  storeClient: client,
  tableName: GLOBAL_USAGE_TABLE,
  points: 100,
  duration: 24 * 60 * 60,
  keyPrefix: 'global',
  tableMapping: {
    partitionKeyName: 'window_id',
  },
});

/**
 * Checks both IP and Global quotas.
 * @param {string} ip - Requester's source IP
 * @throws Error with statusCode 429 if quota exceeded
 */
export async function checkQuotas(ip) {
  try {
    // 1. Check Global Limit first (Fail fast)
    try {
      await globalRateLimiter.consume('system');
    } catch {
      console.warn('[Quota] Global system limit reached.');
      const error = new Error('System-wide daily limit reached. Try again later.');
      error.statusCode = 429;
      throw error;
    }

    // 2. Check Per-IP Limit
    try {
      await ipRateLimiter.consume(ip);
    } catch {
      console.warn(`[Quota] IP limit reached for ${ip}`);
      const error = new Error('Daily analysis limit reached for your IP (5/24h).');
      error.statusCode = 429;
      throw error;
    }

    console.log(`[Quota] Check passed for ${ip}`);
  } catch (error) {
    if (error.statusCode === 429) throw error;
    // Fallback for DB errors: fail-safe (allow) but log
    console.error('[Quota] System error during quota check. Failing open.', error);
  }
}
