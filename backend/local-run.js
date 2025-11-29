import { handler } from './src/index.js';

const username = process.argv[2] || 'bcaglaraydin';

const event = {
  body: JSON.stringify({ username }),
};

console.log(`Invoking handler locally for user: ${username}...`);

(async () => {
  try {
    const start = Date.now();
    const result = await handler(event);
    const duration = (Date.now() - start) / 1000;

    console.log('\n--- Result ---');
    console.log(`Status Code: ${result.statusCode}`);

    const body = JSON.parse(result.body);
    if (body.films) {
      console.log(`Found ${body.films.length} films.`);
      if (body.films.length > 0) {
        console.log('First 3 films:', body.films.slice(0, 3));
      }
    } else {
      console.log('Body:', body);
    }

    console.log(`\nDuration: ${duration}s`);
  } catch (err) {
    console.error('Local execution failed:', err);
  }
})();
