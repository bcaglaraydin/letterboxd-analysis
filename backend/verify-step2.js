const { sendMessageBatch } = require('./src/services/queue');
const { getItem } = require('./src/services/dynamo');

const SQS_QUEUE_URL = 'https://sqs.eu-west-1.amazonaws.com/REDACTED_AWS_ACCOUNT_ID/film-scrape-queue';
const FILMS_TABLE = 'Films';

async function verify() {
  const slug = 'dune-2021';
  console.log(`Verifying Step 2 for film: ${slug}`);

  try {
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
        console.log('Scraped At:', film.scrapedAt);
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2s
      process.stdout.write('.');
    }

    if (!film) {
      console.error('\nVerification failed: Film not found in DynamoDB after 30s.');
    } else {
      console.log('\nVerification SUCCESS!');
    }
  } catch (error) {
    console.error('\nVerification failed with error:', error);
  }
}

verify();
