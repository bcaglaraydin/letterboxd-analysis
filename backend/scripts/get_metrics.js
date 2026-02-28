import 'dotenv/config';
import { CloudWatchClient, GetMetricStatisticsCommand } from '@aws-sdk/client-cloudwatch';
import {
  CloudWatchLogsClient,
  StartQueryCommand,
  GetQueryResultsCommand,
} from '@aws-sdk/client-cloudwatch-logs';

// ARM64 Pricing in eu-west-1
const PRICE_PER_1M_REQUESTS = 0.2;
const PRICE_PER_GB_SECOND = 0.0000133334;

async function fetchMetrics() {
  const cw = new CloudWatchClient({ region: process.env.AWS_REGION || 'eu-west-1' });
  const cwl = new CloudWatchLogsClient({ region: process.env.AWS_REGION || 'eu-west-1' });

  const args = process.argv.slice(2);
  const lookbackMins = parseInt(args[0] || '15', 10);

  const end = new Date();
  const start = new Date(end.getTime() - lookbackMins * 60000);

  console.log(`\n=============================================================`);
  console.log(` CLOUDWATCH METRICS (from ${start.toISOString()} to ${end.toISOString()})`);
  console.log(`=============================================================\n`);

  const lambdas = [
    'letterboxd-analysis-start-dev',
    'letterboxd-analysis-status-dev',
    'letterboxd-analysis-list-scraper-dev',
    'letterboxd-analysis-worker-dev',
  ];

  const queues = ['list-scrape-queue', 'film-scrape-queue'];

  let totalBilledGbSeconds = 0;
  let totalInvocations = 0;

  console.log(`--- LAMBDA DEEP LOGS INSIGHTS ---`);
  for (const fn of lambdas) {
    console.log(`\nLambda: ${fn}`);

    // CloudWatch Logs Query
    const queryString = `
      filter @type = "REPORT"
      | stats 
          count(*) as Invocations,
          count(@initDuration) as ColdStarts,
          avg(@initDuration) as AvgColdStartMs,
          max(@maxMemoryUsed / 1000000) as MaxMemoryUsedMB,
          avg(@maxMemoryUsed / 1000000) as AvgMemoryUsedMB,
          max(@memorySize / 1000000) as ConfiguredMemoryMB,
          sum(@billedDuration) as TotalBilledDurationMs
    `;

    try {
      const startCmd = new StartQueryCommand({
        logGroupName: `/aws/lambda/${fn}`,
        startTime: Math.floor(start.getTime() / 1000),
        endTime: Math.floor(end.getTime() / 1000),
        queryString,
      });

      const startRes = await cwl.send(startCmd);
      const queryId = startRes.queryId;

      let results = null;
      let status = 'Running';
      while (status === 'Running' || status === 'Scheduled') {
        await new Promise((r) => setTimeout(r, 1000));
        const resCmd = new GetQueryResultsCommand({ queryId });
        const resData = await cwl.send(resCmd);
        status = resData.status;
        if (status === 'Complete') {
          results = resData.results;
        }
      }

      if (results && results.length > 0) {
        const row = results[0];
        const getValue = (field) => row.find((r) => r.field === field)?.value || '0';

        const invocs = parseInt(getValue('Invocations'), 10);
        const coldStarts = parseInt(getValue('ColdStarts'), 10);
        const avgCold = parseFloat(getValue('AvgColdStartMs')).toFixed(2);
        const maxMem = parseFloat(getValue('MaxMemoryUsedMB')).toFixed(2);
        const avgMem = parseFloat(getValue('AvgMemoryUsedMB')).toFixed(2);
        const confMem = parseFloat(getValue('ConfiguredMemoryMB')).toFixed(2);
        const totBilledDurationMs = parseFloat(getValue('TotalBilledDurationMs'));

        console.log(`  Invocations:      ${invocs}`);
        console.log(`  Cold Starts:      ${coldStarts} (Avg Init: ${avgCold} ms)`);
        console.log(
          `  Memory Used:      Avg: ${avgMem} MB | Max: ${maxMem}MB | Configured: ${confMem}MB`
        );
        console.log(`  Billed Compute:   ${totBilledDurationMs} ms total`);

        totalInvocations += invocs;
        if (confMem > 0) {
          const gbSeconds = (totBilledDurationMs / 1000) * (confMem / 1024);
          totalBilledGbSeconds += gbSeconds;
        }
      } else {
        console.log(`  No logs found in this timeframe.`);
      }
    } catch (e) {
      console.warn(`  Failed Logs Insights query`, e.message);
    }

    // Standard Metrics Data for Concurrent Executions
    try {
      const cmd = new GetMetricStatisticsCommand({
        Namespace: 'AWS/Lambda',
        MetricName: 'ConcurrentExecutions',
        Dimensions: [{ Name: 'FunctionName', Value: fn }],
        StartTime: start,
        EndTime: end,
        Period: Math.max(60, lookbackMins * 60), // Match the full window
        Statistics: ['Maximum'],
      });
      const res = await cw.send(cmd);
      const maxConc = res.Datapoints?.reduce((acc, dp) => Math.max(acc, dp.Maximum || 0), 0) || 0;
      console.log(`  Peak Concurrency: ${maxConc}`);
    } catch {
      // ignore
    }
  }

  console.log(`\n--- SQS QUEUE METRICS ---`);
  for (const q of queues) {
    console.log(`\nQueue: ${q}`);
    const metrics = [
      'NumberOfMessagesSent',
      'NumberOfMessagesReceived',
      'NumberOfMessagesDeleted',
      'ApproximateNumberOfMessagesVisible',
    ];
    for (const m of metrics) {
      const actualStat = m === 'ApproximateNumberOfMessagesVisible' ? 'Maximum' : 'Sum';
      try {
        const cmd = new GetMetricStatisticsCommand({
          Namespace: 'AWS/SQS',
          MetricName: m,
          Dimensions: [{ Name: 'QueueName', Value: q }],
          StartTime: start,
          EndTime: end,
          Period: Math.max(60, lookbackMins * 60),
          Statistics: [actualStat],
        });
        const res = await cw.send(cmd);
        const val =
          actualStat === 'Maximum'
            ? res.Datapoints?.reduce((acc, dp) => Math.max(acc, dp[actualStat] || 0), 0)
            : res.Datapoints?.reduce((acc, dp) => acc + (dp[actualStat] || 0), 0);
        console.log(`  ${m}: ${val || 0}`);
      } catch (e) {
        console.warn(`  Failed to get metric ${m}`, e.message);
      }
    }
  }

  console.log(`\n=============================================================`);
  console.log(` ESTIMATED AWS LAMBDA COSTS (eu-west-1 ARM64)`);
  console.log(`=============================================================`);
  const reqCost = (totalInvocations / 1000000) * PRICE_PER_1M_REQUESTS;
  const computeCost = totalBilledGbSeconds * PRICE_PER_GB_SECOND;
  const totalCost = reqCost + computeCost;

  console.log(`Total Invocations:      ${totalInvocations}`);
  console.log(`Total Billed GB-Secs:   ${totalBilledGbSeconds.toFixed(4)} GB-s`);
  console.log(`Request Cost:           $${reqCost.toFixed(8)}`);
  console.log(`Compute Cost:           $${computeCost.toFixed(8)}`);
  console.log(`-------------------------------------------------------------`);
  console.log(`Total Est. Cost:        $${totalCost.toFixed(8)}`);

  if (totalInvocations > 0 && Number(process.env.LOAD_TEST_USERS) > 0) {
    const costPerUser = totalCost / Number(process.env.LOAD_TEST_USERS);
    console.log(
      `Est. Cost per User:     $${costPerUser.toFixed(8)} (based on ${process.env.LOAD_TEST_USERS} users)`
    );
  }
}

fetchMetrics().catch(console.error);
