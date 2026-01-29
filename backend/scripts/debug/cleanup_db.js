import { DynamoDBClient, ScanCommand, BatchWriteItemCommand } from '@aws-sdk/client-dynamodb';

const client = new DynamoDBClient({ region: 'eu-west-1' });
// Use environment variable or default to 'Films'
// Use environment variable or defaults
const FILMS_TABLE = process.env.FILMS_TABLE || 'Films';
const USER_JOBS_TABLE = process.env.USER_JOBS_TABLE || 'UserJobs';

async function truncateTable(tableName, keyName) {
  console.log(`Scanning table ${tableName}...`);
  let items = [];
  let lastEvaluatedKey = undefined;

  try {
    do {
      const command = new ScanCommand({
        TableName: tableName,
        ExclusiveStartKey: lastEvaluatedKey,
        ProjectionExpression: keyName,
      });
      const response = await client.send(command);
      if (response.Items) {
        items = items.concat(response.Items);
      }
      lastEvaluatedKey = response.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    console.log(`Found ${items.length} items to delete in ${tableName}.`);

    if (items.length === 0) return;

    // Batch Delete (25 max per batch)
    const batches = [];
    while (items.length > 0) {
      batches.push(items.splice(0, 25));
    }

    console.log(`Processing ${batches.length} batches...`);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const deleteRequests = batch.map((item) => ({
        DeleteRequest: {
          Key: item, // already has structure { [keyName]: { S: "value" } }
        },
      }));

      const command = new BatchWriteItemCommand({
        RequestItems: {
          [tableName]: deleteRequests,
        },
      });

      try {
        await client.send(command);
        process.stdout.write('.');
      } catch (err) {
        console.error('\nError deleting batch:', err);
      }
    }
    console.log(`\nCleanup Complete for ${tableName}.`);
  } catch (err) {
    console.error(`Error truncating ${tableName}:`, err);
  }
}

async function cleanup() {
  await truncateTable(FILMS_TABLE, 'slug');
  await truncateTable(USER_JOBS_TABLE, 'username');
}

cleanup();
