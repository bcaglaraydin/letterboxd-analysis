import 'dotenv/config'; // Load env vars
import express from 'express';
import cors from 'cors';
import { handler as scrapeHandler } from './src/handlers/triggerFilmScrapingHandler.js';
import { handler as metricsHandler } from './src/handlers/retrieveMetricsHandler.js';

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

// Helper to wrap Lambda handler
const wrapLambda = (handler) => async (req, res) => {
  console.log(`Received request ${req.method} ${req.path}:`, req.body);
  const event = {
    body: JSON.stringify(req.body),
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

app.post('/', wrapLambda(scrapeHandler));
app.post('/metrics', wrapLambda(metricsHandler));

app.listen(PORT, () => {
  console.log(`Local backend server running at http://localhost:${PORT}`);
});
