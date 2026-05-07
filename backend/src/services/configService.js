import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import { Logger } from '../utils/logger.js';

const client = new SSMClient();
const PARAM_NAME = `/app/analysis_enabled-${process.env.ENVIRONMENT || 'dev'}`;

let lastCheck = 0;
let cachedValue = true;
const CACHE_TTL = 60000; // 1 minute cache to avoid excessive SSM calls

/**
 * Checks if the analysis system is globally enabled via SSM.
 * Returns true if enabled, false otherwise.
 * Fail-closed: returns false if SSM is unreachable to protect costs.
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
    Logger.error(`[Config] Failed to fetch SSM parameter ${PARAM_NAME}`, err);
    // Fail-closed: disable system if SSM is unreachable to protect costs
    return false;
  }
}
