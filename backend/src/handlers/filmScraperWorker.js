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

        // --- ACTION: SCRAPE BATCH ---
        if (body.action === 'scrape_batch') {
          const { slugs } = body;
          if (!slugs || !Array.isArray(slugs)) {
            console.warn('Batch message missing slugs array:', body);
            return;
          }
          await handleBatchFilmScrape(slugs);
          return;
        }

        // --- ACTION: SCRAPE FILM (Default/Legacy) ---
        const slug = body.slug;
        if (!slug) {
          console.warn('Message missing slug or unknown action:', body);
          return;
        }
        await handleFilmScrape(slug);
      } catch (error) {
        console.error(`Error processing message ${record.messageId}:`, error);
        batchItemFailures.push({ itemIdentifier: record.messageId });
      }
    })
  );

  return { batchItemFailures };
};

/**
 * Scrapes a batch of films sequentially in the same Lambda/Browser session.
 */
async function handleBatchFilmScrape(slugs) {
  if (!slugs || slugs.length === 0) return;

  console.log(`[Worker] Starting Batch Scrape for ${slugs.length} films...`);

  for (const slug of slugs) {
    try {
      await handleFilmScrape(slug);
    } catch (err) {
      console.error(`[Worker] Failed to scrape ${slug} in batch:`, err);
      // Continue to next film in batch
    }
  }
  console.log(`[Worker] Batch Scrape Complete.`);
}

/**
 * Scrapes details for a single film and stores it in FILMS table.
 */
async function handleFilmScrape(slug) {
  const url = `https://letterboxd.com/film/${slug}/`;

  // 1. Check if film already exists with valid metadata
  if (FILMS_TABLE) {
    const existing = await getItem(FILMS_TABLE, { slug });
    if (existing && existing.year && existing.year !== '????') {
      console.log(`[Worker] Film already exists (Skipping): ${slug}`);
      return;
    }
  }

  // 2. Scrape film details
  console.log(`[Worker] Scraping details for: ${slug}`);
  const filmDetails = await scrapeFilmDetails(slug, url);

  // 3. Store in DynamoDB with TTL
  const ttl = Math.floor(Date.now() / 1000) + TTL_HOURS * 60 * 60;
  if (FILMS_TABLE) {
    await putItem(FILMS_TABLE, { ...filmDetails, ttl });
    console.log(`[Worker] Stored film: ${slug}`);
  }
}
