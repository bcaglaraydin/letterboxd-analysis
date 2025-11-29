const { SQSClient, SendMessageBatchCommand } = require('@aws-sdk/client-sqs');

const sqsClient = new SQSClient();

/**
 * Sends a batch of messages to an SQS queue.
 * @param {string} queueUrl - The URL of the SQS queue.
 * @param {Array} messages - Array of message objects (must be JSON serializable).
 */
async function sendMessageBatch(queueUrl, messages) {
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

module.exports = { sendMessageBatch };
