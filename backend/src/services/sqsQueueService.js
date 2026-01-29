import { SQSClient, SendMessageCommand, SendMessageBatchCommand } from '@aws-sdk/client-sqs';

const sqsClient = new SQSClient({ region: process.env.AWS_REGION || 'us-east-1' });

/**
 * Sends a single message to an SQS queue.
 * @param {string} queueUrl - The URL of the SQS queue.
 * @param {Object} message - The message body object (will be JSON stringified).
 */
export async function sendMessage(queueUrl, message) {
  const command = new SendMessageCommand({
    QueueUrl: queueUrl,
    MessageBody: JSON.stringify(message),
  });

  try {
    const result = await sqsClient.send(command);
    console.log(`Sent message to SQS: ${result.MessageId}`);
    return result;
  } catch (error) {
    console.error('Error sending SQS message:', error);
    throw error;
  }
}

/**
 * Sends a batch of messages to an SQS queue.
 * @param {string} queueUrl - The URL of the SQS queue.
 * @param {Array} messages - Array of message objects (must be JSON serializable).
 */
export async function sendMessageBatch(queueUrl, messages) {
  if (!messages || messages.length === 0) return;

  // SQS Batch limit is 10
  const batchSize = 10;
  for (let i = 0; i < messages.length; i += batchSize) {
    const batch = messages.slice(i, i + batchSize);
    const entries = batch.map((msg, index) => ({
      Id: `${i + index}`,
      MessageBody: JSON.stringify(msg),
    }));

    const command = new SendMessageBatchCommand({
      QueueUrl: queueUrl,
      Entries: entries,
    });

    try {
      await sqsClient.send(command);
      console.log(`Sent batch of ${batch.length} messages to SQS.`);
    } catch (error) {
      console.error('Error sending SQS batch:', error);
      throw error;
    }
  }
}
