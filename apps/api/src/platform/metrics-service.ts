/**
 * In-process request metrics — deliberately NOT persisted, NOT a
 * time-series store. Resets on every restart; the console labels it
 * "since last restart" rather than pretending to be a historical
 * record. A real APM/metrics backend is out of scope here (none
 * exists in this deployment) — this is a genuine, honest signal from
 * live traffic, just a non-durable one.
 *
 * "Slow query alerts" from the task doc is scoped down to slow HTTP
 * *requests* (via Fastify's built-in onResponse timing) rather than
 * per-SQL-query duration — instrumenting the shared postgres.js client
 * used by the entire codebase for per-query timing is a much riskier,
 * more invasive change than its value justifies here.
 */
export type MetricsService = ReturnType<typeof createMetricsService>;

const SLOW_REQUEST_THRESHOLD_MS = 1000;
const RECENT_SLOW_REQUEST_LIMIT = 20;

export function createMetricsService() {
  const startedAt = new Date();
  let totalRequests = 0;
  let clientErrorCount = 0; // 4xx
  let serverErrorCount = 0; // 5xx
  const recentSlowRequests: Array<{ method: string; url: string; statusCode: number; durationMs: number; at: Date }> = [];

  return {
    recordRequest: (input: { method: string; url: string; statusCode: number; durationMs: number }) => {
      totalRequests += 1;
      if (input.statusCode >= 500) serverErrorCount += 1;
      else if (input.statusCode >= 400) clientErrorCount += 1;
      if (input.durationMs >= SLOW_REQUEST_THRESHOLD_MS) {
        recentSlowRequests.unshift({ ...input, at: new Date() });
        if (recentSlowRequests.length > RECENT_SLOW_REQUEST_LIMIT) recentSlowRequests.length = RECENT_SLOW_REQUEST_LIMIT;
      }
    },
    summary: () => ({
      sinceRestart: startedAt.toISOString(),
      totalRequests,
      clientErrorCount,
      serverErrorCount,
      errorRatePercent: totalRequests > 0 ? Number((((clientErrorCount + serverErrorCount) / totalRequests) * 100).toFixed(2)) : 0,
      slowRequestThresholdMs: SLOW_REQUEST_THRESHOLD_MS,
      recentSlowRequests: recentSlowRequests.slice(),
    }),
  };
}
