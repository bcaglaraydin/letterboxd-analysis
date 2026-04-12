import { sendMessage } from '../services/sqsQueueService.js';
import { putUserJob, getUserJob } from '../services/userJobService.js';
import { batchGet } from '../services/dynamoDbService.js';
import { GameService } from '../services/gameService.js';
import { fetchWithRetry } from '../utils/http.js';
import { Logger } from '../utils/logger.js';
import middy from '@middy/core';
import cors from '@middy/http-cors';
import { authMiddleware, quotaMiddleware, killSwitchMiddleware } from '../utils/middyMiddleware.js';

const baseHandler = async (event, context) => {
  Logger.init(event, context);
  Logger.info('StartAnalysis invoked');

  try {
    let body = {};
    if (event.body) {
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    }

    const username = body.username;
    if (!username) {
      Logger.warn('Missing username in request');
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Username is required' }),
      };
    }

    Logger.info(`Starting analysis for user: ${username}`, { username });

    // 1. Check if valid job exists (TTL handles 24h expiry)
    const cachedJob = await getUserJob(username);

    if (cachedJob) {
      // READY: Return full game data immediately — no polling needed
      if (cachedJob.status === 'ready') {
        Logger.info(`Job is READY for ${username}. Returning full data.`, { username });
        return await buildReadyResponse(cachedJob);
      }

      // PROCESSING/PENDING: Already being worked on — tell frontend to poll
      if (cachedJob.status === 'pending' || cachedJob.status === 'processing') {
        Logger.info(`Job is ${cachedJob.status} for ${username}. Frontend should poll.`, {
          username,
        });
        return {
          statusCode: 200,
          body: JSON.stringify({
            status: 'processing',
            username,
            message: 'Analysis is in progress. Poll /analysis/status for updates.',
          }),
        };
      }

      // FAILED: Fall through to create a new job
      Logger.info(`Previous job failed for ${username}. Restarting.`, { username });
    }

    // 2. Quick Existence Check (FIXED: Return 503 on upstream failure)
    try {
      await fetchWithRetry(`https://letterboxd.com/${username}/`, {}, 1);
    } catch (err) {
      if (err.response?.status === 404) {
        Logger.warn(`User not found: ${username}`);
        return {
          statusCode: 404,
          body: JSON.stringify({ error: `User not found: ${username}` }),
        };
      }

      // Critical Security/Resource fix: FAIL CLOSED on upstream mystery errors
      Logger.error(`Existence check failed (non-404) for ${username} - ABORTING`, err, {
        username,
      });
      return {
        statusCode: 503,
        body: JSON.stringify({
          error: 'Letterboxd is currently unavailable. Please try again later.',
        }),
      };
    }

    // 3. Create new job state (PENDING) with conditional write
    const created = await putUserJob(username, [], { status: 'pending' });

    if (!created) {
      // Race condition: another request already created the job
      // Re-read and return current status
      const existingJob = await getUserJob(username);
      if (existingJob) {
        if (existingJob.status === 'ready') {
          return await buildReadyResponse(existingJob);
        }
        return {
          statusCode: 200,
          body: JSON.stringify({
            status: 'processing',
            username,
            message: 'Analysis is in progress. Poll /analysis/status for updates.',
          }),
        };
      }
    }

    // 4. Dispatch to List Scrape Queue
    if (process.env.SQS_LIST_QUEUE_URL) {
      Logger.info(`Dispatching list scrape task to SQS`, { username, queue: 'list-scrape' });

      const messageAttributes = {
        correlationId: {
          DataType: 'String',
          StringValue: Logger.getCorrelationId(),
        },
      };

      await sendMessage(
        process.env.SQS_LIST_QUEUE_URL,
        {
          action: 'scrape_user_list',
          username,
        },
        messageAttributes
      );
    } else {
      Logger.error('SQS_LIST_QUEUE_URL not set!');
      return { statusCode: 500, body: JSON.stringify({ error: 'Configuration error' }) };
    }

    // 5. Return Accepted (202) — frontend should start polling
    return {
      statusCode: 202,
      body: JSON.stringify({
        status: 'accepted',
        message: 'Analysis queued',
        username,
      }),
    };
  } catch (error) {
    console.error('[StartAnalysis] Handler error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'An unexpected error occurred' }),
    };
  }
};

export const handler = middy(baseHandler)
  .use(killSwitchMiddleware()) // Check SSM Kill-switch first
  .use(authMiddleware()) // Verify JWT and IP binding
  .use(quotaMiddleware()) // Enforce Per-IP and Global Quotas
  .use(cors()); // Handle CORS headers

/**
 * Builds a full "ready" response by fetching film metadata and generating all game data.
 * Used when the cached job is already in "ready" state.
 */
async function buildReadyResponse(job) {
  const FILMS_TABLE = process.env.FILMS_TABLE;
  const userFilms = job.films || [];

  if (!FILMS_TABLE || userFilms.length === 0) {
    return {
      statusCode: 200,
      body: JSON.stringify({ status: 'ready', progress: 1, userStats: {} }),
    };
  }

  // Fetch film metadata from DynamoDB
  const filmSlugStrings = userFilms.map((f) => f.slug);
  const uniqueSlugs = [...new Set(filmSlugStrings)].map((slug) => ({ slug }));
  const dbItems = await batchGet(FILMS_TABLE, uniqueSlugs);
  const metadataMap = new Map();
  dbItems.forEach((item) => metadataMap.set(item.slug, item));

  // Generate all game data
  const minFilms = 5;
  const gameData = await GameService.generateAll(userFilms, metadataMap, minFilms);

  return {
    statusCode: 200,
    body: JSON.stringify({
      status: 'ready',
      progress: 1,
      ...gameData,
    }),
  };
}
