import { sendMessage } from '../services/sqsQueueService.js';
import { putUserJob, getUserJob } from '../services/userJobService.js';
import { batchGet } from '../services/dynamoDbService.js';
import { GameService } from '../services/gameService.js';
import { fetchWithRetry } from '../utils/http.js';

export const handler = async (event) => {
  console.log('StartAnalysis event:', JSON.stringify(event));

  try {
    let body = {};
    if (event.body) {
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    }

    const username = body.username;
    if (!username) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Username is required' }),
      };
    }

    console.log(`Starting analysis for user: ${username}`);

    // 1. Check if valid job exists (TTL handles 24h expiry)
    const cachedJob = await getUserJob(username);

    if (cachedJob) {
      // READY: Return full game data immediately — no polling needed
      if (cachedJob.status === 'ready') {
        console.log(`[StartAnalysis] Job is READY for ${username}. Returning full data.`);
        return await buildReadyResponse(cachedJob);
      }

      // PROCESSING/PENDING: Already being worked on — tell frontend to poll
      if (cachedJob.status === 'pending' || cachedJob.status === 'processing') {
        console.log(
          `[StartAnalysis] Job is ${cachedJob.status} for ${username}. Frontend should poll.`
        );
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
      console.log(`[StartAnalysis] Previous job failed for ${username}. Restarting.`);
    }

    // 2. Quick Existence Check (fire-and-forget style — proceed on non-404)
    try {
      await fetchWithRetry(`https://letterboxd.com/${username}/`, {}, 1);
    } catch (err) {
      if (err.response?.status === 404) {
        console.warn(`[StartAnalysis] User not found: ${username}`);
        return {
          statusCode: 404,
          body: JSON.stringify({ error: `User not found: ${username}` }),
        };
      }
      console.warn(
        `[StartAnalysis] Existence check failed (non-404) for ${username}: ${err.message}`
      );
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
      console.log(`[StartAnalysis] Dispatching list scrape task for ${username}`);
      await sendMessage(process.env.SQS_LIST_QUEUE_URL, {
        action: 'scrape_user_list',
        username,
      });
    } else {
      console.error('[StartAnalysis] SQS_LIST_QUEUE_URL not set!');
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
