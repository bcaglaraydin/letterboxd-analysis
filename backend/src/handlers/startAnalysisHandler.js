import { sendMessage } from '../services/sqsQueueService.js';
import { putUserJob, getUserJob } from '../services/userJobService.js';

export const handler = async (event) => {
  console.log('StartAnalysis event:', JSON.stringify(event));

  try {
    let body = {};
    if (event.body) {
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    }

    const username = body.username;
    if (!username) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Username is required' }),
      };
    }

    console.log(`Starting analysis for user: ${username}`);

    // 1. Check if fresh job exists
    const cachedJob = await getUserJob(username);
    let jobId;

    // Reuse if recent (< 1 hour) AND not failed
    if (
      cachedJob &&
      cachedJob.status !== 'failed' &&
      Math.floor(Date.now() / 1000) - cachedJob.createdAt < 3600
    ) {
      console.log(
        `[StartAnalysis] Reuse existing valid job for ${username} (Status: ${cachedJob.status}, Films: ${cachedJob.films?.length})`
      );
      jobId = cachedJob.jobId;
    } else {
      // Create new job state (PENDING)
      jobId = await putUserJob(username, [], { status: 'pending' }); // Empty films list initially

      // 2. Dispatch to List Scrape Queue
      if (process.env.SQS_LIST_QUEUE_URL) {
        console.log(`[StartAnalysis] Dispatching list scrape task for ${username}`);
        await sendMessage(process.env.SQS_LIST_QUEUE_URL, {
          action: 'scrape_user_list',
          username,
          jobId,
        });
      } else {
        console.error('[StartAnalysis] SQS_LIST_QUEUE_URL not set!');
        return { statusCode: 500, body: JSON.stringify({ error: 'Configuration error' }) };
      }
    }

    // 3. Return Accepted (202)
    return {
      statusCode: 202,
      body: JSON.stringify({
        status: 'accepted',
        message: 'Analysis queued',
        jobId,
        username,
      }),
    };
  } catch (error) {
    console.error('[StartAnalysis] Handler error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'An unexpected error occurred' }),
    };
  }
};
