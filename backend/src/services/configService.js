import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';

const client = new SSMClient();
const PARAM_NAME = '/app/analysis_enabled';

let lastCheck = 0;
let cachedValue = true;
const CACHE_TTL = 60000; // 1 minute cache to avoid excessive SSM calls

/**
 * Checks if the analysis system is globally enabled via SSM.
 * Returns true if enabled, false otherwise.
 */
export async function isAnalysisEnabled() {
  const now = Date.now();
  if (now - lastCheck < CACHE_TTL) {
    return cachedValue;
  }

  try {
    const command = new GetParameterCommand({ Name: PARAM_NAME });
    const response = await client.send(command);
    cachedValue = response.Parameter.Value === 'true';
    lastCheck = now;
    return cachedValue;
  } catch (err) {
    console.error(`[Config] Failed to fetch SSM parameter ${PARAM_NAME}:`, err);
    // Fail-safe: assume enabled if SSM is down, but log heavily
    return true;
  }
}
