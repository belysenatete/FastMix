import type { Instrumentation } from "next";

const REPEAT_MS = 60 * 60 * 1000;
const lastSent = new Map<string, number>();

/**
 * Reports server errors to the operator. Logs every error and, when ALERT_WEBHOOK_URL is set,
 * posts to the same Discord/Slack webhook as the worker, at most once an hour per route.
 * Only the route, error type and digest are sent: never headers (they carry session cookies) or messages.
 */
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  const name = error instanceof Error ? error.name : "Error";
  const digest = typeof error === "object" && error !== null && "digest" in error ? String(error.digest) : "none";
  console.error(JSON.stringify({ event: "request_error", route: context.routePath, kind: context.routeType, method: request.method, error: name, digest }));

  const url = process.env.ALERT_WEBHOOK_URL;
  const now = Date.now();
  if (!url || now - (lastSent.get(context.routePath) ?? 0) < REPEAT_MS) return;
  lastSent.set(context.routePath, now);
  const text = `FastMix alert (web_error): ${name} in ${context.routeType} ${context.routePath} (digest ${digest}). See the web server log.`;
  try {
    await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: text, text }), signal: AbortSignal.timeout(5000) });
  } catch { /* Alerting must never break the request. */ }
};
