import { scrapeUserFilmsList } from '../services/letterboxdScrapingService.js';
import { sendMessageBatch } from '../services/sqsQueueService.js';
import { batchGet, putItem } from '../services/dynamoDbService.js';

const SQS_QUEUE_URL = process.env.SQS_QUEUE_URL;

export const handler = async (event) => {
  console.log('Event:', JSON.stringify(event));

  try {
    // 1. Parse Input
    let body = {};
    try {
      if (event.body) {
        body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
      }
    } catch (parseError) {
      console.error('Failed to parse event body:', parseError);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid JSON in request body' }),
      };
    }
    const username = body.username;
    // Use minFilms from frontend, default to 5 if not provided
    const minFilms = parseInt(body.minFilms || '5', 10);

    if (!username) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Username is required' }),
      };
    }

    // 1. Scrape List Pages (Fast)
    const films = await scrapeUserFilmsList(username);
    console.log(`Found ${films.length} films for ${username}`);

    if (films.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'No films found', films: [] }),
      };
    }

    // 2. Filter Existing Films (Optimization)
    // Check DynamoDB to see which films we already have metadata for (and are not expired)
    const uniqueSlugs = [...new Set(films.map((f) => f.slug))].map((slug) => ({ slug }));

    // We need FILMS_TABLE env var
    const FILMS_TABLE = process.env.FILMS_TABLE;
    let filmsToQueue = films;

    if (FILMS_TABLE) {
      try {
        // SAVE USER LIST STATE (Critical for Status Handler)
        const userItem = {
          slug: `USER#${username}`,
          films: films.map((f) => ({ slug: f.slug, userRating: f.userRating })),
          totalFilms: films.length,
          status: 'processing',
          updatedAt: new Date().toISOString(),
          // TTL: 30 days
          ttl: Math.floor(Date.now() / 1000) + 86400 * 30,
        };
        await putItem(FILMS_TABLE, userItem);
        console.log(`Saved user list state for ${username}`);

        const existingItems = await batchGet(FILMS_TABLE, uniqueSlugs);
        const existingSlugs = new Set(existingItems.map((item) => item.slug));

        filmsToQueue = films.filter((film) => !existingSlugs.has(film.slug));
        console.log(
          `Filtered ${existingItems.length} existing films. Queuing ${filmsToQueue.length} new/expired films.`
        );
      } catch (dbError) {
        console.error(
          'Failed to check/update DynamoDB (User List or Filtering), defaulting to queue all:',
          dbError
        );
      }
    } else {
      console.warn('FILMS_TABLE env var missing, skipping optimization.');
    }

    if (filmsToQueue.length === 0) {
      console.log('All films already exist in DB. Skipping SQS.');
    } else {
      // 3. Send to SQS (Background Metadata Fetch) - Optimized Priority Scraping
      const BATCH_SIZE = 10;
      // Use minFilms for priority count, ensuring at least minFilms are sent immediately
      const PRIORITY_COUNT = Math.max(minFilms, 5);
      const filmsList = Array.isArray(filmsToQueue) ? filmsToQueue : [filmsToQueue]; // Ensure array

      if (filmsList.length > 0) {
        // A. Priority Batch (First 6)
        const priorityBatch = filmsList.slice(0, PRIORITY_COUNT);
        if (priorityBatch.length > 0) {
          console.log(`[Trigger] Sending PRIORITY batch of ${priorityBatch.length} films.`);
          await sendMessageBatch(SQS_QUEUE_URL, [
            {
              action: 'scrape_batch',
              slugs: priorityBatch.map((f) => f.slug),
            },
          ]);
        }

        // B. Background Batches (The rest)
        const backgroundFilms = filmsList.slice(PRIORITY_COUNT);
        if (backgroundFilms.length > 0) {
          console.log(
            `[Trigger] Queueing remaining ${backgroundFilms.length} films in background.`
          );
          const sqsMessages = [];
          for (let i = 0; i < backgroundFilms.length; i += BATCH_SIZE) {
            const chunk = backgroundFilms.slice(i, i + BATCH_SIZE).map((f) => f.slug);
            sqsMessages.push({
              action: 'scrape_batch',
              slugs: chunk,
            });
          }
          // Send background messages (we could await this, or let Lambda run it)
          // Awaiting ensures reliability.
          await sendMessageBatch(SQS_QUEUE_URL, sqsMessages);
        }
      }
    }

    // 3. Return List to Frontend
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'List scraped successfully. Metadata fetching started.',
        totalFilms: films.length,
        films: films,
      }),
    };
  } catch (error) {
    console.error('[TriggerFilmScraping] Handler error:', error);

    // Return specific error messages for known error types
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
