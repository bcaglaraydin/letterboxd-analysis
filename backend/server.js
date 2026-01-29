import 'dotenv/config'; // Load env vars
import express from 'express';
import cors from 'cors';
import { handler as startHandler } from './src/handlers/startAnalysisHandler.js';
import { handler as statusHandler } from './src/handlers/getAnalysisStatusHandler.js';

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

// Helper to wrap Lambda handler
const wrapLambda = (handler) => async (req, res) => {
  console.log(`Received request ${req.method} ${req.path}:`, req.body);
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
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

app.post('/analysis', wrapLambda(startHandler));
app.get('/analysis/status', wrapLambda(statusHandler));

app.listen(PORT, () => {
  console.log(`Local backend server running at http://localhost:${PORT}`);
  console.log('Available endpoints:');
  console.log('  POST /analysis - Start analysis for a username');
  console.log('  GET  /analysis/status?username=<name> - Get analysis status');
});
