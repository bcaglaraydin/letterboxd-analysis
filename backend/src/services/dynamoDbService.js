import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  BatchWriteCommand,
  BatchGetCommand,
  GetCommand,
  DeleteCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';

export const client = new DynamoDBClient();
export const docClient = DynamoDBDocumentClient.from(client);

export async function putItem(tableName, item, options = {}) {
  const commandInput = {
    TableName: tableName,
    Item: item,
  };

  if (options.conditionExpression) {
    commandInput.ConditionExpression = options.conditionExpression;
  }

  const command = new PutCommand(commandInput);
  return docClient.send(command);
}

export async function updateItem(
  tableName,
  key,
  updateExpression,
  expressionAttributeValues,
  expressionAttributeNames
) {
  const commandInput = {
    TableName: tableName,
    Key: key,
    UpdateExpression: updateExpression,
    ExpressionAttributeValues: expressionAttributeValues,
  };

  if (expressionAttributeNames) {
    commandInput.ExpressionAttributeNames = expressionAttributeNames;
  }

  const command = new UpdateCommand(commandInput);
  return docClient.send(command);
}

export async function getItem(tableName, key) {
  const command = new GetCommand({
    TableName: tableName,
    Key: key,
  });
  const response = await docClient.send(command);
  return response.Item;
}

export async function deleteItem(tableName, key) {
  const command = new DeleteCommand({
    TableName: tableName,
    Key: key,
  });
  return docClient.send(command);
}

export async function batchWrite(tableName, items) {
  if (!items || items.length === 0) return;

  // DynamoDB BatchWrite limit is 25
  const batchSize = 25;
  for (let i = 0; i < items.length; i += batchSize) {
    let batch = items.slice(i, i + batchSize);
    let attempt = 0;

    while (batch.length > 0 && attempt < 3) {
      const putRequests = batch.map((item) => ({
        PutRequest: {
          Item: item,
        },
      }));

      const command = new BatchWriteCommand({
        RequestItems: {
          [tableName]: putRequests,
        },
      });

      try {
        const response = await docClient.send(command);

        if (response.UnprocessedItems && response.UnprocessedItems[tableName]) {
          const unprocessed = response.UnprocessedItems[tableName];
          console.warn(`BatchWrite: ${unprocessed.length} items unprocessed. Retrying...`);
          // Extract the original items from the PutRequest objects to retry
          batch = unprocessed.map((req) => req.PutRequest.Item);
          attempt++;
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt)); // Exponential backoffish
        } else {
          batch = []; // All done
        }

        if (attempt === 0) {
          console.log(`Wrote batch of ${putRequests.length} items to ${tableName}.`);
        }
      } catch (error) {
        console.error(`Error batch writing to ${tableName}:`, error);
        throw error;
      }
    }

    if (batch.length > 0) {
      console.error(`Failed to write ${batch.length} items to ${tableName} after 3 attempts.`);
    }
  }
}

export async function batchGet(tableName, keys) {
  if (!keys || keys.length === 0) return [];

  const batchSize = 100;
  const chunks = [];
  for (let i = 0; i < keys.length; i += batchSize) {
    chunks.push(keys.slice(i, i + batchSize));
  }

  const results = [];

  // Process sequentially to avoid throttling/provisioned throughput exceptions
  for (const batchKeys of chunks) {
    let attempt = 0;
    let items = [];
    let currentKeys = batchKeys;

    while (currentKeys.length > 0 && attempt < 5) {
      // Increased retries to 5
      const command = new BatchGetCommand({
        RequestItems: {
          [tableName]: { Keys: currentKeys },
        },
      });

      try {
        console.log(`[BatchGet] Requesting ${currentKeys.length} keys from ${tableName}`);
        const response = await docClient.send(command);
        if (response.Responses && response.Responses[tableName]) {
          const found = response.Responses[tableName].length;
          console.log(`[BatchGet] Got ${found} items from ${tableName}`);
          items = items.concat(response.Responses[tableName]);
        } else {
          console.warn(`[BatchGet] Response empty for ${tableName}`);
        }

        if (response.UnprocessedKeys && response.UnprocessedKeys[tableName]) {
          const unprocessed = response.UnprocessedKeys[tableName];
          console.warn(
            `BatchGet: ${unprocessed.Keys.length} keys unprocessed. Retrying (attempt ${attempt + 1})...`
          );
          currentKeys = unprocessed.Keys;
          attempt++;
          // Exponential backoff: 500ms, 1000ms, 2000ms, 4000ms, 8000ms
          await new Promise((resolve) => setTimeout(resolve, 500 * Math.pow(2, attempt)));
        } else {
          currentKeys = [];
        }
      } catch (error) {
        console.error(`Error batch getting from ${tableName}:`, error);
        // If it's a throughput error, wait and retry. Else throw?
        // For simplicity, we define general retry logic above, but catching error here might break the loop.
        // Let's assume transient errors can be retried if we had logic, but here we just log and throw to be safe or maybe continue?
        // Better to throw so we know something is wrong.
        throw error;
      }
    }

    if (currentKeys.length > 0) {
      console.error(
        `Failed to get batch from ${tableName} after 5 attempts. Missing ${currentKeys.length} items.`
      );
    }

    results.push(items);
  }

  return results.flat();
}
