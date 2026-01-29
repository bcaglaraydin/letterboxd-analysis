import { scrapeUserFilmsList } from '../services/letterboxdScrapingService.js';
import { sendMessageBatch } from '../services/sqsQueueService.js';
import { updateUserJob } from '../services/userJobService.js';
import { batchGet } from '../services/dynamoDbService.js';

const FILMS_TABLE = process.env.FILMS_TABLE;

export const handler = async (event) => {
  console.log(`[ListScraper] Received ${event.Records.length} messages`);

  const batchItemFailures = [];

  await Promise.all(
    event.Records.map(async (record) => {
      try {
        const body = JSON.parse(record.body);
        const { action, username, jobId } = body;

        if (action !== 'scrape_user_list' || !username) {
          console.warn('[ListScraper] Invalid message:', body);
          return;
        }

        console.log(`[ListScraper] Starting list scrape for: ${username} (Job: ${jobId})`);

        // 1. Update Job Status -> Processing
        if (jobId) {
          await updateUserJob(username, { status: 'processing' });
        }

        // 2. Scrape List
        let userFilms;
        try {
          userFilms = await scrapeUserFilmsList(username);
          console.log(`[ListScraper] Found ${userFilms.length} films for ${username}`);
        } catch (err) {
          console.error(`[ListScraper] Scraping failed for ${username}:`, err);
          if (jobId) {
            await updateUserJob(username, {
              status: 'failed',
              error: err.message || 'Failed to scrape user list',
            });
          }
          throw err; // Retry via SQS DLQ handling if configured, or fail
        }

        if (userFilms.length === 0) {
          if (jobId) {
            await updateUserJob(username, {
              status: 'failed',
              error: 'No films found for user',
            });
          }
          return;
        }

        // 3. Dispatch Missing Films to Film Queue
        const uniqueSlugs = [...new Set(userFilms.map((f) => f.slug))].map((slug) => ({ slug }));

        // Filter out films we already have valid metadata for
        let dbItems = [];
        if (FILMS_TABLE) {
          try {
            dbItems = await batchGet(FILMS_TABLE, uniqueSlugs);
          } catch (err) {
            console.error('[ListScraper] DynamoDB BatchGet failed:', err);
          }
        }

        const validSlugs = new Set(
          dbItems.filter((i) => i.year && i.year !== '????').map((i) => i.slug)
        );
        const missingFilms = userFilms.filter((f) => !validSlugs.has(f.slug));

        if (process.env.SQS_QUEUE_URL && missingFilms.length > 0) {
          console.log(
            `[ListScraper] Dispatching ${missingFilms.length} missing films to worker queue...`
          );
          const BATCH_SIZE = 10;
          const messages = [];
          for (let i = 0; i < missingFilms.length; i += BATCH_SIZE) {
            const chunk = missingFilms.slice(i, i + BATCH_SIZE).map((f) => f.slug);
            messages.push({ action: 'scrape_batch', slugs: chunk });
          }
          await sendMessageBatch(process.env.SQS_QUEUE_URL, messages);
        } else {
          console.log(`[ListScraper] All ${userFilms.length} films already cached in DB.`);
        }

        // 4. Update Job with Film Data (and keep status processing/pending until films are scraped?
        // Actually, statusHandler checks counts. We can just save the list now.)
        // Note: The original logic didn't mark "completed" here, it relied on caching.
        // But we should store the list of films in the job so status handler knows what to check.
        if (jobId) {
          await updateUserJob(username, {
            films: userFilms,
            totalFilms: userFilms.length,
            // We don't mark as 'ready' yet, the status handler derives readiness from DB presence
            updatedAt: Math.floor(Date.now() / 1000),
          });
        }

        console.log(`[ListScraper] Completed for ${username}`);
      } catch (error) {
        console.error(`[ListScraper] Error processing message ${record.messageId}:`, error);
        batchItemFailures.push({ itemIdentifier: record.messageId });
      }
    })
  );

  return { batchItemFailures };
};
