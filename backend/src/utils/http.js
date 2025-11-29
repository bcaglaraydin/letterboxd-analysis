const axios = require('axios');

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
};

/**
 * Fetches a URL with exponential backoff retry logic.
 * @param {string} url - The URL to fetch.
 * @param {object} options - Axios options (headers, etc.).
 * @param {number} retries - Number of retries (default 3).
 * @returns {Promise<string>} - The response data (HTML).
 */
const https = require('https');

const agent = new https.Agent({ keepAlive: true });

async function fetchWithRetry(url, options = {}, retries = 3) {
  const mergedOptions = {
    ...options,
    headers: { ...HEADERS, ...options.headers },
    timeout: 5000,
    httpsAgent: agent,
  };

  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.get(url, mergedOptions);
      return response.data;
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise((res) => setTimeout(res, 1000 * (i + 1))); // Exponential backoff
    }
  }
}

module.exports = { fetchWithRetry };
