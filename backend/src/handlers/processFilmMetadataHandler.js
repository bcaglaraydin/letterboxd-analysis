import { scrapeFilmDetails, scrapeUserFilmsList } from '../services/letterboxdScrapingService.js';
import { putItem, getItem, batchGet } from '../services/dynamoDbService.js';
import { sendMessageBatch } from '../services/sqsQueueService.js';

const FILMS_TABLE = process.env.FILMS_TABLE;
const SQS_QUEUE_URL = process.env.SQS_QUEUE_URL;
const TTL_HOURS = 24;

export const handler = async (event) => {
  console.log(`Worker received ${event.Records.length} messages`);

  const batchItemFailures = [];

  await Promise.all(
    event.Records.map(async (record) => {
      try {
        const body = JSON.parse(record.body);

        // --- ACTION: SCRAPE USER LIST ---
        if (body.action === 'scrape_user_list') {
          const { username } = body;
          if (!username) {
            console.warn('User scrape message missing username:', body);
            return;
          }
          await handleUserListScrape(username);
          return;
        }

        // --- ACTION: SCRAPE FILM (Default) ---
        // Existing logic for film metadata scraping (message is just { slug: ... } or { action: 'scrape_film', slug: ... })
        const slug = body.slug;
        if (!slug) {
          // If it's not a film scrape and not a user scrape, generic warning
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
 * Scrapes a user's film list, stores it, and dispatches tasks for missing film metadata.
 */
async function handleUserListScrape(username) {
  console.log(`[Worker] Scraping list for user: ${username}`);

  // 1. Scrape User Films
  let userFilms;
  try {
    userFilms = await scrapeUserFilmsList(username);
    console.log(`[Worker] Found ${userFilms.length} films for ${username}`);
  } catch (error) {
    console.error(`[Worker] Failed to scrape user list for ${username}:`, error);

    // Write Error State to DB to stop infinite loading on Frontend
    if (FILMS_TABLE) {
      await putItem(FILMS_TABLE, {
        slug: `USER#${username}`,
        status: 'error',
        error: error.message || 'Failed to scrape user list',
        ttl: Math.floor(Date.now() / 1000) + 3600,
      });
      console.log(`[Worker] Saved ERROR state for ${username}`);
    }
    return; // Stop processing, do not retry
  }

  if (userFilms.length === 0) {
    console.warn(`[Worker] No films found for ${username} (or scrape failed).`);
    // treat as empty list or error? For now, empty list is valid but boring.
    // If it was a scrape failure, it would be caught above.
    return;
  }

  // 2. Store User List (USER#<username>)
  const ttl = Math.floor(Date.now() / 1000) + 3600; // 1 hour TTL
  const userItem = {
    slug: `USER#${username}`,
    films: userFilms.map((f) => ({ slug: f.slug, userRating: f.userRating })),
    totalFilms: userFilms.length,
    ttl,
  };

  if (FILMS_TABLE) {
    await putItem(FILMS_TABLE, userItem);
    console.log(`[Worker] Saved user list for ${username}`);
  }

  // 3. Dispatch Missing Films (Metadata Check)
  // Check which films we already have metadata for
  const uniqueSlugs = [...new Set(userFilms.map((f) => f.slug))].map((slug) => ({ slug }));

  // Verify we really need metadata (BatchGet)
  // Optimization: If list is huge (2000), batchGet might be heavy.
  // Ideally we chop it. For now, assume batchGet handles limits or we paginate helpers.
  // Actually, `batchGet` in dynamoDbService.js handles batching (100 items limit).
  // So it's safe to call with all slugs.

  let dbItems = [];
  if (FILMS_TABLE) {
    dbItems = await batchGet(FILMS_TABLE, uniqueSlugs);
  }

  const metadataMap = new Map();
  dbItems.forEach((item) => metadataMap.set(item.slug, item));

  // Identify missing metadata
  // We check for 'year' to confirm valid metadata exists
  const missingFilms = userFilms.filter(
    (f) => !metadataMap.has(f.slug) || !metadataMap.get(f.slug)?.year
  );

  if (missingFilms.length > 0 && SQS_QUEUE_URL) {
    console.log(`[Worker] Dispatching ${missingFilms.length} missing films for ${username}`);
    const messages = missingFilms.map((f) => ({ slug: f.slug }));
    await sendMessageBatch(SQS_QUEUE_URL, messages);
  } else {
    console.log(`[Worker] All ${userFilms.length} films have metadata cached.`);
  }
}

/**
 * Scrapes details for a single film and stores it.
 */
async function handleFilmScrape(slug) {
  const url = `https://letterboxd.com/film/${slug}/`;

  // 1. Check existence (Double check to avoid race conditions or redundant work)
  if (FILMS_TABLE) {
    const existing = await getItem(FILMS_TABLE, { slug });
    if (existing && existing.year) {
      console.log(`[Worker] Film already exists (Skipping): ${slug}`);
      return;
    }
  }

  // 2. Scrape
  console.log(`[Worker] Scraping details for: ${slug}`);
  const filmDetails = await scrapeFilmDetails(slug, url);

  // 3. Store
  const ttl = Math.floor(Date.now() / 1000) + TTL_HOURS * 60 * 60;
  if (FILMS_TABLE) {
    await putItem(FILMS_TABLE, { ...filmDetails, ttl });
    console.log(`[Worker] Stored film: ${slug}`);
  }
}
