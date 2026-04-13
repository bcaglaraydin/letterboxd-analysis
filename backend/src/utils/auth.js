import jwt from 'jsonwebtoken';
import { Logger } from './logger.js';

const SIGNING_SECRET = process.env.SIGNING_SECRET;
if (!SIGNING_SECRET) {
  throw new Error('FATAL: SIGNING_SECRET environment variable is not set.');
}
const ISSUER = 'letterboxd-analysis-backend';
const ALGORITHM = 'HS256';

/**
 * Signs a short-lived analysis token bound to an IP address.
 * @param {string} ip - The requester's source IP
 * @returns {string} - Signed JWT
 */
export function signAnalysisToken(ip) {
  return jwt.sign({ ip }, SIGNING_SECRET, {
    expiresIn: '5m',
    issuer: ISSUER,
    algorithm: ALGORITHM,
  });
}

/**
 * Verifies an analysis token and ensures it matches the requester's IP.
 * @param {string} token - Bearer token
 * @param {string} currentIp - Current requester's source IP
 * @throws Error if invalid or IP mismatch
 */
export function verifyAnalysisToken(token, currentIp) {
  try {
    const decoded = jwt.verify(token, SIGNING_SECRET, {
      issuer: ISSUER,
      algorithms: [ALGORITHM],
    });

    if (decoded.ip !== currentIp) {
      Logger.warn(`[Auth] IP Mismatch. Token IP: ${decoded.ip}, Request IP: ${currentIp}`);
      throw new Error('Unauthorized: IP address mismatch');
    }

    return decoded;
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new Error('Unauthorized: Token expired');
    }
    throw new Error(`Unauthorized: ${err.message}`);
  }
}
