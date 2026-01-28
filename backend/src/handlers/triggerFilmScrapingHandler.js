import { scrapeUserFilmsList } from '../services/letterboxdScrapingService.js';
import { sendMessageBatch } from '../services/sqsQueueService.js';
import { batchGet } from '../services/dynamoDbService.js';

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
    const minFilms = parseInt(body.minFilms || '5', 10);

    if (!username) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Username is required' }),
      };
    }

    // 2. Scrape User's Film List (fast - just list pages)
    const films = await scrapeUserFilmsList(username);
    console.log(`Found ${films.length} films for ${username}`);

    if (films.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'No films found', films: [] }),
      };
    }

    // 3. Check which films need metadata (not in cache or expired)
    const FILMS_TABLE = process.env.FILMS_TABLE;
    let filmsToQueue = films;

    if (FILMS_TABLE) {
      try {
        const uniqueSlugs = [...new Set(films.map((f) => f.slug))].map((slug) => ({ slug }));
        const existingItems = await batchGet(FILMS_TABLE, uniqueSlugs);

        // Only queue films that don't have valid metadata (year is a required field)
        const validSlugs = new Set(
          existingItems.filter((item) => item.year && item.year !== '????').map((item) => item.slug)
        );

        filmsToQueue = films.filter((film) => !validSlugs.has(film.slug));
        console.log(
          `Found ${existingItems.length} cached, ${validSlugs.size} valid. Queuing ${filmsToQueue.length} for scraping.`
        );
      } catch (dbError) {
        console.error('Failed to check DynamoDB, queuing all films:', dbError);
      }
    }

    // 4. Queue missing films for metadata scraping
    if (filmsToQueue.length > 0 && SQS_QUEUE_URL) {
      const BATCH_SIZE = 10;
      const PRIORITY_COUNT = Math.max(minFilms, 5);
      const filmsList = Array.isArray(filmsToQueue) ? filmsToQueue : [filmsToQueue];

      // Priority Batch (first N films for quick game start)
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

      // Background Batches (rest of films)
      const backgroundFilms = filmsList.slice(PRIORITY_COUNT);
      if (backgroundFilms.length > 0) {
        console.log(`[Trigger] Queueing remaining ${backgroundFilms.length} films in background.`);
        const sqsMessages = [];
        for (let i = 0; i < backgroundFilms.length; i += BATCH_SIZE) {
          const chunk = backgroundFilms.slice(i, i + BATCH_SIZE).map((f) => f.slug);
          sqsMessages.push({
            action: 'scrape_batch',
            slugs: chunk,
          });
        }
        await sendMessageBatch(SQS_QUEUE_URL, sqsMessages);
      }
    } else if (filmsToQueue.length === 0) {
      console.log('All films already have valid metadata cached.');
    }

    // 5. Return film list to frontend (includes ratings from list scrape)
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'List scraped successfully.',
        totalFilms: films.length,
        films: films, // Contains {slug, title, posterUrl, userRating}
      }),
    };
  } catch (error) {
    console.error('[TriggerFilmScraping] Handler error:', error);

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
