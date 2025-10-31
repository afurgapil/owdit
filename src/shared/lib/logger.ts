type LogLevel = "debug" | "info" | "warn" | "error";

interface LogMeta {
  requestId?: string;
  context?: string;
  [key: string]: unknown;
}

function ts(): string {
  return new Date().toISOString();
}

function format(level: LogLevel, message: string, meta?: LogMeta): string {
  const base = `[${ts()}] ${level.toUpperCase()}${
    meta?.context ? `:${meta.context}` : ""
  }`;
  const rid = meta?.requestId ? ` rid=${meta.requestId}` : "";
  const extra = meta
    ? Object.entries(meta)
        .filter(([k]) => k !== "requestId" && k !== "context")
        .map(
          ([k, v]) => `${k}=${typeof v === "string" ? v : JSON.stringify(v)}`
        )
        .join(" ")
    : "";
  const extras = [rid, extra].filter(Boolean).join(" ");
  return `${base} ${message}${extras ? " | " + extras : ""}`;
}

export const logger = {
  debug(message: string, meta?: LogMeta) {
    if (process.env.NODE_ENV !== "production") {
      console.debug(format("debug", message, meta));
    }
  },
  info(message: string, meta?: LogMeta) {
    console.info(format("info", message, meta));
  },
  warn(message: string, meta?: LogMeta) {
    console.warn(format("warn", message, meta));
  },
  error(message: string, meta?: LogMeta & { error?: unknown }) {
    const err = meta?.error;
    // Remove error from metadata to avoid duplication
    const rest = meta ? { ...meta } : {};
    delete rest.error;
    const enriched = {
      ...rest,
      ...(err !== undefined && {
        errorMessage: err instanceof Error ? err.message : String(err),
      }),
    };
    console.error(format("error", message, enriched));
    if (err instanceof Error && err.stack) {
      console.error(err.stack);
    }
  },
  with(context: string, requestId?: string) {
    return {
      debug: (m: string, meta?: LogMeta) =>
        logger.debug(m, { ...meta, context, requestId }),
      info: (m: string, meta?: LogMeta) =>
        logger.info(m, { ...meta, context, requestId }),
      warn: (m: string, meta?: LogMeta) =>
        logger.warn(m, { ...meta, context, requestId }),
      error: (m: string, meta?: LogMeta & { error?: unknown }) =>
        logger.error(m, { ...meta, context, requestId }),
    };
  },
};

export function genRequestId(): string {
  try {
    return `${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
  } catch {
    return `${Date.now()}`;
  }
}
