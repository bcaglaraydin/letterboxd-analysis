import { scrapeUserFilmsList } from 'letterboxd-scraper-engine';
import { sendMessageBatch } from '../services/sqsQueueService.js';
import { updateUserJob } from '../services/userJobService.js';
import { batchGet } from '../services/dynamoDbService.js';
import { Logger } from '../utils/logger.js';

const FILMS_TABLE = process.env.FILMS_TABLE;

export const handler = async (event, context) => {
  Logger.init(event, context);
  Logger.info(`Received ${event.Records.length} messages`);

  const batchItemFailures = [];

  await Promise.all(
    event.Records.map(async (record) => {
      try {
        const body = JSON.parse(record.body);
        const { action, username } = body;

        if (action === 'test_browser') {
          Logger.info('Running browser test...');
          try {
            const { fetchHtmlWithBrowser } = await import('../utils/browser.js');
            const html = await fetchHtmlWithBrowser('https://example.com');
            Logger.info(`Browser Test Success. HTML Length: ${html.length}`);
          } catch (e) {
            Logger.error('Browser Test Failed', e);
            throw e;
          }
          return;
        }

        if (action !== 'scrape_user_list' || !username) {
          Logger.warn('Invalid message', { body });
          return;
        }

        Logger.info(`Starting list scrape`, { username });

        // 1. Update Job Status -> Processing
        await updateUserJob(username, { status: 'processing' });

        // 2. Scrape List
        let userFilms;
        try {
          userFilms = await scrapeUserFilmsList(username);
          Logger.info(`Found ${userFilms.length} films for user`, { username });
        } catch (err) {
          Logger.error(`Scraping failed for user`, err, { username });
          await updateUserJob(username, {
            status: 'failed',
            error: err.message || 'Failed to scrape user list',
          });
          throw err; // Retry via SQS DLQ handling
        }

        if (userFilms.length === 0) {
          await updateUserJob(username, {
            status: 'failed',
            error: 'No films found for user',
          });
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
            Logger.error('DynamoDB BatchGet failed', err, { username });
          }
        }

        const validSlugs = new Set(
          dbItems.filter((i) => i.year && i.year !== '????').map((i) => i.slug)
        );
        const missingFilms = userFilms.filter((f) => !validSlugs.has(f.slug));

        if (process.env.SQS_QUEUE_URL && missingFilms.length > 0) {
          Logger.info(`Dispatching ${missingFilms.length} missing films to worker queue...`, {
            username,
          });
          const BATCH_SIZE = 10;
          const messages = [];
          for (let i = 0; i < missingFilms.length; i += BATCH_SIZE) {
            const chunk = missingFilms.slice(i, i + BATCH_SIZE).map((f) => f.slug);
            messages.push({ action: 'scrape_batch', slugs: chunk });
          }
          await sendMessageBatch(process.env.SQS_QUEUE_URL, messages);
        } else {
          Logger.info(`All ${userFilms.length} films already cached in DB.`, { username });
        }

        // 4. Update Job with Film Data (and keep status processing/pending until films are scraped?
        // Actually, statusHandler checks counts. We can just save the list now.)
        // Note: The original logic didn't mark "completed" here, it relied on caching.
        // But we should store the list of films in the job so status handler knows what to check.
        await updateUserJob(username, {
          films: userFilms,
          totalFilms: userFilms.length,
          updatedAt: Math.floor(Date.now() / 1000),
        });

        Logger.info(`Completed for user`, { username });
      } catch (error) {
        Logger.error(`Error processing message ${record.messageId}`, error);
        batchItemFailures.push({ itemIdentifier: record.messageId });
      }
    })
  );

  return { batchItemFailures };
};
