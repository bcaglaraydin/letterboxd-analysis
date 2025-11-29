import 'dotenv/config';
import { sendMessageBatch } from '../src/services/sqsQueueService.js';
import { getItem, deleteItem } from '../src/services/dynamoDbService.js';

const SQS_QUEUE_URL = process.env.SQS_QUEUE_URL;
const FILMS_TABLE = process.env.FILMS_TABLE;

async function run() {
  const slug = 'dune-2021';
  console.log(`Verifying Step 2 for film: ${slug}`);

  try {
    // 0. Clean up existing item to force re-scrape
    console.log('Deleting existing item from DynamoDB...');
    await deleteItem(FILMS_TABLE, { slug });

    // 1. Send Message to SQS
    console.log('Sending message to SQS...');
    await sendMessageBatch(SQS_QUEUE_URL, [{ slug }]);
    console.log('Message sent.');

    // 2. Poll DynamoDB for result
    console.log('Polling DynamoDB for result (timeout 30s)...');
    const startTime = Date.now();
    let film = null;

    while (Date.now() - startTime < 30000) {
      film = await getItem(FILMS_TABLE, { slug });
      if (film) {
        console.log('Film found in DynamoDB!');
        console.log('Title:', film.title);
        console.log('Director:', film.director);
        console.log('Themes:', film.themes);
        console.log('Scraped At:', film.scrapedAt);
        console.log('Film:', film);
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2s
      process.stdout.write('.');
    }

    if (!film) {
      console.error('\nVerification failed: Film not found in DynamoDB after 30s.');
      process.exit(1);
    } else {
      console.log('\nVerification SUCCESS!');
    }
  } catch (error) {
    console.error('\nVerification failed with error:', error);
    process.exit(1);
  }
}

run();
