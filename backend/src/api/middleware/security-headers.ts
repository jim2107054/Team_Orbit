import { Request, Response, NextFunction } from 'express';

/**
 * Security headers middleware following OWASP best practices.
 * Sets headers to prevent common web vulnerabilities:
 * - XSS, clickjacking, MIME sniffing, referrer leaks
 */
export function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // XSS Protection (legacy browsers)
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer Policy — send origin only on cross-origin
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Content Security Policy (API only — restrict to self)
  res.setHeader('Content-Security-Policy', "default-src 'self'");

  // Strict Transport Security (HTTPS enforcement)
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  // Permissions Policy — disable unnecessary browser features
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // Remove Express fingerprint
  res.removeHeader('X-Powered-By');

  next();
}
