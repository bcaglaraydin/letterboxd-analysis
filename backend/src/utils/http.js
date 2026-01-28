import axios from 'axios';
import https from 'https';

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  'Accept-Language': 'en-US,en;q=0.9',
  Referer: 'https://letterboxd.com/',
  'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'same-origin',
  'Upgrade-Insecure-Requests': '1',
  Connection: 'keep-alive',
};

/**
 * Fetches a URL with exponential backoff retry logic.
 * @param {string} url - The URL to fetch.
 * @param {object} options - Axios options (headers, etc.).
 * @param {number} retries - Number of retries (default 3).
 * @returns {Promise<string>} - The response data (HTML).
 */

const agent = new https.Agent({
  keepAlive: true,
  // TLS fingerprinting mitigation: Use Chrome-like cipher suite ordering.
  // May need periodic updates as browser cipher preferences evolve.
  ciphers: [
    'TLS_AES_128_GCM_SHA256',
    'TLS_AES_256_GCM_SHA384',
    'TLS_CHACHA20_POLY1305_SHA256',
    'ECDHE-ECDSA-AES128-GCM-SHA256',
    'ECDHE-RSA-AES128-GCM-SHA256',
    'ECDHE-ECDSA-AES256-GCM-SHA384',
    'ECDHE-RSA-AES256-GCM-SHA384',
    'ECDHE-ECDSA-CHACHA20-POLY1305',
    'ECDHE-RSA-CHACHA20-POLY1305',
    'ECDHE-RSA-AES128-SHA',
    'ECDHE-RSA-AES256-SHA',
  ].join(':'),
  honorCipherOrder: true,
  minVersion: 'TLSv1.2',
});

export async function fetchWithRetry(url, options = {}, retries = 1) {
  const timeout = parseInt(process.env.HTTP_TIMEOUT || '10000', 10);
  const mergedOptions = {
    ...options,
    headers: { ...HEADERS, ...options.headers },
    timeout,
    httpsAgent: agent,
  };

  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.get(url, mergedOptions);
      return response.data;
    } catch (err) {
      const status = err.response?.status;
      // Don't retry on definitive client errors (403, 404)
      if (status === 403 || status === 404) throw err;
      if (i === retries - 1) throw err;
      await new Promise((res) => setTimeout(res, 1000 * (i + 1))); // Exponential backoff
    }
  }
}
