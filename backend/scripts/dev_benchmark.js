import { SQSClient, GetQueueAttributesCommand } from '@aws-sdk/client-sqs';
import { DynamoDBClient, ScanCommand, BatchWriteItemCommand } from '@aws-sdk/client-dynamodb';
import axios from 'axios';
import 'dotenv/config';

// CONFIG
const API_URL = 'https://mpnd4bu9jg.execute-api.eu-west-1.amazonaws.com';
const USERNAME = 'bcaglaraydin';
const FILMS_TABLE = 'Films'; // Assuming Dev shares 'Films'
const ACCOUNT_ID = '617969167018';
const QUEUE_NAME = 'film-scrape-queue';
const SQS_QUEUE_URL = `https://sqs.eu-west-1.amazonaws.com/${ACCOUNT_ID}/${QUEUE_NAME}`;

console.log('--- Dev Env Benchmark Config ---');
console.log(`API: ${API_URL}`);
console.log(`User: ${USERNAME}`);
console.log(`Table: ${FILMS_TABLE}`);
console.log(`Queue: ${SQS_QUEUE_URL}`);
console.log('--------------------------------\n');

const sqsClient = new SQSClient({ region: 'eu-west-1' });
const dynamoClient = new DynamoDBClient({ region: 'eu-west-1' });

// 1. CLEANUP DB
async function cleanupDb() {
  console.log(`[${new Date().toISOString()}] Cleaning up DynamoDB table: ${FILMS_TABLE}...`);
  let items = [];
  let lastEvaluatedKey = undefined;

  try {
    do {
      const command = new ScanCommand({
        TableName: FILMS_TABLE,
        ExclusiveStartKey: lastEvaluatedKey,
        ProjectionExpression: 'slug',
      });
      const response = await dynamoClient.send(command);
      if (response.Items) items.push(...response.Items);
      lastEvaluatedKey = response.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    if (items.length === 0) {
      console.log('Table is already empty.');
      return;
    }

    console.log(`Deleting ${items.length} items...`);
    for (let i = 0; i < items.length; i += 25) {
      const batch = items.slice(i, i + 25);
      const deleteRequests = batch.map((item) => ({
        DeleteRequest: { Key: item },
      }));

      await dynamoClient.send(
        new BatchWriteItemCommand({
          RequestItems: { [FILMS_TABLE]: deleteRequests },
        })
      );
      process.stdout.write('.');
    }
    console.log('\nCleanup Complete.');
  } catch (err) {
    console.error('Cleanup failed:', err);
    process.exit(1);
  }
}

// 2. MONITOR SQS
async function checkSqsDepth() {
  try {
    const command = new GetQueueAttributesCommand({
      QueueUrl: SQS_QUEUE_URL,
      AttributeNames: ['ApproximateNumberOfMessages', 'ApproximateNumberOfMessagesNotVisible'],
    });
    const response = await sqsClient.send(command);
    const visible = response.Attributes.ApproximateNumberOfMessages;
    const inflight = response.Attributes.ApproximateNumberOfMessagesNotVisible;
    return `Visible: ${visible}, InFlight: ${inflight}`;
  } catch (err) {
    return `Error: ${err.message}`;
  }
}

// 3. MAIN FLOW
async function runBenchmark() {
  await cleanupDb();

  console.log(`\n[${new Date().toISOString()}] Starting Benchmark...`);
  const startTime = Date.now();

  // Step 1: Trigger Game (POST)
  console.log(`[T+0s] Sending POST /metrics (Trigger)...`);
  const postStart = Date.now();

  try {
    const postRes = await axios.post(`${API_URL}/metrics`, { username: USERNAME });
    const postDuration = (Date.now() - postStart) / 1000;

    console.log(
      `[T+${Math.round((Date.now() - startTime) / 1000)}s] POST returned in ${postDuration}s`
    );
    console.log(`Status: ${postRes.data.status}`);

    if (postRes.data.ratingGame) {
      console.log(`✅ GAME READY (Partial). 5 Movies received.`);
    } else {
      console.log(`⚠️ Game NOT ready yet.`);
    }
  } catch (postErr) {
    const postDuration = (Date.now() - postStart) / 1000;
    console.warn(
      `[T+${Math.round((Date.now() - startTime) / 1000)}s] POST Failed in ${postDuration}s`
    );

    if (postErr.response) {
      console.warn(`Status: ${postErr.response.status} ${postErr.response.statusMessage}`);
      if (postErr.response.status === 503 || postErr.response.status === 504) {
        console.log(
          '⚠️  Timeout/Service Unavailable. Lambda likely still running in background. Continuing loop...'
        );
      } else {
        throw postErr;
      }
    } else {
      console.warn('Network Error:', postErr.message);
      // Don't throw if network error, maybe try polling anyway?
      // But typically implies no connection. We'll throw.
      throw postErr;
    }
  }

  // Step 2: Poll for Full Stats (GET)
  console.log(`\nPolling GET /metrics/status for full stats...`);
  let isFullReady = false;
  const pollInterval = 5000;

  while (!isFullReady) {
    await new Promise((r) => setTimeout(r, pollInterval));
    const now = (Date.now() - startTime) / 1000;

    const [sqsStatus, apiRes] = await Promise.all([
      checkSqsDepth(),
      axios
        .get(`${API_URL}/metrics/status`, { params: { username: USERNAME } })
        .catch((e) => ({ error: e })),
    ]);

    if (apiRes.error) {
      // If GET also fails with 503, wait longer?
      if (apiRes.error.response?.status === 503) {
        console.log(
          `[T+${Math.round(now)}s] GET 503 (Lambda busy?). Retrying... SQS: ${sqsStatus}`
        );
      } else {
        console.log(
          `[T+${Math.round(now)}s] API Error: ${apiRes.error.message} (${apiRes.error.response?.status}) | SQS: ${sqsStatus}`
        );
      }
      continue;
    }

    const status = apiRes.data.status;
    const progress = apiRes.data.progress ? (apiRes.data.progress * 100).toFixed(1) + '%' : 'N/A';
    // Count rated from status logs? No, API doesn't return count directly unless I parse progress.

    console.log(
      `[T+${Math.round(now)}s] Status: ${apiRes.data.status} | Progress: ${progress} | SQS: ${sqsStatus}`
    );

    // Check if Partial Ready (Game start success despite POST failure?)
    if (status === 'partial_ready' && !isFullReady) {
      // Just log it.
      // console.log('Partial Ready detected via polling.');
    }

    if (status === 'ready') {
      isFullReady = true;
      console.log(`\n✅ FULL STATS READY!`);
      console.log(`Total Duration: ${now}s`);
    } else if (Date.now() - startTime > 600000) {
      // 10 mins
      console.log('Timeout reached (10m).');
      break;
    }
  }
}

runBenchmark();
