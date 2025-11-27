const { scrapeUserFilms } = require('../services/scraper');

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

    // 2. Call Service
    const films = await scrapeUserFilms(username);

    return {
      statusCode: 200,
      body: JSON.stringify({
        films: films,
        total: films.length,
        scraped_at: new Date().toISOString(),
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
