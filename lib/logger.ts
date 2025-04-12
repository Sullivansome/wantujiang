// lib/logger.ts

export interface LogData {
  [key: string]: string | number | boolean | null | undefined;
}

export enum LEVEL {
  DEBUG = "debug",
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
}

export interface LogPayload extends LogData {
  level: LEVEL;
  event: string;
  ts: string;
  source: string;
}

/**
 * Main logging function for both frontend and backend.
 */
function logEvent(
  event: string,
  level: LEVEL,
  data: LogData,
  source: "frontend" | "api",
) {
  try {
    const payload: LogPayload = {
      level,
      event,
      ...data,
      ts: new Date().toISOString(),
      source,
    };
    // Just log to console as a single JSON line
    console.log(JSON.stringify(payload));
  } catch (err) {
    // Never throw from logger
    console.error(
      JSON.stringify({
        level: LEVEL.ERROR,
        event: "logger_error",
        ts: new Date().toISOString(),
        source,
        error: String(err),
      }),
    );
  }
}

/**
 * Convenience wrappers for frontend and API.
 */
export function logFrontendEvent(event: string, level: LEVEL, data: LogData) {
  logEvent(event, level, data, "frontend");
}

export function logApiEvent(event: string, level: LEVEL, data: LogData) {
  logEvent(event, level, data, "api");
}
