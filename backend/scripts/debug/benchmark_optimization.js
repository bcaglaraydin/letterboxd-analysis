import { DynamoDBClient, BatchWriteItemCommand } from '@aws-sdk/client-dynamodb';
import { scrapeUserFilmsList } from '../../src/services/letterboxdScrapingService.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env vars from backend/.env
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const API_ENDPOINT = 'https://mpnd4bu9jg.execute-api.eu-west-1.amazonaws.com'; // Hardcoded for now, or use process.env.API_ENDPOINT
const USERNAME = 'bcaglaraydin';
const TABLE_NAME = process.env.FILMS_TABLE || 'Films';
const REGION = process.env.AWS_REGION || 'eu-west-1';

const client = new DynamoDBClient({ region: REGION });

/**
 * Split array into chunks
 */
function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Clear specific films from DynamoDB
 */
async function clearFilmsFromDynamo(slugs) {
  console.log(`[Setup] Clearing ${slugs.length} films from DynamoDB Table: ${TABLE_NAME}...`);

  if (slugs.length === 0) return;

  const chunks = chunkArray(slugs, 25); // BatchWriteItem limit is 25
  let deletedCount = 0;

  for (const chunk of chunks) {
    const deleteRequests = chunk.map((slug) => ({
      DeleteRequest: {
        Key: {
          slug: { S: slug },
        },
      },
    }));

    const params = {
      RequestItems: {
        [TABLE_NAME]: deleteRequests,
      },
    };

    try {
      await client.send(new BatchWriteItemCommand(params));
      deletedCount += chunk.length;
      process.stdout.write(`\r[Setup] Deleted ${deletedCount}/${slugs.length}`);
    } catch (err) {
      console.error(`\n[Setup] Error deleting batch:`, err.message);
    }
  }
  console.log('\n[Setup] DynamoDB cleanup complete.');
}

/**
 * Main Benchmark Function
 */
async function runBenchmark() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║           SCRAPING OPTIMIZATION BENCHMARK                      ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log(`Target User: ${USERNAME}`);
  console.log(`Table: ${TABLE_NAME}`);
  console.log(`Region: ${REGION}\n`);

  try {
    // 1. Fetch List to identify Slugs
    console.log('[Step 1] Fetching user film list (Live Scrape)...');
    const films = await scrapeUserFilmsList(USERNAME);
    const slugs = films.map((f) => f.slug);
    console.log(`[Step 1] Found ${slugs.length} films.`);

    // 2. Clear DynamoDB
    console.log('[Step 2] Clearing DynamoDB to ensure Cold Start...');
    await clearFilmsFromDynamo(slugs);

    // 3. Trigger Scrape
    console.log('\n[Step 3] Triggering Cloud Scraping Process...');
    // Measure Trigger Latency

    // We expect the trigger to return quickly (after list scrape verification)
    const triggerRes = await fetch(`${API_ENDPOINT}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: USERNAME }),
    });

    if (!triggerRes.ok && triggerRes.status !== 503 && triggerRes.status !== 504) {
      const text = await triggerRes.text();
      throw new Error(`Trigger failed: ${triggerRes.status} ${text}`);
    }
    console.log('[Step 3] Trigger API call successful.');

    // 4. Poll for Completion
    console.log('[Step 4] Polling for completion...');
    const startTime = Date.now();
    let status = 'pending';

    while (status !== 'ready') {
      await new Promise((r) => setTimeout(r, 2000));

      const res = await fetch(`${API_ENDPOINT}/metrics/status?username=${USERNAME}&minFilms=5`);
      if (res.ok) {
        const data = await res.json();
        status = data.status;
        const progress = data.progress || 0;
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        process.stdout.write(
          `\rTime: ${elapsed}s | Status: ${status} | Progress: ${(progress * 100).toFixed(0)}%`
        );

        if (status === 'error') {
          console.log('\n❌ Scrape failed.');
          process.exit(1);
        }

        if (elapsed > 600) {
          // 10 min timeout
          console.log('\n❌ Timeout.');
          process.exit(1);
        }
      }
    }

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n\n✅ BENCHMARK COMPLETE`);
    console.log(`Total Processing Time: ${totalTime} seconds`);
    console.log(`Throughput: ${(slugs.length / totalTime).toFixed(2)} films/sec`);
  } catch (err) {
    console.error('\n❌ Benchmark Error:', err);
    process.exit(1);
  }
}

runBenchmark();
