const express = require('express');
const cors = require('cors');
const { handler } = require('./src/index');

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

app.post('/', async (req, res) => {
  console.log('Received request:', req.body);

  // Mock Lambda event
  const event = {
    body: JSON.stringify(req.body),
  };

  try {
    const result = await handler(event);

    // Set headers
    if (result.headers) {
      res.set(result.headers);
    }

    // Send response
    res.status(result.statusCode).send(result.body);
  } catch (error) {
    console.error('Server Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(PORT, () => {
  console.log(`Local backend server running at http://localhost:${PORT}`);
});
