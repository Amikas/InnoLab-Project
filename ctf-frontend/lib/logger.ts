/**
 * ctf-frontend/lib/logger.ts
 *
 * Tiny structured-log helper for server actions and lib helpers.
 *
 * Behavior:
 *  - INFO / WARN / ERROR each format as `[CTF-FRONTEND LEVEL] <msg>`
 *    with optional JSON-shaped context appended.
 *  - In production, known sensitive context keys (`password`, `token`,
 *    `secret`, `jwt`, `auth`, `apiKey`, etc.) are replaced with
 *    `[REDACTED]` defensively — even if a future contributor passes
 *    a credential through the logger by accident.
 *  - Output remains `console.log` / `console.warn` / `console.error`
 *    so Next.js + Vercel / systemd capture it correctly without
 *    adding a runtime dependency.
 *
 * Use `logger.warn` / `logger.error` from server actions and lib code;
 * never raw `console.log` in production code paths.
 */

const isProd = process.env.NODE_ENV === "production";

const REDACT_KEYS = new Set([
  "password",
  "pass",
  "pwd",
  "token",
  "secret",
  "jwt",
  "auth",
  "authorization",
  "apikey",
  "api_key",
  "cookie",
  "set-cookie",
]);

function redactValue(key: string, value: unknown): unknown {
  if (REDACT_KEYS.has(key.toLowerCase())) return "[REDACTED]";
  if (Array.isArray(value)) return value.map((item) => redactValue("", item));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([nestedKey, nestedValue]) => [
        nestedKey,
        redactValue(nestedKey, nestedValue),
      ]),
    );
  }
  return value;
}

function redact(ctx: Record<string, unknown> | undefined) {
  if (!ctx) return "";
  if (!isProd) return ` ${JSON.stringify(ctx)}`;
  const safe = Object.fromEntries(
    Object.entries(ctx).map(([key, value]) => [key, redactValue(key, value)]),
  );
  return ` ${JSON.stringify(safe)}`;
}

// eslint-disable-next-line no-console
export const logger = {
  info: (msg: string, ctx?: Record<string, unknown>) =>
    console.log(`[CTF-FRONTEND INFO] ${msg}${redact(ctx)}`),
  warn: (msg: string, ctx?: Record<string, unknown>) =>
    console.warn(`[CTF-FRONTEND WARN] ${msg}${redact(ctx)}`),
  error: (msg: string, ctx?: Record<string, unknown>) =>
    console.error(`[CTF-FRONTEND ERROR] ${msg}${redact(ctx)}`),
};
