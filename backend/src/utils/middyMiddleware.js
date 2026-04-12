import { verifyAnalysisToken } from './auth.js';
import { checkQuotas } from '../services/quotaService.js';
import { isAnalysisEnabled } from '../services/configService.js';
import { Logger } from './logger.js';

/**
 * Custom Middy Middleware for JWT Authentication
 */
export const authMiddleware = () => ({
  before: async (request) => {
    const { event } = request;
    const ip =
      event.requestContext?.http?.sourceIp ||
      event.requestContext?.identity?.sourceIp ||
      '127.0.0.1';

    // Extract token
    const authHeader = event.headers?.authorization || event.headers?.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      Logger.warn('[Auth Middleware] Missing or invalid Authorization header');
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized: Missing token' }),
      };
    }

    const token = authHeader.split(' ')[1];
    try {
      request.context.user = verifyAnalysisToken(token, ip);
      Logger.info(`[Auth Middleware] JWT verified for IP: ${ip}`);
    } catch (err) {
      Logger.warn(`[Auth Middleware] JWT verification failed: ${err.message}`);
      return {
        statusCode: 401,
        body: JSON.stringify({ error: err.message }),
      };
    }
  },
});

/**
 * Custom Middy Middleware for Quota Enforcement
 */
export const quotaMiddleware = () => ({
  before: async (request) => {
    const { event } = request;
    const ip =
      event.requestContext?.http?.sourceIp ||
      event.requestContext?.identity?.sourceIp ||
      '127.0.0.1';

    try {
      await checkQuotas(ip);
    } catch (err) {
      if (err.statusCode === 429) {
        return {
          statusCode: 429,
          body: JSON.stringify({ error: err.message }),
        };
      }
      throw err;
    }
  },
});

/**
 * Custom Middy Middleware for Global Kill-Switch
 */
export const killSwitchMiddleware = () => ({
  before: async (_request) => {
    const enabled = await isAnalysisEnabled();
    if (!enabled) {
      Logger.warn('[Kill-Switch] System is disabled via SSM.');
      return {
        statusCode: 503,
        body: JSON.stringify({ error: 'Service is currently disabled for maintenance.' }),
      };
    }
  },
});
