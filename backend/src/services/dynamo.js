const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  PutCommand,
  BatchWriteCommand,
  QueryCommand,
  BatchGetCommand,
  GetCommand,
} = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient();
const docClient = DynamoDBDocumentClient.from(client);

async function putItem(tableName, item) {
  const command = new PutCommand({
    TableName: tableName,
    Item: item,
  });
  return docClient.send(command);
}

async function getItem(tableName, key) {
  const command = new GetCommand({
    TableName: tableName,
    Key: key,
  });
  const response = await docClient.send(command);
  return response.Item;
}

async function batchWrite(tableName, items) {
  if (!items || items.length === 0) return;

  // DynamoDB BatchWrite limit is 25
  const batchSize = 25;
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
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
      await docClient.send(command);
      console.log(`Wrote batch of ${batch.length} items to ${tableName}.`);
    } catch (error) {
      console.error(`Error batch writing to ${tableName}:`, error);
      throw error;
    }
  }
}

async function query(tableName, keyConditionExpression, expressionAttributeValues) {
  const command = new QueryCommand({
    TableName: tableName,
    KeyConditionExpression: keyConditionExpression,
    ExpressionAttributeValues: expressionAttributeValues,
  });
  const response = await docClient.send(command);
  return response.Items;
}

async function batchGet(tableName, keys) {
  if (!keys || keys.length === 0) return [];

  const batchSize = 100; // BatchGet limit is 100
  let allItems = [];

  for (let i = 0; i < keys.length; i += batchSize) {
    const batchKeys = keys.slice(i, i + batchSize);
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
    } catch (error) {
      console.error(`Error batch getting from ${tableName}:`, error);
      throw error;
    }
  }
  return allItems;
}

module.exports = { putItem, getItem, batchWrite, query, batchGet };
