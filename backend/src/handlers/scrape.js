const { scrapeUserFilmsList } = require('../services/scraper');
const { sendMessageBatch } = require('../services/queue');

const SQS_QUEUE_URL = process.env.SQS_QUEUE_URL;

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event));

  try {
    // 1. Parse Input
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

    // 1. Scrape List Pages (Fast)
    const films = await scrapeUserFilmsList(username);
    console.log(`Found ${films.length} films for ${username}`);

    if (films.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'No films found', films: [] }),
      };
    }

    // 2. Send to SQS (Background Metadata Fetch)
    const sqsMessages = films.map((film) => ({
      slug: film.slug,
    }));

    try {
      await sendMessageBatch(SQS_QUEUE_URL, sqsMessages);
      console.log(`Queued ${sqsMessages.length} tasks to SQS`);
    } catch (err) {
      console.error('Failed to queue SQS messages:', err);
      // We continue even if SQS fails, so the user still gets their list
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
