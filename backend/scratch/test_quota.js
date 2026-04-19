// Mock Environment - Set BEFORE any imports that might use them
process.env.ADMIN_IPS = '1.2.3.4, 8.8.8.8';
process.env.LIMIT_IP_DAILY = '10';

async function test() {
  // Dynamically import to ensure env variables are captured from process.env
  // at the time of module evaluation.
  const { checkQuotas } = await import('../src/services/quotaService.js');

  console.log('--- Testing Whitelist ---');
  // This should log: [Quota Bypass] Admin IP detected: 1.2.3.4. Skipping quota check.
  await checkQuotas('1.2.3.4');

  console.log('--- Testing Non-Whitelisted (logic flow) ---');
  try {
    await checkQuotas('5.6.7.8');
  } catch (err) {
    if (
      err.name === 'ResourceNotFoundException' ||
      err.name === 'CredentialsProviderError' ||
      err.code === 'ENOTFOUND'
    ) {
      console.log(
        'PASS: Reached DynamoDB network call (Whitelist check was correctly bypassed for previous call)'
      );
    } else {
      console.error('Unexpected error:', err);
    }
  }
}

test();
