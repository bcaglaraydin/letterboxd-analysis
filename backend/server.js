import 'dotenv/config'; // Load env vars
import express from 'express';
import cors from 'cors';
import { handler as startHandler } from './src/handlers/startAnalysisHandler.js';
import { handler as statusHandler } from './src/handlers/getAnalysisStatusHandler.js';
import { handler as listScraperHandler } from './src/handlers/listScraperHandler.js';
import { handler as workerHandler } from './src/handlers/filmScraperWorker.js';

const app = express();
const PORT = 4000;

// DEV_MODE: Bypass SQS and call handlers directly
// Set DEV_MODE=true in .env for full local debugging
const DEV_MODE = process.env.DEV_MODE === 'true';

app.use(cors());
app.use(express.json());

// Helper to wrap Lambda handler
const wrapLambda = (handler) => async (req, res) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`, req.body || req.query);
  const event = {
    body: typeof req.body === 'string' ? req.body : JSON.stringify(req.body),
    queryStringParameters: req.query,
  };
  try {
    const result = await handler(event);
    if (result.headers) res.set(result.headers);
    res.status(result.statusCode).send(result.body);
  } catch (error) {
    console.error('Server Error:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
};

// ==============================================================================
// PRODUCTION-LIKE ENDPOINTS (use real SQS)
// ==============================================================================
app.post('/analysis', wrapLambda(startHandler));
app.get('/analysis/status', wrapLambda(statusHandler));

// ==============================================================================
// DEV_MODE ENDPOINTS (bypass SQS, call handlers directly)
// ==============================================================================
if (DEV_MODE) {
  console.log('\n🔧 DEV_MODE ENABLED - Direct handler invocation available\n');

  // Direct list-scraper invocation (simulates SQS trigger)
  app.post('/dev/list-scraper', async (req, res) => {
    console.log('[DEV] Direct list-scraper call:', req.body);
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'username required' });
    }

    // Simulate SQS event format
    const sqsEvent = {
      Records: [
        {
          body: JSON.stringify({ action: 'scrape_user_list', username }),
        },
      ],
    };

    try {
      const result = await listScraperHandler(sqsEvent);
      res.json({ success: true, result });
    } catch (error) {
      console.error('[DEV] list-scraper error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Direct worker invocation (simulates SQS trigger)
  app.post('/dev/worker', async (req, res) => {
    console.log('[DEV] Direct worker call:', req.body);
    const { filmSlugs } = req.body;

    if (!filmSlugs || !Array.isArray(filmSlugs)) {
      return res.status(400).json({ error: 'filmSlugs array required' });
    }

    // Simulate SQS batch event format
    const sqsEvent = {
      Records: filmSlugs.map((slug) => ({
        body: JSON.stringify({ slug }),
      })),
    };

    try {
      const result = await workerHandler(sqsEvent);
      res.json({ success: true, result });
    } catch (error) {
      console.error('[DEV] worker error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Full local flow (start → list-scraper in one call)
  app.post('/dev/full-flow', async (req, res) => {
    console.log('[DEV] Full flow:', req.body);
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'username required' });
    }

    try {
      // Step 1: Start analysis (creates job, normally sends to SQS)
      console.log('[DEV] Step 1: Starting analysis...');
      const startEvent = { body: JSON.stringify({ username }) };
      const startResult = await startHandler(startEvent);
      const startBody = JSON.parse(startResult.body);

      if (startResult.statusCode !== 202) {
        return res.status(startResult.statusCode).json(startBody);
      }

      console.log(`[DEV] Job started for: ${username}`);

      // Step 2: Directly call list-scraper (bypass SQS)
      console.log('[DEV] Step 2: Calling list-scraper directly...');
      const listEvent = {
        Records: [{ body: JSON.stringify({ action: 'scrape_user_list', username }) }],
      };
      await listScraperHandler(listEvent);

      console.log('[DEV] Full flow complete!');
      res.json({
        success: true,
        message: 'Full flow executed. Check /analysis/status for results.',
        username,
      });
    } catch (error) {
      console.error('[DEV] Full flow error:', error);
      res.status(500).json({ error: error.message, stack: error.stack });
    }
  });
}

// ==============================================================================
// SERVER START
// ==============================================================================
app.listen(PORT, () => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Local backend server running at http://localhost:${PORT}`);
  console.log(`${'='.repeat(60)}\n`);

  console.log('PRODUCTION-LIKE ENDPOINTS:');
  console.log('  POST /analysis             - Start analysis (uses real SQS)');
  console.log('  GET  /analysis/status      - Get analysis status\n');

  if (DEV_MODE) {
    console.log('DEV_MODE ENDPOINTS (bypass SQS):');
    console.log('  POST /dev/list-scraper     - Direct list-scraper call');
    console.log('  POST /dev/worker           - Direct worker call');
    console.log('  POST /dev/full-flow        - Full flow in one call ⭐\n');
    console.log('Usage:');
    console.log(
      '  curl -X POST http://localhost:4000/dev/full-flow -d \'{"username":"bcaglaraydin"}\' -H "Content-Type: application/json"\n'
    );
  } else {
    console.log('💡 Set DEV_MODE=true in .env for direct handler debugging\n');
  }
});
