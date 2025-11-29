const { scrapeUserFilmsList } = require('../services/letterboxdScrapingService');
const { sendMessageBatch } = require('../services/sqsQueueService');

const SQS_QUEUE_URL = process.env.SQS_QUEUE_URL;

exports.handler = async (event) => {
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
        const { batchGet } = require('../services/dynamoDbService');
        const existingItems = await batchGet(FILMS_TABLE, uniqueSlugs);
        const existingSlugs = new Set(existingItems.map((item) => item.slug));

        filmsToQueue = films.filter((film) => !existingSlugs.has(film.slug));
        console.log(
          `Filtered ${existingItems.length} existing films. Queuing ${filmsToQueue.length} new/expired films.`
        );
      } catch (dbError) {
        console.error(
          'Failed to check DynamoDB for existing films, defaulting to queue all:',
          dbError
        );
      }
    } else {
      console.warn('FILMS_TABLE env var missing, skipping optimization.');
    }

    if (filmsToQueue.length === 0) {
      console.log('All films already exist in DB. Skipping SQS.');
    } else {
      // 3. Send to SQS (Background Metadata Fetch)
      const sqsMessages = filmsToQueue.map((film) => ({
        slug: film.slug,
      }));

      try {
        await sendMessageBatch(SQS_QUEUE_URL, sqsMessages);
        console.log(`Queued ${sqsMessages.length} tasks to SQS`);
      } catch (err) {
        console.error('Failed to queue SQS messages:', err);
        // We continue even if SQS fails, so the user still gets their list
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
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
