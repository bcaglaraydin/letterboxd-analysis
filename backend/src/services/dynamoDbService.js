import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  BatchWriteCommand,
  QueryCommand,
  BatchGetCommand,
  GetCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient();
const docClient = DynamoDBDocumentClient.from(client);

export async function putItem(tableName, item) {
  const command = new PutCommand({
    TableName: tableName,
    Item: item,
  });
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

export async function query(tableName, keyConditionExpression, expressionAttributeValues) {
  const command = new QueryCommand({
    TableName: tableName,
    KeyConditionExpression: keyConditionExpression,
    ExpressionAttributeValues: expressionAttributeValues,
  });
  const response = await docClient.send(command);
  return response.Items;
}

export async function batchGet(tableName, keys) {
  if (!keys || keys.length === 0) return [];

  const batchSize = 100; // BatchGet limit is 100
  let allItems = [];

  for (let i = 0; i < keys.length; i += batchSize) {
    let batchKeys = keys.slice(i, i + batchSize);
    let attempt = 0;

    while (batchKeys.length > 0 && attempt < 3) {
      const command = new BatchGetCommand({
        RequestItems: {
          [tableName]: {
            Keys: batchKeys,
          },
        },
      });

      try {
        const response = await docClient.send(command);
        if (response.Responses && response.Responses[tableName]) {
          allItems = allItems.concat(response.Responses[tableName]);
        }

        if (response.UnprocessedKeys && response.UnprocessedKeys[tableName]) {
          const unprocessed = response.UnprocessedKeys[tableName];
          console.warn(`BatchGet: ${unprocessed.Keys.length} keys unprocessed. Retrying...`);
          batchKeys = unprocessed.Keys;
          attempt++;
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        } else {
          batchKeys = [];
        }
      } catch (error) {
        console.error(`Error batch getting from ${tableName}:`, error);
        throw error;
      }
    }

    if (batchKeys.length > 0) {
      console.error(`Failed to get batch from ${tableName} after 3 attempts.`);
    }
  }
  return allItems;
}
