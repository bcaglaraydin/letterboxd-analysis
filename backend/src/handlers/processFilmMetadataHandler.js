import { scrapeFilmDetails } from '../services/letterboxdScrapingService.js';
import { putItem, getItem } from '../services/dynamoDbService.js';

const FILMS_TABLE = process.env.FILMS_TABLE;
const TTL_HOURS = 24;

export const handler = async (event) => {
  console.log(`Worker received ${event.Records.length} messages`);

  const batchItemFailures = [];

  await Promise.all(
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

        // 3. Store in DynamoDB with TTL
        const ttl = Math.floor(Date.now() / 1000) + TTL_HOURS * 60 * 60;
        await putItem(FILMS_TABLE, { ...filmDetails, ttl });
        console.log(`Stored film: ${slug}`);
      } catch (error) {
        console.error(`Error processing message ${record.messageId}:`, error);
        batchItemFailures.push({ itemIdentifier: record.messageId });
      }
    })
  );

  return { batchItemFailures };
};
