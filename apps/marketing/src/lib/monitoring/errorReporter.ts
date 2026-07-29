interface ErrorContext {
  message: string;
  stack?: string;
  url?: string;
  userAgent?: string;
  timestamp: string;
}

export function reportError(error: Error | unknown, extra?: Record<string, any>) {
  const ctx: ErrorContext = {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    url: typeof window !== 'undefined' ? window.location.href : undefined,
    userAgent: typeof window !== 'undefined' ? navigator.userAgent : undefined,
    timestamp: new Date().toISOString(),
  };

  if (process.env.NODE_ENV !== 'production') {
    console.error('[error]', ctx, extra);
  }

  // TODO: wire Sentry or your logger
  // if (window.Sentry) window.Sentry.captureException(error, { extra });

  // Fire-and-forget to internal log endpoint
  if (typeof window !== 'undefined' && navigator.sendBeacon) {
    try {
      const blob = new Blob([JSON.stringify({ ...ctx, ...extra })], { type: 'application/json' });
      navigator.sendBeacon('/api/log-error', blob);
    } catch {}
  }
}
