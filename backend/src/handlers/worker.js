const { scrapeFilmDetails } = require('../services/scraper');
const { putItem, getItem } = require('../services/dynamo');

const FILMS_TABLE = process.env.FILMS_TABLE;

exports.handler = async (event) => {
  console.log(`Worker received ${event.Records.length} messages`);

  const results = await Promise.all(
    event.Records.map(async (record) => {
      try {
        const body = JSON.parse(record.body);
        const { slug } = body;
        const url = `https://letterboxd.com/film/${slug}/`;

        if (!slug) {
          console.warn('Message missing slug:', body);
          return;
        }

        // 1. Check if film exists in DynamoDB
        const existingFilm = await getItem(FILMS_TABLE, { slug });
        if (existingFilm) {
          console.log(`Film already exists: ${slug}`);
          return;
        }

        // 2. Scrape Film Details
        console.log(`Scraping details for: ${slug}`);
        const filmDetails = await scrapeFilmDetails(slug, url);

        // 3. Store in DynamoDB
        await putItem(FILMS_TABLE, filmDetails);
        console.log(`Stored film: ${slug}`);
      } catch (error) {
        console.error(`Error processing message: ${record.body}`, error);
        // In a real system, we might want to throw here to trigger SQS retry/DLQ
        // For now, we log and continue to avoid blocking the batch
      }
    })
  );

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Worker processed batch', count: results.length }),
  };
};
