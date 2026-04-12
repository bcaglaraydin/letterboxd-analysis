import { Logger } from '../utils/logger.js';
import { signAnalysisToken } from '../utils/auth.js';
import { isAnalysisEnabled } from '../services/configService.js';

/**
 * AWS Lambda Handler for GET /auth/token
 * Returns a short-lived IP-bound JWT for analysis requests.
 */
export async function handler(event, context) {
  Logger.init(event, context);
  const ip =
    event.requestContext?.http?.sourceIp || event.requestContext?.identity?.sourceIp || '127.0.0.1';

  try {
    // 1. Check Global Kill Switch
    const enabled = await isAnalysisEnabled();
    if (!enabled) {
      Logger.warn('[Auth] Handshake rejected: System is disabled via SSM kill-switch.');
      return {
        statusCode: 503,
        body: JSON.stringify({ error: 'Service is currently disabled for maintenance.' }),
      };
    }

    // 2. Issue Token
    const token = signAnalysisToken(ip);
    Logger.info(`[Auth] Issued token for IP: ${ip}`);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    };
  } catch (err) {
    Logger.error('[Auth] Handshake unexpected error', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
}
