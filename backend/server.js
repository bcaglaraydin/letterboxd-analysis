// Mock Env Vars for Local Dev (Replace with actual values if needed)
if (!process.env.SQS_QUEUE_URL) {
  process.env.SQS_QUEUE_URL =
    'https://sqs.eu-west-1.amazonaws.com/617969167018/letterboxd-film-scrape-queue-dev';
}
if (!process.env.FILMS_TABLE) {
  process.env.FILMS_TABLE = 'Films';
}
if (!process.env.AWS_REGION) {
  process.env.AWS_REGION = 'eu-west-1';
}

const express = require('express');
const cors = require('cors');
const { handler: scrapeHandler } = require('./src/handlers/triggerFilmScrapingHandler');
const { handler: metricsHandler } = require('./src/handlers/retrieveMetricsHandler');

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
