const axios = require('axios');

const API_URL = 'https://mpnd4bu9jg.execute-api.eu-west-1.amazonaws.com';

async function verifyStep3() {
  console.log('Verifying Step 3: Metrics Lambda...');

  // Sample payload simulating frontend state
  const payload = {
    users: [
      {
        username: 'testuser',
        films: [
          { slug: 'dune-2021', userRating: 4.5 },
          { slug: 'the-godfather', userRating: 5.0 }, // Assuming this exists or will be fetched
          { slug: 'parasite-2019', userRating: 4.0 },
        ],
      },
    ],
  };

  try {
    console.log('Calling POST /metrics...');
    const response = await axios.post(`${API_URL}/metrics`, payload);

    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));

    const metrics = response.data.metrics;
    if (metrics && metrics.length > 0) {
      const userMetrics = metrics[0];
      console.log('User Metrics:', userMetrics);

      if (userMetrics.averageRating > 0) {
        console.log('SUCCESS: Average rating computed.');
      } else {
        console.warn('WARNING: Average rating is 0. Metadata might be missing for these films.');
      }

      if (userMetrics.topGenres && userMetrics.topGenres.length > 0) {
        console.log('SUCCESS: Top genres computed.');
      } else {
        console.warn('WARNING: No top genres. Metadata might be missing.');
      }
    } else {
      console.error('FAILURE: No metrics returned.');
    }
  } catch (error) {
    console.error('Verification failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

verifyStep3();
