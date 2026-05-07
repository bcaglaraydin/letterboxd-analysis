import 'dotenv/config';

const API_URL = process.env.API_GATEWAY_URL?.trim();
const NUM_USERS = parseInt(process.env.LOAD_TEST_USERS || '20', 10);
const POLL_INTERVAL = 3000;
const TIMEOUT = 180000; // 3 minutes

const testUsernames = [
  'bcaglaraydin',
  'jack',
  'letterboxd',
  'mia',
  'david',
  'sarah',
  'michael',
  'emma',
  'chris',
  'jessica',
  'matt',
  'amanda',
  'josh',
  'ashley',
  'andrew',
  'brittany',
  'daniel',
  'megan',
  'james',
  'rachel',
];

async function postAnalysis(username) {
  const response = await fetch(`${API_URL}/analysis`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  });
  return await response.json();
}

async function getStatus(username) {
  const response = await fetch(`${API_URL}/analysis/status?username=${username}`);
  return await response.json();
}

async function simulateUser(username) {
  const startTime = Date.now();
  let pollCount = 0;

  console.log(`[User: ${username}] Starting analysis...`);
  await postAnalysis(username);

  while (Date.now() - startTime < TIMEOUT) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL));
    pollCount++;

    try {
      const data = await getStatus(username);
      if (data.status === 'ready' || data.status === 'error' || data.status === 'not_found') {
        const duration = (Date.now() - startTime) / 1000;
        return {
          username,
          status: data.status,
          durationSeconds: duration,
          polls: pollCount,
          films: data.userStats?.totalMovies || 0,
        };
      }
    } catch (e) {
      console.warn(`[User: ${username}] Polling error: ${e.message}`);
    }
  }

  return {
    username,
    status: 'timeout',
    durationSeconds: TIMEOUT / 1000,
    polls: pollCount,
    films: 0,
  };
}

async function runLoadTest() {
  if (!API_URL) {
    console.error('API_GATEWAY_URL is not set.');
    process.exit(1);
  }

  const usersToTest = testUsernames.slice(0, NUM_USERS);
  console.log(
    `Starting load test with ${usersToTest.length} concurrent users targeting ${API_URL}...`
  );

  const startTime = Date.now();
  const results = await Promise.all(usersToTest.map((u) => simulateUser(u)));
  const endTime = Date.now();
  const totalTime = (endTime - startTime) / 1000;

  console.log(`\n--- LOAD TEST RESULTS (${NUM_USERS} concurrent users) ---`);
  console.log(`Total Wall Clock Time: ${totalTime}s\n`);

  let successes = 0;
  let failures = 0;
  let timeouts = 0;

  const formattedResults = results.map((r) => {
    if (r.status === 'ready') successes++;
    else if (r.status === 'timeout') timeouts++;
    else failures++;

    return {
      Username: r.username,
      Status: r.status,
      TimeSecs: r.durationSeconds.toFixed(1),
      Polls: r.polls,
      Films: r.films,
    };
  });

  console.table(formattedResults);

  console.log(`\nSummary:`);
  console.log(`Successes (Ready): ${successes}`);
  console.log(`Failures (Errors/Dropped): ${failures}`);
  console.log(`Timeouts (>3 mins): ${timeouts}`);

  console.log(
    `\nLoad test complete. Now run 'node scripts/get_metrics.js' to see CloudWatch stats.`
  );
}

runLoadTest().catch(console.error);
