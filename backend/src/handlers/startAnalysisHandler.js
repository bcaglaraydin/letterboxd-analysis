import { batchGet } from '../services/dynamoDbService.js';
import { scrapeUserFilmsList } from '../services/letterboxdScrapingService.js';
import { sendMessageBatch } from '../services/sqsQueueService.js';
import { putUserJob, getUserJob } from '../services/userJobService.js';

const FILMS_TABLE = process.env.FILMS_TABLE;

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

    // 1. Scrape User's Film List (fast - just list pages)
    // This gives us: {slug, title, posterUrl, userRating}
    let userFilms;
    try {
      userFilms = await scrapeUserFilmsList(username);
      console.log(`Found ${userFilms.length} films for ${username}`);
    } catch (error) {
      console.error(`Failed to scrape user list:`, error);

      let userMessage = 'Failed to fetch user profile';
      let statusCode = 500;

      if (error.message?.includes('Page not found (404)')) {
        userMessage = 'Letterboxd user not found. Please check the username and try again.';
        statusCode = 404;
      } else if (error.message?.includes('profile is private')) {
        userMessage = 'User not found or profile is private.';
        statusCode = 404;
      }

      return {
        statusCode,
        body: JSON.stringify({ error: userMessage }),
      };
    }

    if (userFilms.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No films found for this user' }),
      };
    }

    // 2. Check if job exists, else create new
    // If job exists and is fresh (<5 mins), reuse it
    const cachedJob = await getUserJob(username);
    let jobId;

    if (cachedJob && Math.floor(Date.now() / 1000) - cachedJob.createdAt < 300) {
      console.log(`[StartAnalysis] Reuse existing fresh job for ${username}`);
      jobId = cachedJob.jobId;
    } else {
      // Create new job state
      jobId = await putUserJob(username, userFilms);
    }

    // 3. Dispatch Missing Films for Scraping (Background)
    const uniqueSlugs = [...new Set(userFilms.map((f) => f.slug))].map((slug) => ({ slug }));

    const missingFilmsDispatchPromise = (async () => {
      let dbItems = [];
      if (FILMS_TABLE) {
        try {
          dbItems = await batchGet(FILMS_TABLE, uniqueSlugs);
        } catch (err) {
          console.error('DynamoDB BatchGet failed:', err);
        }
      }
      const validSlugs = new Set(
        dbItems.filter((i) => i.year && i.year !== '????').map((i) => i.slug)
      );
      const missingFilms = userFilms.filter((f) => !validSlugs.has(f.slug));

      if (process.env.SQS_QUEUE_URL && missingFilms.length > 0) {
        console.log(`Dispatching ${missingFilms.length} missing films for scraping...`);
        const BATCH_SIZE = 10;
        const messages = [];
        for (let i = 0; i < missingFilms.length; i += BATCH_SIZE) {
          const chunk = missingFilms.slice(i, i + BATCH_SIZE).map((f) => f.slug);
          messages.push({ action: 'scrape_batch', slugs: chunk });
        }
        await sendMessageBatch(process.env.SQS_QUEUE_URL, messages);
      }
    })();

    await missingFilmsDispatchPromise; // Ensure dispatch happens before lambda freezes

    // 4. Return Accepted (202)
    return {
      statusCode: 202,
      body: JSON.stringify({
        status: 'accepted',
        message: 'Analysis started',
        jobId,
        username,
        totalFilms: userFilms.length,
      }),
    };
  } catch (error) {
    console.error('[StartAnalysis] Handler error:', error);

    let userMessage = 'An unexpected error occurred';
    let statusCode = 500;

    if (error.message?.includes('Page not found (404)')) {
      userMessage = 'Letterboxd user not found. Please check the username and try again.';
      statusCode = 404;
    } else if (error.message?.includes('Cloudflare challenge failed')) {
      userMessage =
        'Unable to access Letterboxd due to rate limiting. Please try again in a few minutes.';
      statusCode = 503;
    } else if (error.message?.includes('Unexpected page state')) {
      userMessage = 'Letterboxd returned an unexpected response. Please try again.';
      statusCode = 502;
    }

    return {
      statusCode,
      body: JSON.stringify({ error: userMessage }),
    };
  }
};
