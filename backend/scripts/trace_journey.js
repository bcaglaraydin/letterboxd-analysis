import {
  CloudWatchLogsClient,
  StartQueryCommand,
  GetQueryResultsCommand,
} from '@aws-sdk/client-cloudwatch-logs';
import { SQSClient, GetQueueAttributesCommand } from '@aws-sdk/client-sqs';
import { Table } from 'console-table-printer';

const cwClient = new CloudWatchLogsClient({ region: 'eu-west-1' });
const sqsClient = new SQSClient({ region: 'eu-west-1' });

// CONFIG
const QUEUE_URL = 'https://sqs.eu-west-1.amazonaws.com/REDACTED_AWS_ACCOUNT_ID/film-scrape-queue';
const LOG_GROUPS = [
  '/aws/lambda/letterboxd-analysis-metrics-dev', // For "Extracted" count
  '/aws/lambda/letterboxd-analysis-worker-dev', // For "Processing" count
];

async function getSQSStats() {
  try {
    const data = await sqsClient.send(
      new GetQueueAttributesCommand({
        QueueUrl: QUEUE_URL,
        AttributeNames: ['ApproximateNumberOfMessages', 'ApproximateNumberOfMessagesNotVisible'],
      })
    );
    return {
      waiting: parseInt(data.Attributes?.ApproximateNumberOfMessages || '0'),
      inflight: parseInt(data.Attributes?.ApproximateNumberOfMessagesNotVisible || '0'),
    };
  } catch (e) {
    return { waiting: 0, inflight: 0, error: e.message };
  }
}

async function getLogStats(startTime) {
  const query = `
    fields @message
    | filter @message like /Extracted/ or @message like /Processing film/ or @message like /ERROR/ or @message like /403 Forbidden/
  `;

  try {
    const command = new StartQueryCommand({
      logGroupNames: LOG_GROUPS,
      startTime,
      endTime: Math.floor(Date.now() / 1000),
      queryString: query,
      limit: 2000,
    });

    const { queryId } = await cwClient.send(command);

    // Poll for results (usually takes 1-2s)
    let status = 'Scheduled';
    let results = [];
    while (status === 'Scheduled' || status === 'Running') {
      await new Promise((r) => setTimeout(r, 500));
      const res = await cwClient.send(new GetQueryResultsCommand({ queryId }));
      status = res.status;
      results = res.results || [];
    }

    let totalExtracted = 0;
    let processedRaw = 0;
    let errors = 0;
    let forbidden = 0;

    results.forEach((row) => {
      const msg = row.find((f) => f.field === '@message')?.value || '';
      if (msg.includes('Extracted') && msg.includes('films')) {
        const match = msg.match(/Extracted (\d+)/);
        if (match) totalExtracted = Math.max(totalExtracted, parseInt(match[1])); // Take max in case of multiple runs
      }
      if (msg.includes('Processing film:')) processedRaw++;
      if (msg.includes('ERROR') || msg.includes('Error')) errors++;
      if (msg.includes('403 Forbidden')) forbidden++;
    });

    return { totalExtracted, processedRaw, errors, forbidden };
  } catch (e) {
    return { totalExtracted: 0, processedRaw: 0, errors: 0, forbidden: 0, error: e.message };
  }
}

async function run() {
  console.clear();
  console.log('� Starting Live Monitor (SQS + CloudWatch)...');
  console.log('Press Ctrl+C to stop.\n');

  const startTime = Math.floor(Date.now() / 1000) - 900; // Look back 15 mins for context

  while (true) {
    const [sqs, logs] = await Promise.all([getSQSStats(), getLogStats(startTime)]);

    console.clear();
    console.log(`📡 Monitor Active - ${new Date().toLocaleTimeString()}`);
    console.log('--------------------------------------------------');

    const p = new Table();

    // 1. Total Job Size (From logs)
    p.addRow(
      {
        Metric: 'TOTAL TO PROCESS',
        Value: logs.totalExtracted || 'Waiting for scraper...',
        Source: 'Metrics Lambda Log',
      },
      { color: 'cyan' }
    );

    // 2. SQS State (Real-time)
    p.addRow(
      {
        Metric: 'PENDING in Queue',
        Value: sqs.waiting,
        Source: 'SQS (Visible)',
      },
      { color: 'yellow' }
    );

    p.addRow(
      {
        Metric: 'ACTIVE Lambdas',
        Value: sqs.inflight,
        Source: 'SQS (In Flight)',
      },
      { color: 'green' }
    );

    // 3. Processed (From logs - roughly)
    // Note: Log ingestion has 5-10s delay, so this lags behind SQS
    p.addRow(
      {
        Metric: 'FINISHED (Approx)',
        Value: logs.processedRaw,
        Source: 'Worker Logs',
      },
      { color: 'blue' }
    );

    // 4. Issues
    if (logs.errors > 0) {
      p.addRow({ Metric: 'ERRORS', Value: logs.errors, Source: 'Logs' }, { color: 'red' });
    }
    if (logs.forbidden > 0) {
      p.addRow(
        { Metric: 'RATE LIMITED (403)', Value: logs.forbidden, Source: 'Logs' },
        { color: 'red' }
      );
    }

    p.printTable();

    console.log('\nUse another terminal to trigger the job via POST /metrics or curl.');
    console.log('Updates every 3 seconds...');

    await new Promise((r) => setTimeout(r, 3000));
  }
}

run().catch(console.error);
