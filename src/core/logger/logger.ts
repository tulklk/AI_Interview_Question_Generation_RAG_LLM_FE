/**
 * Centralized logger. Keeps console usage out of feature/UI code and lets us
 * silence non-error logs in production builds.
 */

const isDev = process.env.NODE_ENV !== "production";

export const logger = {
  debug(...args: unknown[]): void {
    if (isDev) console.debug(...args);
  },
  info(...args: unknown[]): void {
    if (isDev) console.info(...args);
  },
  warn(...args: unknown[]): void {
    console.warn(...args);
  },
  error(...args: unknown[]): void {
    console.error(...args);
  },
};
