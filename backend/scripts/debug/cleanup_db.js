import { DynamoDBClient, ScanCommand, BatchWriteItemCommand } from '@aws-sdk/client-dynamodb';

const client = new DynamoDBClient({ region: 'eu-west-1' });
// Use environment variable or default to 'Films'
const TABLE_NAME = process.env.FILMS_TABLE || 'Films';

async function cleanup() {
  console.log(`Scanning table ${TABLE_NAME}...`);
  let items = [];
  let lastEvaluatedKey = undefined;

  try {
    do {
      const command = new ScanCommand({
        TableName: TABLE_NAME,
        ExclusiveStartKey: lastEvaluatedKey,
        ProjectionExpression: 'slug', // Partition key
      });
      const response = await client.send(command);
      if (response.Items) {
        items = items.concat(response.Items);
      }
      lastEvaluatedKey = response.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    console.log(`Found ${items.length} items to delete.`);

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
          Key: item, // item is { slug: { S: "value" } } already from Scan
        },
      }));

      const command = new BatchWriteItemCommand({
        RequestItems: {
          [TABLE_NAME]: deleteRequests,
        },
      });

      try {
        await client.send(command);
        process.stdout.write('.');
      } catch (err) {
        console.error('\nError deleting batch:', err);
      }
    }
    console.log('\nCleanup Complete.');
  } catch (err) {
    console.error('Fatal Error:', err);
  }
}

cleanup();
